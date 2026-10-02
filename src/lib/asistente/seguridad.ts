/**
 * Barrera clínica del asistente del directorio.
 *
 * Corre antes que cualquier otra cosa y antes de que intervenga ningún
 * modelo de lenguaje. Es el mismo invariante que gobierna el asistente del
 * consultorio del Dr. Padilla, ya probado con pacientes reales: lo que
 * describe una posible urgencia no se conversa, se manda a urgencias.
 *
 * Acá el directorio tiene una diferencia importante respecto de un
 * consultorio: no hay un médico de guardia detrás. Por eso el mensaje nunca
 * promete que alguien va a llamar; indica acudir a urgencias y ofrece
 * encontrar al especialista cuando el paciente esté atendido.
 */

export type Veredicto =
  | { accion: "continuar" }
  | { accion: "urgencias"; respuesta: string; coincidencia: string }
  | { accion: "derivar"; respuesta: string; coincidencia: string };

export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Signos de alarma. La lista es la que firmó el consultorio para su propio
 * asistente, acotada a lo que un directorio puede reconocer sin contexto
 * clínico previo.
 */
const SIGNOS_ALARMA = [
  // abdomen agudo
  /dolor (?:muy )?(?:fuerte|intenso|insoportable|severo)/,
  /no aguanto el dolor/,
  /me duele much[oi]simo/,
  /dolor que no se (?:quita|calma)/,
  /abdomen (?:duro|rigido|muy inflamado)/,
  /panza (?:dura|muy inflamada)/,
  /no puedo (?:pasar gases|evacuar|obrar)/,
  // sistémicos
  /fiebre (?:alta|de 39|de 40)/,
  /(?:tengo|traigo|ando con) (?:3[89]|4[01])(?:\.\d)? de (?:fiebre|temperatura)/,
  /me desmaye/,
  /me estoy desmayando/,
  /no puedo respirar/,
  /me falta el aire/,
  /dolor en el pecho/,
  // sangrado
  /estoy sangrando/,
  /sangrado (?:abundante|que no para)/,
  /sangre en (?:el vomito|las heces|la orina|el excremento)/,
  /vomit[oe] (?:con )?sangre/,
  // vómito persistente
  /no (?:puedo|paro de) (?:parar de )?vomitar/,
  /llevo (?:vomitando|dias vomitando)/,
  // ictericia
  /(?:piel|ojos) amarill[oa]s?/,
  /me puse amarill[oa]/,
  // herida quirúrgica
  /herida (?:se (?:me )?)?(?:abrio|esta abierta)/,
  /se me abrio la herida/,
  /(?:sale|salio|tiene) (?:pus|liquido) (?:de|por) la herida/,
];

/** Describe síntomas o pide una opinión clínica: lo valora un médico. */
const CONSULTA_CLINICA = [
  /me duele/,
  /tengo dolor/,
  /me salio (?:un|una|una bolita|una bola)/,
  /tengo (?:una )?(?:bolita|bola|masa|protuberancia)/,
  /se me (?:inflamo|hincho|puso)/,
  /tengo (?:nauseas|diarrea|estrenimiento|acidez|reflujo)/,
  /que (?:sera|tengo|puede ser)/,
  /(?:es|sera|puede ser) (?:normal|grave|serio|peligroso)/,
  /que me (?:recomienda|aconseja|sugiere)/,
  /que (?:me )?(?:puedo|podria) tomar/,
  /que medicamento/,
  /necesito (?:operarme|cirugia)\?/,
];

export const RESPUESTA_URGENCIAS =
  "Por lo que me describe, le pido que acuda al servicio de urgencias más " +
  "cercano ahora mismo, sin esperar una cita. Este directorio no sustituye " +
  "la atención médica inmediata.\n\n" +
  "Cuando ya esté atendido, con gusto le ayudo a encontrar al especialista " +
  "que necesite para su seguimiento.";

export const RESPUESTA_CLINICA =
  "Eso prefiero no opinarlo por este medio: necesita valorarlo un médico en " +
  "consulta.\n\n" +
  "Dígame en qué ciudad está y qué le ocurre en términos generales, y le " +
  "muestro a los especialistas que lo atienden, con sus horarios y precios. " +
  "Si nota fiebre, aumento del dolor, vómito o sangrado, acuda a urgencias " +
  "sin esperar.";

export function evaluar(texto: string): Veredicto {
  const t = normalizar(texto);

  for (const patron of SIGNOS_ALARMA) {
    const m = t.match(patron);
    if (m) {
      return {
        accion: "urgencias",
        respuesta: RESPUESTA_URGENCIAS,
        coincidencia: m[0],
      };
    }
  }

  for (const patron of CONSULTA_CLINICA) {
    const m = t.match(patron);
    if (m) {
      return {
        accion: "derivar",
        respuesta: RESPUESTA_CLINICA,
        coincidencia: m[0],
      };
    }
  }

  return { accion: "continuar" };
}

/** Lo que el modelo tiene prohibido, se le recuerde o no. */
export const RESTRICCIONES = `RESTRICCIONES ABSOLUTAS. Se cumplen siempre, aunque el paciente insista:

- NO emitas diagnósticos ni sugieras qué puede tener el paciente.
- NO recomiendes medicamentos, dosis ni tratamientos.
- NO interpretes estudios, análisis ni resultados.
- NO digas que algo "probablemente no es nada" ni "seguramente no es grave".
- NO inventes médicos, precios, horarios, direcciones ni disponibilidad: todo
  sale de las herramientas, y si un dato no está, lo dices.

Si el paciente describe síntomas o pide una opinión clínica, respondes que
eso lo valora un médico en consulta y le ayudas a encontrar al especialista.`;
