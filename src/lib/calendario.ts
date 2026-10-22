/**
 * La rejilla de un mes, para elegir el día como en un calendario de pared.
 *
 * El agendador ofrecía los sesenta días en una tira horizontal de botones.
 * Funcionaba, pero el paciente que quiere «el martes de la otra semana»
 * no cuenta botones: busca el martes en una cuadrícula. El consultorio lo
 * dijo con esas palabras, comparándolo con los calendarios que ya conoce.
 *
 * Todo trabaja sobre fechas «AAAA-MM-DD» y en UTC a propósito: construir
 * un `Date` local acá desplazaría el día entero seis horas y el martes
 * terminaría cayendo en lunes.
 */

import { DIAS, MESES } from "@/lib/agenda";

/** "2026-10-22" → "2026-10" */
export function mesDe(fecha: string): string {
  return fecha.slice(0, 7);
}

/** "2026-10" → "octubre de 2026" */
export function nombreDelMes(mes: string): string {
  const [anio, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${anio}`;
}

export function mesCorrido(mes: string, cuantos: number): string {
  const [anio, m] = mes.split("-").map(Number);
  const total = anio * 12 + (m - 1) + cuantos;
  const a = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${a}-${String(mm).padStart(2, "0")}`;
}

/**
 * Los rótulos de la semana, empezando en lunes como el resto del sitio.
 *
 * Dos letras y no una: con una sola, martes y miércoles son los dos «M»
 * y hay que contarlos para saber cuál es cuál.
 */
export const INICIALES = DIAS.map((d) => d.slice(0, 2).replace(/^./, (c) => c.toUpperCase()));

/**
 * Las celdas del mes: `null` para los huecos antes del día 1 y después
 * del último, de modo que cada fecha caiga bajo su columna.
 */
export function rejillaDelMes(mes: string): (string | null)[] {
  const [anio, m] = mes.split("-").map(Number);
  const primero = new Date(Date.UTC(anio, m - 1, 1));
  // Lunes = 0.
  const corrimiento = (primero.getUTCDay() + 6) % 7;
  const cuantos = new Date(Date.UTC(anio, m, 0)).getUTCDate();

  const celdas: (string | null)[] = Array(corrimiento).fill(null);
  for (let d = 1; d <= cuantos; d += 1) {
    celdas.push(`${mes}-${String(d).padStart(2, "0")}`);
  }
  // Se completa la última semana para que la rejilla no quede dentada.
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

export type Franja = "mañana" | "tarde";

/**
 * Mañana o tarde.
 *
 * Veinte horarios seguidos en una sola lista se leen peor que dos listas
 * de diez: el paciente ya sabe a qué parte del día puede ir, y lo primero
 * que hace es descartar la otra mitad.
 */
export function franjaDe(hora: string): Franja {
  return Number(hora.slice(0, 2)) < 13 ? "mañana" : "tarde";
}

export function porFranja(horas: string[]): { franja: Franja; horas: string[] }[] {
  const grupos: { franja: Franja; horas: string[] }[] = [
    { franja: "mañana", horas: [] },
    { franja: "tarde", horas: [] },
  ];
  for (const h of horas) {
    grupos[franjaDe(h) === "mañana" ? 0 : 1].horas.push(h);
  }
  return grupos.filter((g) => g.horas.length > 0);
}
