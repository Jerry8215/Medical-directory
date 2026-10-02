"use server";

/**
 * Agendar una cita.
 *
 * Tres cosas que no se negocian acá:
 *
 *   1. El horario se vuelve a verificar contra la agenda antes de guardar.
 *      Entre que el paciente lo vio y lo eligió, otro pudo haberlo tomado, y
 *      la versión que vale es la de la base, no la de la pantalla.
 *   2. El paciente existe una sola vez, identificado por su teléfono, para
 *      que su historial no quede partido en dos.
 *   3. El aviso al profesional se registra en la misma operación. Si se
 *      guardara la cita y el aviso fallara aparte, el médico se enteraría el
 *      día de la consulta.
 */

import { revalidatePath } from "next/cache";

import { aMinutos, disponible } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";

export type Peticion = {
  consultorioId: string;
  /** "2026-10-05" */
  fecha: string;
  /** "09:30" */
  hora: string;
  nombre: string;
  telefono: string;
  correo?: string;
  motivo?: string;
};

export type Resultado =
  | { ok: true; mensaje: string }
  | { ok: false; motivo: "datos" | "ocupado" | "error"; mensaje: string };

function soloDigitos(telefono: string): string {
  return telefono.replace(/\D/g, "").replace(/^52/, "");
}

/** Hora de pared a instante UTC. Chihuahua vive en UTC−6 todo el año. */
function aUtc(fecha: string, hora: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(Date.UTC(a, m - 1, d, h + 6, min));
}

export async function agendarCita(peticion: Peticion): Promise<Resultado> {
  const telefono = soloDigitos(peticion.telefono);

  if (peticion.nombre.trim().length < 3) {
    return { ok: false, motivo: "datos", mensaje: "Escriba su nombre, por favor." };
  }
  if (telefono.length !== 10) {
    return {
      ok: false,
      motivo: "datos",
      mensaje: "El teléfono debe tener diez dígitos, así podemos confirmarle.",
    };
  }

  const consultorio = await prisma.consultorio.findUnique({
    where: { id: peticion.consultorioId },
    include: { franjas: true, profesional: true, ciudad: true },
  });

  if (!consultorio) {
    return { ok: false, motivo: "error", mensaje: "No encontramos ese consultorio." };
  }

  const inicio = aUtc(peticion.fecha, peticion.hora);
  const fin = new Date(inicio.getTime() + consultorio.duracionCitaMin * 60_000);

  // Lo que ya está tomado ese día, en hora de pared, para comparar con las
  // franjas sin mezclar husos.
  const delDia = await prisma.cita.findMany({
    where: {
      consultorioId: consultorio.id,
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: {
        gte: aUtc(peticion.fecha, "00:00"),
        lt: aUtc(peticion.fecha, "23:59"),
      },
    },
  });

  const ocupados = delDia.map((c) => {
    const local = new Date(c.inicio.getTime() - 6 * 60 * 60_000);
    const hora = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
      local.getUTCMinutes(),
    ).padStart(2, "0")}`;
    return {
      fecha: peticion.fecha,
      hora,
      duracionMin: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000),
    };
  });

  const libre = disponible({
    franjas: consultorio.franjas.map((f) => ({
      dia: f.dia,
      desde: f.desde,
      hasta: f.hasta,
    })),
    duracionMin: consultorio.duracionCitaMin,
    ocupados,
    fecha: peticion.fecha,
    hora: peticion.hora,
  });

  if (!libre) {
    return {
      ok: false,
      motivo: "ocupado",
      mensaje:
        "Ese horario acaba de ocuparse. Elija otro de la lista y queda agendada.",
    };
  }

  // Comprobación redundante a propósito: `disponible` razona con la hora de
  // pared y esta con el instante guardado. Si alguna vez discrepan, es
  // preferible rechazar que empalmar a dos pacientes.
  if (aMinutos(peticion.hora) < 0) {
    return { ok: false, motivo: "datos", mensaje: "Horario no válido." };
  }

  try {
    const cita = await prisma.$transaction(async (tx) => {
      const paciente = await tx.paciente.upsert({
        where: { telefono },
        update: {
          nombre: peticion.nombre.trim(),
          correo: peticion.correo?.trim() || undefined,
        },
        create: {
          telefono,
          nombre: peticion.nombre.trim(),
          correo: peticion.correo?.trim() || undefined,
          consentimiento: new Date(),
        },
      });

      const creada = await tx.cita.create({
        data: {
          profesionalId: consultorio.profesionalId,
          consultorioId: consultorio.id,
          pacienteId: paciente.id,
          inicio,
          fin,
          estado: "AGENDADA",
          origen: "web",
          motivo: peticion.motivo?.trim() || null,
        },
      });

      // «Alguien está buscando consulta con usted»: el correo va siempre y
      // WhatsApp solo para quien lo autorizó, porque Meta exige
      // consentimiento y cada mensaje tiene costo.
      const avisos: { canal: "CORREO" | "WHATSAPP"; destino: string }[] = [];
      if (consultorio.profesional.avisoCorreo && consultorio.profesional.correo) {
        avisos.push({ canal: "CORREO", destino: consultorio.profesional.correo });
      }
      if (consultorio.profesional.avisoWhatsapp && consultorio.profesional.telefono) {
        avisos.push({ canal: "WHATSAPP", destino: consultorio.profesional.telefono });
      }
      // El panel se entera siempre, aunque el profesional no tenga datos de
      // contacto cargados.
      avisos.push({ canal: "PANEL" as never, destino: "panel" });

      await tx.aviso.createMany({
        data: avisos.map((a) => ({
          citaId: creada.id,
          canal: a.canal,
          destino: a.destino,
        })),
      });

      await tx.registroAuditoria.create({
        data: {
          actor: "sitio",
          accion: "cita.agendada",
          entidad: "cita",
          entidadId: creada.id,
          detalle: `${consultorio.profesional.nombre} · ${peticion.fecha} ${peticion.hora}`,
        },
      });

      return creada;
    });

    revalidatePath(`/medico/${consultorio.profesional.slug}`);
    revalidatePath("/panel");

    return {
      ok: true,
      mensaje: `Cita agendada con ${consultorio.profesional.nombre} en ${consultorio.nombre}. Le confirmamos al ${telefono} y le enviamos un recordatorio un día antes.`,
    };
  } catch (error) {
    console.error("[cita] no se pudo guardar", error);
    return {
      ok: false,
      motivo: "error",
      mensaje:
        "No pudimos guardar su cita. Inténtelo otra vez o escriba al consultorio.",
    };
  }
}
