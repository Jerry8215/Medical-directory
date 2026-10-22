/**
 * Llamar a una acción del panel sin que un fallo quede en silencio.
 *
 * El consultorio lo reportó así: apretó el botón, no apareció ningún
 * mensaje, y no había manera de saber si había quedado guardado. Lo que
 * pasaba era que la acción no llegaba a correr —la base de datos estaba
 * caída—, la promesa se rompía dentro del `startTransition` y nadie la
 * recogía: la pantalla se quedaba exactamente igual que antes.
 *
 * Un error del servidor no es lo mismo que un «no se pudo»: el primero
 * hay que decirlo, porque de él no se sabe si el cambio alcanzó a
 * guardarse. Por eso el mensaje no promete que no pasó nada, sino que
 * pide comprobarlo.
 */

/**
 * Lo que se devuelve cuando la acción ni siquiera llegó a contestar.
 *
 * Carga `errores` y `motivo` vacíos a propósito: las pantallas que los
 * leen —el alta y la reserva— los dan por presentes en cualquier
 * respuesta negativa, y así este caso entra por la misma puerta en lugar
 * de obligarlas a distinguirlo.
 */
type Fallo = {
  ok: false;
  mensaje: string;
  errores: Record<string, string>;
  motivo: "error";
};

export const SIN_RESPUESTA =
  "No hubo respuesta del servidor. Vuelva a cargar la página para ver si el cambio quedó guardado y, si no, inténtelo otra vez.";

export async function intentar<T extends { ok: boolean }>(
  accion: () => Promise<T>,
  siFalla: string = SIN_RESPUESTA,
): Promise<T | Fallo> {
  try {
    return await accion();
  } catch (error) {
    // Queda en la consola del navegador, que es donde se puede pedir una
    // captura cuando alguien reporta que «no hizo nada».
    console.error("[accion] no se completó", error);
    return { ok: false, mensaje: siFalla, errores: {}, motivo: "error" };
  }
}
