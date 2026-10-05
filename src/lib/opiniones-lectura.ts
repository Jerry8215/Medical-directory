/**
 * Lectura de opiniones y del teléfono publicado.
 *
 * Vive aparte de `opiniones.ts` porque ese archivo declara acciones del
 * servidor y solo puede exportar funciones invocables desde el navegador.
 */

import { prisma } from "@/lib/prisma";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export async function opinionesDe(slug: string) {
  const filas = await prisma.opinion.findMany({
    where: { profesional: { slug }, publicada: true },
    orderBy: { fecha: "desc" },
    take: 20,
  });

  return filas.map((o) => ({
    id: o.id,
    autor: o.autor,
    texto: o.texto,
    calificacion: o.calificacion,
    cuando: `${o.fecha.getUTCDate()} de ${MESES[o.fecha.getUTCMonth()]} de ${o.fecha.getUTCFullYear()}`,
  }));
}

export async function telefonoDe(slug: string): Promise<string | null> {
  const p = await prisma.profesional.findUnique({
    where: { slug },
    select: { telefono: true },
  });
  return p?.telefono ?? null;
}
