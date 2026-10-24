/**
 * Las reglas de una consulta en línea, en funciones puras.
 *
 * Todo lo que decide cuánto dura una sala, cuándo vence la espera y cómo
 * se reparte el dinero vive acá, separado de la base y del procesador de
 * cobro. Es la parte donde un error se nota tarde y cuesta caro —una sala
 * que cierra antes de tiempo, un médico al que se le paga de menos—, así
 * que se prueba sola.
 *
 * Los importes van en centavos y nunca en decimales, igual que en las
 * suscripciones. El reparto se calcula una vez y se congela con la
 * consulta: si mañana cambia la comisión, lo que se cobró por esta sigue
 * siendo lo que se cobró.
 */

/** El médico tiene este plazo para aceptar antes de que se devuelva. */
export const MINUTOS_PARA_ACEPTAR = 20;

/** Lo que dura una sala desde que el médico acepta. */
export const MINUTOS_DE_SALA = 120;

/** Cuánto antes del cierre se avisa a los dos. */
export const MINUTOS_DE_AVISO = 10;

/** Lo que se queda la plataforma, en por ciento. */
export const COMISION_POR_CIENTO = 10;

const MINUTO = 60_000;

export function venceLaEsperaEn(creadaEn: Date): Date {
  return new Date(creadaEn.getTime() + MINUTOS_PARA_ACEPTAR * MINUTO);
}

export function cierraLaSalaEn(aceptadaEn: Date): Date {
  return new Date(aceptadaEn.getTime() + MINUTOS_DE_SALA * MINUTO);
}

/**
 * Cómo se reparte lo que paga el paciente.
 *
 * La comisión se redondea hacia abajo y el resto es del médico. En una
 * división que no cae exacta, el centavo suelto se va para quien puso el
 * trabajo, no para quien puso la plataforma.
 */
export function reparto(
  precio: number,
  porCiento: number = COMISION_POR_CIENTO,
): { medico: number; plataforma: number } {
  const plataforma = Math.floor((precio * porCiento) / 100);
  return { plataforma, medico: precio - plataforma };
}

export type Situacion =
  /** Esperando el cobro. */
  | "por-pagar"
  /** Cobrada; el médico todavía está a tiempo de aceptar. */
  | "esperando-medico"
  /** Nadie aceptó dentro del plazo: hay que devolver. */
  | "sin-respuesta"
  /** La sala está abierta. */
  | "abierta"
  /** Abierta, pero quedan diez minutos o menos. */
  | "por-cerrar"
  /** Se acabó el tiempo: hay que cerrarla. */
  | "se-acabo"
  /** Ya terminó, de la manera que sea. */
  | "terminada";

export type Vista = {
  estado: string;
  creadaEn: Date;
  aceptadaEn?: Date | null;
  cierraEn?: Date | null;
};

/**
 * En qué punto está una consulta, contando el tiempo.
 *
 * El estado guardado dice lo que alguien decidió; esta función dice lo
 * que el reloj ya decidió por su cuenta. Son dos cosas distintas y
 * confundirlas es lo que deja salas abiertas para siempre: nadie las
 * cierra porque nadie vuelve a entrar a mirarlas.
 */
export function situacion(c: Vista, ahora: Date = new Date()): Situacion {
  if (c.estado === "CERRADA" || c.estado === "CANCELADA" || c.estado === "VENCIDA") {
    return "terminada";
  }

  if (c.estado === "SOLICITADA") return "por-pagar";

  if (c.estado === "PAGADA") {
    return ahora >= venceLaEsperaEn(c.creadaEn) ? "sin-respuesta" : "esperando-medico";
  }

  // ACEPTADA. Sin fecha de cierre no se puede decir que se acabó: es
  // preferible dejarla abierta que cerrarle la sala a alguien a mitad de
  // una frase por un dato que falta.
  if (!c.cierraEn) return "abierta";
  if (ahora >= c.cierraEn) return "se-acabo";
  if (c.cierraEn.getTime() - ahora.getTime() <= MINUTOS_DE_AVISO * MINUTO) {
    return "por-cerrar";
  }
  return "abierta";
}

/** Cuántos minutos quedan, para mostrarlos. Nunca negativo. */
export function minutosRestantes(hasta: Date | null | undefined, ahora: Date = new Date()): number {
  if (!hasta) return 0;
  return Math.max(0, Math.ceil((hasta.getTime() - ahora.getTime()) / MINUTO));
}

/** ¿Se puede escribir en esta sala? */
export function admiteMensajes(c: Vista, ahora: Date = new Date()): boolean {
  const s = situacion(c, ahora);
  return s === "abierta" || s === "por-cerrar";
}

/**
 * ¿Se le puede ofrecer este médico a un paciente?
 *
 * Las tres condiciones son necesarias y ninguna es obvia por sí sola: un
 * perfil sin publicar no existe para el paciente, un médico apagado no va
 * a contestar en veinte minutos, y uno sin precio cargado no se puede
 * cobrar sin inventarle una cifra.
 */
export function puedeAtenderEnLinea(p: {
  estado: string;
  enLinea: boolean;
  precioConsultaLinea?: number | null;
}): boolean {
  return (
    p.estado === "PUBLICADO" &&
    p.enLinea &&
    typeof p.precioConsultaLinea === "number" &&
    p.precioConsultaLinea > 0
  );
}
