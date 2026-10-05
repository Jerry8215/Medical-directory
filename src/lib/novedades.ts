/**
 * Las novedades del consultorio.
 *
 * El consultorio reportó el problema con claridad: alguien solicitaba un
 * alta, pedía una cita o dejaba una reseña, y no llegaba nada a ninguna
 * parte. Esto lo resuelve en dos tiempos.
 *
 * Primero, toda novedad se guarda en la base y aparece en el panel con su
 * contador. Eso funciona desde el primer día, sin depender de ningún
 * proveedor: aunque falle el correo, el consultorio se entera al entrar.
 *
 * Segundo, una tarea periódica envía por correo las que estén sin avisar.
 * Si no hay proveedor configurado, no se marcan como avisadas y se
 * reintentan después, en lugar de perderse.
 */

import { prisma } from "@/lib/prisma";

export type Tipo =
  | "SOLICITUD_ALTA"
  | "CITA_NUEVA"
  | "CITA_CANCELADA"
  | "OPINION_NUEVA";

/**
 * Registra una novedad.
 *
 * Nunca lanza: si esto fallara, no puede tumbar la solicitud de alta o la
 * cita que lo originó. Es preferible perder un aviso que perder la cita.
 */
export async function anotar(datos: {
  tipo: Tipo;
  titulo: string;
  detalle?: string;
  enlace?: string;
  profesionalId?: string;
}): Promise<void> {
  try {
    await prisma.novedad.create({
      data: {
        tipo: datos.tipo,
        titulo: datos.titulo,
        detalle: datos.detalle,
        enlace: datos.enlace,
        profesionalId: datos.profesionalId,
      },
    });
  } catch (error) {
    console.error("[novedad] no se pudo registrar", error);
  }
}

export async function sinLeer(limite = 20) {
  return prisma.novedad.findMany({
    where: { leidaEn: null },
    orderBy: { creadaEn: "desc" },
    take: limite,
  });
}

export async function cuantasSinLeer(): Promise<number> {
  return prisma.novedad.count({ where: { leidaEn: null } });
}

/** Las de un profesional, para su propio panel. */
export async function deProfesional(profesionalId: string, limite = 20) {
  return prisma.novedad.findMany({
    where: { profesionalId },
    orderBy: { creadaEn: "desc" },
    take: limite,
  });
}

export async function marcarLeidas(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await prisma.novedad.updateMany({
    where: { id: { in: ids } },
    data: { leidaEn: new Date() },
  });
}

const NOMBRES: Record<Tipo, string> = {
  SOLICITUD_ALTA: "Solicitud de alta",
  CITA_NUEVA: "Cita nueva",
  CITA_CANCELADA: "Cita cancelada",
  OPINION_NUEVA: "Opinión por revisar",
};

export function nombreDeTipo(tipo: Tipo): string {
  return NOMBRES[tipo];
}
