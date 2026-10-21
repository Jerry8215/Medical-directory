/**
 * Lo que ya está tomado en un consultorio.
 *
 * Vive aparte de `citas.ts` porque ese archivo declara acciones del
 * servidor, y un módulo de acciones solo puede exportar funciones que el
 * navegador tenga permitido invocar. Esto se consulta al pintar la página.
 */

import type { Ocupado } from "@/lib/agenda";
import { ocupadoEnGoogle } from "@/lib/google-calendar";
import { comoOcupado } from "@/lib/ocupacion";
import { prisma } from "@/lib/prisma";

const ZONA_HORARIA_MINUTOS = 6 * 60; // Chihuahua, UTC−6 todo el año

export async function ocupadosDe(
  consultorioId: string,
  dias = 21,
): Promise<Ocupado[]> {
  const desde = new Date();
  const hasta = new Date(desde.getTime() + dias * 24 * 60 * 60_000);

  const hoy = new Date(desde.getTime() - ZONA_HORARIA_MINUTOS * 60_000)
    .toISOString()
    .slice(0, 10);
  const tope = new Date(hasta.getTime() - ZONA_HORARIA_MINUTOS * 60_000)
    .toISOString()
    .slice(0, 10);

  const [citas, apartadas, consultorio] = await Promise.all([
    prisma.cita.findMany({
      where: {
        consultorioId,
        estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
        inicio: { gte: desde, lte: hasta },
      },
      select: { inicio: true, fin: true },
    }),
    // Las horas que el médico apartó porque ya las comprometió por otro
    // medio cuentan igual que una cita: el hueco no está libre.
    prisma.horaCerrada.findMany({
      where: { consultorioId, fecha: { gte: hoy, lte: tope } },
      select: { fecha: true, hora: true },
    }),
    prisma.consultorio.findUnique({
      where: { id: consultorioId },
      select: {
        calendarioGoogleId: true,
        duracionCitaMin: true,
        profesional: { select: { plan: true } },
      },
    }),
  ]);

  // El plan Premium suma lo que el médico tenga apuntado en su propio
  // calendario. Si Google no contesta, se devuelve lo que sí sabemos y el
  // consultorio ve la cita en el panel: preferible una cita de más que
  // ofrecer una hora comprometida.
  const deGoogle =
    consultorio?.calendarioGoogleId && consultorio.profesional.plan === "PREMIUM"
      ? await ocupadoEnGoogle(consultorio.calendarioGoogleId, desde, hasta)
      : null;

  const bloqueadas: Ocupado[] = apartadas.map((h) => ({
    fecha: h.fecha,
    hora: h.hora,
    duracionMin: consultorio?.duracionCitaMin ?? 30,
  }));

  const propios = citas.map((c) => {
    const local = new Date(c.inicio.getTime() - ZONA_HORARIA_MINUTOS * 60_000);
    return {
      fecha: local.toISOString().slice(0, 10),
      hora: local.toISOString().slice(11, 16),
      duracionMin: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000),
    };
  });

  const todo = [...propios, ...bloqueadas];
  return deGoogle ? [...todo, ...comoOcupado(deGoogle)] : todo;
}
