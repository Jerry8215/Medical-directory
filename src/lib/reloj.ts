/**
 * La hora del consultorio.
 *
 * Chihuahua va en UTC−6 todo el año, sin horario de verano. El desfase
 * andaba repartido por media docena de archivos como `- 6 * 60 * 60_000`,
 * y cada copia era una oportunidad de que alguien escribiera cinco o se
 * le olvidara restarlo: a las 23:00 locales el reloj UTC ya va en el día
 * siguiente, y una agenda que razona en UTC salta un día entero.
 *
 * Vive en un módulo y no en un componente porque además así se puede
 * probar: `ahora` se puede pasar en las pruebas.
 */

const DESFASE = 6 * 60 * 60_000;

/** El instante actual, corrido a la hora local del consultorio. */
export function ahoraLocal(ahora: number = Date.now()): Date {
  return new Date(ahora - DESFASE);
}

/** El día de hoy en el consultorio, como AAAA-MM-DD. */
export function hoyLocal(ahora: number = Date.now()): string {
  return ahoraLocal(ahora).toISOString().slice(0, 10);
}

/** La hora actual en el consultorio, como HH:MM. */
export function horaLocal(ahora: number = Date.now()): string {
  return ahoraLocal(ahora).toISOString().slice(11, 16);
}
