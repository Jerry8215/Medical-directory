/**
 * Qué incluye cada plan.
 *
 * Una regla que conviene no perder de vista: el plan define las
 * herramientas del perfil, nunca la verificación ni la presencia en el
 * directorio. Un médico del plan básico aparece igual y con su cédula
 * comprobada igual; lo que no tiene es fotografía, contacto directo ni
 * agenda en línea. Vender el distintivo de verificado convertiría al
 * directorio en otra cosa.
 *
 * El plan vencido no quita el perfil: lo devuelve al básico. Se cobra el
 * plan, no la presencia.
 */

export type Plan = "BASICO" | "GOLD" | "PREMIUM";

export type Capacidades = {
  /** Fotografía del profesional en su perfil y en los listados. */
  fotografia: boolean;
  /** Botón para escribirle directo por WhatsApp. */
  whatsapp: boolean;
  /** Agenda en línea: el paciente elige horario y queda confirmado. */
  agenda: boolean;
  /** Recordatorio automático al paciente el día anterior. */
  recordatorios: boolean;
  /** Semblanza, padecimientos, convenios y precios en el perfil. */
  perfilAmpliado: boolean;
  /** Aparece antes que los planes menores en los listados. */
  prioridad: number;
  /** Cuántos consultorios puede publicar. */
  consultorios: number;
};

export const CAPACIDADES: Record<Plan, Capacidades> = {
  BASICO: {
    fotografia: false,
    whatsapp: false,
    agenda: false,
    recordatorios: false,
    perfilAmpliado: false,
    prioridad: 0,
    consultorios: 1,
  },
  GOLD: {
    fotografia: true,
    whatsapp: true,
    agenda: false,
    recordatorios: false,
    perfilAmpliado: true,
    prioridad: 1,
    consultorios: 2,
  },
  PREMIUM: {
    fotografia: true,
    whatsapp: true,
    agenda: true,
    recordatorios: true,
    perfilAmpliado: true,
    prioridad: 2,
    consultorios: 5,
  },
};

export const NOMBRES: Record<Plan, string> = {
  BASICO: "Básico",
  GOLD: "Gold",
  PREMIUM: "Premium",
};

export const DESCRIPCIONES: Record<Plan, string> = {
  BASICO:
    "Su perfil en el directorio, con cédula verificada, especialidad, ciudad y teléfono para que el paciente lo llame.",
  GOLD:
    "Todo lo del básico, más su fotografía, un botón para que el paciente le escriba directo por WhatsApp y su perfil completo con padecimientos, convenios y precios.",
  PREMIUM:
    "Todo lo del Gold, más su agenda en línea: el paciente elige el horario, la cita queda confirmada al instante y recibe su recordatorio el día anterior.",
};

/**
 * El plan vigente de un perfil.
 *
 * Si la suscripción venció, el perfil opera como básico hasta que se
 * renueve, sin que nadie tenga que acordarse de bajarlo.
 */
export function planVigente(plan: Plan, hasta: Date | null | undefined): Plan {
  if (plan === "BASICO") return "BASICO";
  if (!hasta) return plan; // sin fecha: cortesía o plan sin vencimiento
  return hasta.getTime() >= Date.now() ? plan : "BASICO";
}

export function capacidades(plan: Plan, hasta?: Date | null): Capacidades {
  return CAPACIDADES[planVigente(plan, hasta)];
}

/** Lo que se le muestra al profesional cuando intenta usar algo que no tiene. */
export function faltaPlan(necesario: Plan): string {
  return `Esta herramienta viene con el plan ${NOMBRES[necesario]}.`;
}
