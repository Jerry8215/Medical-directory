/**
 * Lo que ya está tomado en un consultorio.
 *
 * Vive aparte de `citas.ts` porque ese archivo declara acciones del
 * servidor, y un módulo de acciones solo puede exportar funciones que el
 * navegador tenga permitido invocar. Esto se consulta al pintar la página.
 */

import type { Ocupado } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";

const ZONA_HORARIA_MINUTOS = 6 * 60; // Chihuahua, UTC−6 todo el año

export async function ocupadosDe(
  consultorioId: string,
  dias = 21,
): Promise<Ocupado[]> {
  const desde = new Date();
  const hasta = new Date(desde.getTime() + dias * 24 * 60 * 60_000);

  const citas = await prisma.cita.findMany({
    where: {
      consultorioId,
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: desde, lte: hasta },
    },
    select: { inicio: true, fin: true },
  });

  return citas.map((c) => {
    const local = new Date(c.inicio.getTime() - ZONA_HORARIA_MINUTOS * 60_000);
    return {
      fecha: local.toISOString().slice(0, 10),
      hora: local.toISOString().slice(11, 16),
      duracionMin: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000),
    };
  });
}
