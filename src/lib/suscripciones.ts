/**
 * El dinero de una suscripción, en funciones puras.
 *
 * Todo lo que decide cuánto se cobra y hasta cuándo queda pagado vive acá,
 * separado de la base y del proveedor de cobro. Es la parte donde un error
 * se nota tarde y cuesta caro —un mes de más, un mes de menos, un perfil
 * que cae al básico el día equivocado—, así que se prueba sola.
 *
 * Los importes van en centavos y nunca en decimales. Trescientos pesos con
 * cincuenta son 30050, no 300.50: sumar flotantes termina cobrando
 * 300.4999999 y redondeando distinto en cada pantalla.
 */

import type { Plan } from "@/lib/planes";

export type Periodicidad = "MENSUAL" | "ANUAL";

/** Lo que cuesta cada plan al mes, en centavos de peso. */
export type Precios = Record<Exclude<Plan, "BASICO">, number>;

/**
 * Precios de arranque, hasta que el consultorio fije los suyos.
 *
 * Se guardan en los ajustes para que pueda cambiarlos sin que nadie vuelva
 * a tocar el código, que es lo que se le prometió.
 */
export const PRECIOS_POR_OMISION: Precios = {
  GOLD: 29900,
  PREMIUM: 59900,
};

/**
 * Descuento de la anualidad: se pagan diez meses y se llevan doce.
 *
 * Dos meses de regalo es lo habitual y, sobre todo, adelanta un año de
 * ingreso y ahorra once cobros que alguien tendría que perseguir.
 */
export const MESES_ANUALES = 12;
export const MESES_QUE_SE_PAGAN_AL_ANO = 10;

export function mesesDe(periodicidad: Periodicidad): number {
  return periodicidad === "ANUAL" ? MESES_ANUALES : 1;
}

/** Cuánto se cobra por un plan y una periodicidad, en centavos. */
export function importe(
  plan: Plan,
  periodicidad: Periodicidad,
  precios: Precios = PRECIOS_POR_OMISION,
): number {
  if (plan === "BASICO") return 0;
  const mensual = precios[plan];
  return periodicidad === "ANUAL" ? mensual * MESES_QUE_SE_PAGAN_AL_ANO : mensual;
}

/** «$299.00», para mostrar. */
export function pesos(centavos: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(centavos / 100);
}

/**
 * Hasta cuándo queda pagado al acreditar un pago.
 *
 * Si la suscripción sigue vigente se suma al final de lo ya pagado, no a
 * hoy: quien renueva una semana antes de vencer no puede perder esa semana
 * por haberse adelantado. Si ya venció, el nuevo periodo arranca hoy.
 */
export function nuevoVencimiento(
  vigenteHasta: Date | null | undefined,
  meses: number,
  ahora: Date = new Date(),
): Date {
  const base =
    vigenteHasta && vigenteHasta.getTime() > ahora.getTime() ? vigenteHasta : ahora;

  const fin = new Date(base.getTime());
  const diaOriginal = fin.getUTCDate();
  fin.setUTCMonth(fin.getUTCMonth() + meses);

  // Del 31 de enero más un mes no existe el 31 de febrero: el navegador se
  // pasa al 3 de marzo y la suscripción gana días. Se recorta al último día
  // del mes que corresponde.
  if (fin.getUTCDate() < diaOriginal) {
    fin.setUTCDate(0);
  }
  return fin;
}

export type EstadoSuscripcion = "BASICO" | "ACTIVA" | "POR_VENCER" | "VENCIDA";

/** Faltan siete días o menos: es cuando se avisa. */
export const DIAS_DE_AVISO = 7;

/**
 * Para quien paga con tarjeta, el aviso va tres días antes.
 *
 * No es lo mismo recordarle a alguien que renueve que avisarle que se le
 * va a cobrar. Siete días antes, el aviso de un cobro automático llega
 * cuando todavía no importa y se olvida; tres días antes llega a tiempo
 * para darlo de baja si ya no lo quiere, que es la única razón honesta
 * para mandarlo.
 */
export const DIAS_DE_AVISO_TARJETA = 3;

export function diasRestantes(
  vigenteHasta: Date | null | undefined,
  ahora: Date = new Date(),
): number | null {
  if (!vigenteHasta) return null;
  const ms = vigenteHasta.getTime() - ahora.getTime();
  return Math.ceil(ms / 86_400_000);
}

/**
 * En qué situación está la suscripción de un perfil.
 *
 * Un plan de pago sin fecha es cortesía indefinida, y se reporta como
 * activa: no hay nada que cobrar ni que avisar.
 */
export function estadoSuscripcion(
  plan: Plan,
  vigenteHasta: Date | null | undefined,
  ahora: Date = new Date(),
): EstadoSuscripcion {
  if (plan === "BASICO") return "BASICO";
  if (!vigenteHasta) return "ACTIVA";

  const dias = diasRestantes(vigenteHasta, ahora) ?? 0;
  if (dias < 0) return "VENCIDA";
  if (dias <= DIAS_DE_AVISO) return "POR_VENCER";
  return "ACTIVA";
}

/**
 * El folio del recibo.
 *
 * Correlativo por año, con ceros a la izquierda, para que el consultorio
 * pueda llevarlo a su contabilidad y buscarlo por número.
 */
export function folio(anio: number, consecutivo: number): string {
  return `MD-${anio}-${String(consecutivo).padStart(5, "0")}`;
}

/** Lo que el médico ve como concepto en su recibo. */
export function concepto(plan: Plan, periodicidad: Periodicidad): string {
  const nombre = plan === "PREMIUM" ? "Premium" : "Gold";
  return periodicidad === "ANUAL"
    ? `Plan ${nombre}, doce meses`
    : `Plan ${nombre}, un mes`;
}
