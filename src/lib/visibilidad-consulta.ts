/**
 * Quién ve qué de una consulta.
 *
 * Es la regla más delicada del proyecto y por eso vive sola, en funciones
 * puras: lo que está en juego es que el padecimiento de una persona con
 * nombre no salga de su sala. La ley mexicana trata los datos de salud
 * como sensibles, y un listado público que diga «Juan Pérez · dolor
 * abdominal» es exactamente lo que no puede ocurrir.
 *
 * Tres círculos, de fuera hacia dentro:
 *
 *   · Cualquiera ve el título del caso, la especialidad, el médico y el
 *     estado, y solo de las consultas que su paciente aceptó publicar.
 *     Nunca el nombre, ni el teléfono, ni el correo, ni la conversación.
 *   · El paciente y el médico de esa sala ven todo lo suyo y entran.
 *   · El consultorio ve todas, publicadas o no, porque le toca responder
 *     por ellas.
 */

export type QuienMira = {
  /** Administración o recepción. */
  esEquipo: boolean;
  /** El paciente que ha entrado, si lo hay. */
  pacienteId?: string | null;
  /** El perfil del médico que ha entrado, si lo hay. */
  profesionalId?: string | null;
};

export type ConsultaMirada = {
  pacienteId: string;
  profesionalId: string;
  publica: boolean;
};

/** ¿Esta sala es de quien mira? */
export function esSuya(quien: QuienMira, c: ConsultaMirada): boolean {
  if (quien.pacienteId && quien.pacienteId === c.pacienteId) return true;
  if (quien.profesionalId && quien.profesionalId === c.profesionalId) return true;
  return false;
}

/**
 * ¿Aparece en el listado?
 *
 * Lo propio aparece siempre, aunque el paciente pidiera no publicarlo:
 * nadie debería perder de vista su propia consulta por haber elegido
 * mantenerla fuera del directorio.
 */
export function apareceEnElListado(quien: QuienMira, c: ConsultaMirada): boolean {
  if (quien.esEquipo) return true;
  if (esSuya(quien, c)) return true;
  return c.publica;
}

/**
 * ¿Puede entrar a la sala?
 *
 * Tener el enlace no basta. Un enlace reenviado por error abriría el
 * expediente de alguien, y una conversación médica no es una página que
 * se comparta.
 */
export function puedeEntrar(quien: QuienMira, c: ConsultaMirada): boolean {
  return quien.esEquipo || esSuya(quien, c);
}

/**
 * ¿Puede ver el nombre del paciente?
 *
 * La misma regla que para entrar, y a propósito: el nombre solo tiene
 * sentido para quien ya está adentro. Separarlas invitaría a que un
 * listado futuro mostrara nombres «porque solo es el nombre».
 */
export function veAlPaciente(quien: QuienMira, c: ConsultaMirada): boolean {
  return puedeEntrar(quien, c);
}
