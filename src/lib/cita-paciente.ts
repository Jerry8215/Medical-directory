"use server";

/**
 * La cita, desde el lado del paciente.
 *
 * Se entra con el enlace que recibió, sin cuenta ni contraseña: pedirle a
 * alguien que se registre para cancelar una cita es la forma más segura de
 * que no la cancele y simplemente no se presente.
 *
 * El enlace solo da acceso a esa cita. No permite ver otras, ni las de
 * nadie más, y al cancelar se invalida.
 */

import { revalidatePath } from "next/cache";

import { disponible } from "@/lib/agenda";
import { anotar } from "@/lib/novedades";
import { prisma } from "@/lib/prisma";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

const ZONA = 6 * 60 * 60_000;

function aUtc(fecha: string, hora: string): Date {
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  return new Date(Date.UTC(a, m - 1, d, h + 6, min));
}

/** Cuánto falta para la cita, en horas. */
function horasPara(inicio: Date): number {
  return (inicio.getTime() - Date.now()) / 3_600_000;
}

export async function cancelarPorToken(
  token: string,
  motivo: string,
): Promise<Resultado> {
  const cita = await prisma.cita.findUnique({
    where: { token },
    include: { profesional: true, consultorio: true },
  });

  if (!cita) return { ok: false, mensaje: "Ese enlace ya no es válido." };
  if (cita.estado === "CANCELADA") {
    return { ok: false, mensaje: "Esa cita ya estaba cancelada." };
  }
  if (horasPara(cita.inicio) < 0) {
    return {
      ok: false,
      mensaje: "Esa cita ya pasó. Si necesita otra, puede agendarla desde el perfil del médico.",
    };
  }

  await prisma.cita.update({
    where: { token },
    data: { estado: "CANCELADA", motivo: motivo.trim() || "Cancelada por el paciente" },
  });

  // Que el consultorio se entere, no solo que el horario vuelva a aparecer.
  await prisma.aviso.create({
    data: {
      citaId: cita.id,
      canal: cita.profesional.avisoCorreo && cita.profesional.correo ? "CORREO" : "PANEL",
      destino: cita.profesional.correo ?? "panel",
      detalle: "Cancelación del paciente",
    },
  });

  await anotar({
    tipo: "CITA_CANCELADA",
    titulo: `Un paciente canceló su cita con ${cita.profesional.nombre}`,
    detalle: motivo.trim() || "Sin motivo indicado. El horario vuelve a estar libre.",
    enlace: "/panel/mi-agenda",
    profesionalId: cita.profesionalId,
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: "paciente",
      accion: "cita.cancelada",
      entidad: "cita",
      entidadId: cita.id,
      detalle: motivo.trim(),
    },
  });

  revalidatePath(`/medico/${cita.profesional.slug}`);
  revalidatePath("/panel");

  return {
    ok: true,
    mensaje: "Su cita quedó cancelada. Si lo necesita, puede agendar otra cuando guste.",
  };
}

export async function reprogramarPorToken(
  token: string,
  fecha: string,
  hora: string,
): Promise<Resultado> {
  const cita = await prisma.cita.findUnique({
    where: { token },
    include: {
      profesional: true,
      consultorio: { include: { franjas: true } },
    },
  });

  if (!cita) return { ok: false, mensaje: "Ese enlace ya no es válido." };
  if (cita.estado === "CANCELADA") {
    return { ok: false, mensaje: "Esa cita está cancelada. Agende una nueva desde el perfil." };
  }

  const { consultorio } = cita;

  // Lo ocupado ese día, salvo la propia cita que se está moviendo.
  const delDia = await prisma.cita.findMany({
    where: {
      consultorioId: consultorio.id,
      id: { not: cita.id },
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: aUtc(fecha, "00:00"), lt: aUtc(fecha, "23:59") },
    },
    select: { inicio: true, fin: true },
  });

  const ocupados = delDia.map((c) => {
    const local = new Date(c.inicio.getTime() - ZONA);
    return {
      fecha,
      hora: local.toISOString().slice(11, 16),
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
    fecha,
    hora,
  });

  if (!libre) {
    return {
      ok: false,
      mensaje: "Ese horario acaba de ocuparse. Elija otro de la lista.",
    };
  }

  const inicio = aUtc(fecha, hora);

  await prisma.cita.update({
    where: { token },
    data: {
      inicio,
      fin: new Date(inicio.getTime() + consultorio.duracionCitaMin * 60_000),
      estado: "AGENDADA",
    },
  });

  await prisma.aviso.create({
    data: {
      citaId: cita.id,
      canal: cita.profesional.avisoCorreo && cita.profesional.correo ? "CORREO" : "PANEL",
      destino: cita.profesional.correo ?? "panel",
      detalle: "El paciente reprogramó su cita",
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: "paciente",
      accion: "cita.reprogramada",
      entidad: "cita",
      entidadId: cita.id,
      detalle: `${fecha} ${hora}`,
    },
  });

  revalidatePath(`/medico/${cita.profesional.slug}`);
  revalidatePath("/panel");

  return { ok: true, mensaje: "Su cita quedó reprogramada. Le enviamos la confirmación." };
}
