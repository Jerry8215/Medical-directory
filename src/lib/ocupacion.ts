/**
 * Convertir lo que ocupa el calendario de Google en lo que entiende el
 * motor de agenda.
 *
 * Google habla en instantes UTC y el motor razona en hora de pared, que es
 * como el consultorio dice sus horarios. La conversión vive acá, en una
 * función pura, porque es el punto donde un error de seis horas ofrecería
 * citas en mitad de una cirugía.
 */

import type { Ocupado } from "@/lib/agenda";

/** Chihuahua dejó el horario de verano en 2022: UTC−6 todo el año. */
const DESFASE_MIN = 6 * 60;

function aPared(fecha: Date): { fecha: string; hora: string; minutos: number } {
  const local = new Date(fecha.getTime() - DESFASE_MIN * 60_000);
  return {
    fecha: local.toISOString().slice(0, 10),
    hora: local.toISOString().slice(11, 16),
    minutos: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}

/**
 * Un compromiso de Google puede cruzar la medianoche o durar varios días
 * —un congreso, unas vacaciones—, así que se parte por día: el motor de
 * agenda razona día por día y un tramo de setenta y dos horas no le diría
 * nada.
 */
export function comoOcupado(compromisos: { inicio: Date; fin: Date }[]): Ocupado[] {
  const ocupados: Ocupado[] = [];

  for (const c of compromisos) {
    if (c.fin <= c.inicio) continue;

    let cursor = c.inicio;
    // Tope de treinta días: un compromiso más largo que eso en un
    // calendario médico es un error de captura, no una ausencia real.
    for (let vuelta = 0; vuelta < 30 && cursor < c.fin; vuelta += 1) {
      const inicio = aPared(cursor);
      const finDelDia = new Date(
        Date.UTC(
          Number(inicio.fecha.slice(0, 4)),
          Number(inicio.fecha.slice(5, 7)) - 1,
          Number(inicio.fecha.slice(8, 10)) + 1,
          DESFASE_MIN / 60,
        ),
      );

      const corte = c.fin < finDelDia ? c.fin : finDelDia;
      const duracion = Math.round((corte.getTime() - cursor.getTime()) / 60_000);

      if (duracion > 0) {
        ocupados.push({ fecha: inicio.fecha, hora: inicio.hora, duracionMin: duracion });
      }

      cursor = corte;
    }
  }

  return ocupados;
}
