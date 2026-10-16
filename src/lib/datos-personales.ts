"use server";

/**
 * Atención de los derechos ARCO.
 *
 * El aviso de privacidad promete acceso, rectificación, cancelación y
 * oposición en veinte días hábiles. Hasta ahora eso era un texto: no había
 * manera de exportar lo que se guarda de un paciente ni de borrarlo. Acá
 * está la manera.
 *
 * La decisión que más condiciona el resto: cancelar no borra la cita, la
 * despersonaliza. Si se borrara, al médico le desaparecería una consulta
 * de su agenda y de su historial, y ni la ley lo pide ni el consultorio
 * podría cuadrar su trabajo. Se va el nombre, el teléfono, el correo y el
 * motivo que escribió el paciente; queda que hubo una consulta, con quién
 * y cuándo.
 */

import { revalidatePath } from "next/cache";

import { comoTexto, nombreDelArchivo, telefonoAnonimo, type Expediente } from "@/lib/arco";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { sitio } from "@/config/sitio";

export type Resultado =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

export type Hallazgo = {
  id: string;
  nombre: string | null;
  telefono: string;
  correo: string | null;
  citas: number;
  opiniones: number;
  bajaEn: string | null;
  cancelado: boolean;
};

async function equipo(): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  return s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION" ? { nombre: s.nombre } : null;
}

async function asentar(accion: string, pacienteId: string, detalle: string, quien: string) {
  await prisma.registroAuditoria.create({
    data: { actor: quien, accion, entidad: "paciente", entidadId: pacienteId, detalle },
  });
}

/**
 * Encontrar al titular por su teléfono.
 *
 * Es el dato con el que el paciente agendó y el único que puede aportar
 * para identificarse, así que es la llave de búsqueda. Se aceptan diez
 * dígitos o el número con lada.
 */
export async function buscarTitular(telefono: string): Promise<Hallazgo[]> {
  if (!(await equipo())) return [];

  const limpio = telefono.replace(/\D/g, "");
  if (limpio.length < 7) return [];

  const pacientes = await prisma.paciente.findMany({
    where: { telefono: { contains: limpio.slice(-10) } },
    include: { _count: { select: { citas: true } } },
    take: 10,
  });

  const salida: Hallazgo[] = [];
  for (const p of pacientes) {
    // La opinión guarda el identificador de la cita pero no declara la
    // relación, así que se cuenta por sus citas y no navegando hacia ella.
    const suyas = await prisma.cita.findMany({
      where: { pacienteId: p.id },
      select: { id: true },
    });
    const opiniones = await prisma.opinion.count({
      where: { citaId: { in: suyas.map((c) => c.id) } },
    });
    salida.push({
      id: p.id,
      nombre: p.nombre,
      telefono: p.telefono,
      correo: p.correo,
      citas: p._count.citas,
      opiniones,
      bajaEn: p.bajaEn ? p.bajaEn.toISOString().slice(0, 10) : null,
      cancelado: p.telefono.startsWith("anonimo-"),
    });
  }
  return salida;
}

/** Derecho de acceso: todo lo que se guarda, en un archivo legible. */
export async function exportarTitular(
  pacienteId: string,
): Promise<{ ok: boolean; mensaje: string; archivo?: string; nombre?: string }> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede atender estas solicitudes." };

  const p = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    include: {
      citas: {
        orderBy: { inicio: "desc" },
        include: {
          profesional: { select: { nombre: true } },
          consultorio: { select: { nombre: true } },
        },
      },
    },
  });
  if (!p) return { ok: false, mensaje: "No se encontró ese expediente." };

  // Las opiniones se traen por el identificador de la cita: el modelo
  // guarda la columna pero no declara la relación.
  const porCita = new Map(p.citas.map((c) => [c.id, c]));
  const opiniones = await prisma.opinion.findMany({
    where: { citaId: { in: [...porCita.keys()] } },
  });

  const expediente: Expediente = {
    nombre: p.nombre,
    telefono: p.telefono,
    correo: p.correo,
    alta: p.creadoEn,
    consentimiento: p.consentimiento,
    bajaEn: p.bajaEn,
    citas: p.citas.map((c) => ({
      cuando: c.inicio,
      profesional: c.profesional.nombre,
      consultorio: c.consultorio.nombre,
      estado: c.estado,
      origen: c.origen,
      motivo: c.motivo,
    })),
    opiniones: opiniones.map((o) => ({
      fecha: o.fecha,
      profesional: porCita.get(o.citaId ?? "")?.profesional.nombre ?? "—",
      calificacion: o.calificacion,
      texto: o.texto,
      publicada: o.publicada,
    })),
  };

  const emitido = new Date();
  await asentar("arco.acceso", pacienteId, "Se entregó el expediente al titular.", quien.nombre);

  return {
    ok: true,
    mensaje: "Expediente generado. Entrégueselo al titular por el medio que él indique.",
    archivo: comoTexto(expediente, sitio.nombre, emitido),
    nombre: nombreDelArchivo(emitido),
  };
}

/** Derecho de rectificación. */
export async function rectificarTitular(
  pacienteId: string,
  nombre: string,
  correo: string,
): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede atender estas solicitudes." };

  await prisma.paciente.update({
    where: { id: pacienteId },
    data: {
      nombre: nombre.trim() || null,
      correo: correo.trim() || null,
    },
  });
  await asentar("arco.rectificacion", pacienteId, "Se corrigieron los datos de contacto.", quien.nombre);

  revalidatePath("/panel/datos-personales");
  return { ok: true, mensaje: "Datos corregidos y registrada la operación." };
}

/**
 * Derecho de cancelación.
 *
 * Se van los datos que identifican: nombre, teléfono, correo y el motivo
 * que el paciente escribió al agendar, que es información de salud. Queda
 * la cita como hecho, sin dueño. Las opiniones sí se borran enteras,
 * porque el texto es del titular, y se recalcula la calificación del
 * médico para que no quede contando una reseña que ya no existe.
 */
export async function cancelarTitular(pacienteId: string): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede atender estas solicitudes." };

  const p = await prisma.paciente.findUnique({
    where: { id: pacienteId },
    include: { citas: { select: { id: true, profesionalId: true } } },
  });
  if (!p) return { ok: false, mensaje: "No se encontró ese expediente." };
  if (p.telefono.startsWith("anonimo-")) {
    return { ok: false, mensaje: "Ese expediente ya estaba cancelado." };
  }

  const citas = p.citas.map((c) => c.id);
  const medicos = [...new Set(p.citas.map((c) => c.profesionalId))];

  await prisma.$transaction([
    prisma.opinion.deleteMany({ where: { citaId: { in: citas } } }),
    prisma.cita.updateMany({ where: { pacienteId }, data: { motivo: null } }),
    prisma.paciente.update({
      where: { id: pacienteId },
      data: {
        nombre: null,
        correo: null,
        telefono: telefonoAnonimo(pacienteId),
        bajaEn: new Date(),
      },
    }),
  ]);

  // La calificación se guarda ya calculada en el perfil; si no se rehace,
  // el médico sigue mostrando el promedio de una reseña borrada.
  for (const profesionalId of medicos) {
    const publicadas = await prisma.opinion.findMany({
      where: { profesionalId, publicada: true },
      select: { calificacion: true },
    });
    const total = publicadas.length;
    await prisma.profesional.update({
      where: { id: profesionalId },
      data: {
        numeroOpiniones: total,
        calificacion:
          total > 0
            ? Math.round((publicadas.reduce((s, o) => s + o.calificacion, 0) / total) * 10) / 10
            : null,
      },
    });
  }

  await asentar(
    "arco.cancelacion",
    pacienteId,
    `Se eliminaron los datos personales. Se conservaron ${citas.length} cita(s) como registro anónimo.`,
    quien.nombre,
  );

  revalidatePath("/panel/datos-personales");
  revalidatePath("/panel");
  return {
    ok: true,
    mensaje: `Datos personales eliminados. Se conservaron ${citas.length} cita(s) sin titular, para no descuadrar la agenda del médico.`,
  };
}

/**
 * Derecho de oposición: deja de recibir recordatorios y solicitudes de
 * reseña, sin borrar su historial.
 */
export async function oponerTitular(
  pacienteId: string,
  oponerse: boolean,
): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede atender estas solicitudes." };

  await prisma.paciente.update({
    where: { id: pacienteId },
    data: { bajaEn: oponerse ? new Date() : null },
  });
  await asentar(
    oponerse ? "arco.oposicion" : "arco.oposicion.retirada",
    pacienteId,
    oponerse ? "Dejó de recibir avisos." : "Vuelve a recibir avisos.",
    quien.nombre,
  );

  revalidatePath("/panel/datos-personales");
  return {
    ok: true,
    mensaje: oponerse
      ? "Registrado. No volverá a recibir recordatorios ni solicitudes de reseña."
      : "Registrado. Vuelve a recibir los avisos de sus citas.",
  };
}
