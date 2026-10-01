/**
 * Motor de agenda.
 *
 * Convierte los tramos de atención de un consultorio en los huecos que ve
 * el paciente, descontando lo que ya está ocupado. Es lógica pura, sin base
 * de datos y sin red, porque es la pieza donde un error se paga caro: un
 * hueco ofrecido de más son dos pacientes a la misma hora en la sala de
 * espera, y uno de menos es una cita que el consultorio no recibe.
 *
 * Sobre la hora: Chihuahua dejó el horario de verano en 2022, así que toda
 * la región trabaja en UTC−6 todo el año. Aun así, acá se opera con la hora
 * de pared —fecha y «HH:MM»— y la conversión a UTC ocurre al guardar en la
 * base. Mezclar husos en el cálculo es la forma más común de ofrecer citas
 * a las tres de la mañana.
 */

export type Franja = {
  /** 0 = lunes … 6 = domingo */
  dia: number;
  desde: string;
  hasta: string;
};

export type Ocupado = {
  /** "2026-10-05" */
  fecha: string;
  /** "09:30" */
  hora: string;
  /** minutos que dura lo ocupado */
  duracionMin?: number;
};

export type Hueco = {
  fecha: string;
  hora: string;
  /** "lunes 5 de octubre" */
  etiqueta: string;
};

export const DIAS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export function aMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function aHora(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Lunes = 0, para que coincida con cómo el consultorio numera sus días. */
export function diaDeLaSemana(fecha: string): number {
  const [a, m, d] = fecha.split("-").map(Number);
  const js = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return (js + 6) % 7;
}

export function etiquetaDe(fecha: string): string {
  const [a, m, d] = fecha.split("-").map(Number);
  void a;
  return `${DIAS[diaDeLaSemana(fecha)]} ${d} de ${MESES[m - 1]}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  const base = new Date(Date.UTC(a, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

function seEmpalma(
  inicio: number,
  duracion: number,
  ocupados: { inicio: number; fin: number }[],
): boolean {
  const fin = inicio + duracion;
  return ocupados.some((o) => inicio < o.fin && fin > o.inicio);
}

/**
 * Huecos disponibles de un consultorio.
 *
 * `desde` es la fecha del primer día a considerar y `horaActual` permite
 * descartar lo que ya pasó hoy: ofrecer las nueve de la mañana a las once
 * es la clase de detalle que le hace perder la confianza al paciente.
 */
export function huecos({
  franjas,
  duracionMin,
  ocupados = [],
  desde,
  dias = 14,
  horaActual,
  anticipacionMin = 60,
  maximo = 24,
}: {
  franjas: Franja[];
  duracionMin: number;
  ocupados?: Ocupado[];
  desde: string;
  dias?: number;
  horaActual?: string;
  anticipacionMin?: number;
  maximo?: number;
}): Hueco[] {
  const resultado: Hueco[] = [];
  if (duracionMin <= 0 || franjas.length === 0) return resultado;

  for (let i = 0; i < dias && resultado.length < maximo; i += 1) {
    const fecha = sumarDias(desde, i);
    const delDia = franjas.filter((f) => f.dia === diaDeLaSemana(fecha));
    if (delDia.length === 0) continue;

    const ocupadosDelDia = ocupados
      .filter((o) => o.fecha === fecha)
      .map((o) => ({
        inicio: aMinutos(o.hora),
        fin: aMinutos(o.hora) + (o.duracionMin ?? duracionMin),
      }));

    // Hoy no se ofrece lo que ya pasó, ni lo que empieza en los próximos
    // minutos: nadie alcanza a llegar.
    const minimoHoy =
      i === 0 && horaActual ? aMinutos(horaActual) + anticipacionMin : -1;

    for (const franja of delDia) {
      const inicioFranja = aMinutos(franja.desde);
      const finFranja = aMinutos(franja.hasta);

      for (
        let minuto = inicioFranja;
        minuto + duracionMin <= finFranja;
        minuto += duracionMin
      ) {
        if (minuto < minimoHoy) continue;
        if (seEmpalma(minuto, duracionMin, ocupadosDelDia)) continue;

        resultado.push({ fecha, hora: aHora(minuto), etiqueta: etiquetaDe(fecha) });
        if (resultado.length >= maximo) break;
      }
      if (resultado.length >= maximo) break;
    }
  }

  return resultado;
}

/** Agrupa los huecos por día, que es como se muestran al paciente. */
export function porDia(lista: Hueco[]): { fecha: string; etiqueta: string; horas: string[] }[] {
  const dias = new Map<string, { fecha: string; etiqueta: string; horas: string[] }>();
  for (const h of lista) {
    const dia = dias.get(h.fecha) ?? { fecha: h.fecha, etiqueta: h.etiqueta, horas: [] };
    dia.horas.push(h.hora);
    dias.set(h.fecha, dia);
  }
  return [...dias.values()];
}

/**
 * ¿Se puede agendar en ese momento exacto?
 *
 * Se usa al confirmar, no al mostrar: entre que el paciente ve el horario y
 * lo elige, otro pudo haberlo tomado.
 */
export function disponible({
  franjas,
  duracionMin,
  ocupados = [],
  fecha,
  hora,
}: {
  franjas: Franja[];
  duracionMin: number;
  ocupados?: Ocupado[];
  fecha: string;
  hora: string;
}): boolean {
  const inicio = aMinutos(hora);
  const dentroDeFranja = franjas
    .filter((f) => f.dia === diaDeLaSemana(fecha))
    .some((f) => inicio >= aMinutos(f.desde) && inicio + duracionMin <= aMinutos(f.hasta));
  if (!dentroDeFranja) return false;

  const ocupadosDelDia = ocupados
    .filter((o) => o.fecha === fecha)
    .map((o) => ({
      inicio: aMinutos(o.hora),
      fin: aMinutos(o.hora) + (o.duracionMin ?? duracionMin),
    }));

  return !seEmpalma(inicio, duracionMin, ocupadosDelDia);
}
