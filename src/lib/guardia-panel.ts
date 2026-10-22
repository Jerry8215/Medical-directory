/**
 * Quién puede abrir cada pantalla del panel.
 *
 * El servidor ya rechazaba las acciones que no le tocaban a cada rol, y
 * eso estaba bien. Lo que faltaba era impedir que la pantalla se dibujara
 * siquiera: un médico escribiendo la dirección a mano llegaba al tablero
 * del directorio, a la caja y al catálogo, y de paso leía las cédulas y
 * los datos de sus colegas. Bloquear el botón no sirve de nada si la
 * página ya imprimió lo que el botón iba a modificar.
 *
 * Cada pantalla del equipo empieza llamando a esto. Que sea una línea al
 * principio y no una condición repartida por el archivo es a propósito:
 * una comprobación que se puede olvidar a mitad de un `return` es una
 * comprobación que tarde o temprano se olvida.
 */

import { redirect } from "next/navigation";

import { esEquipo } from "@/lib/navegacion-panel";
import { sesionActual } from "@/lib/sesion-actual";

export type Sesion = NonNullable<Awaited<ReturnType<typeof sesionActual>>>;

/** Administrador o recepción. Al médico lo devuelve a su agenda. */
export async function exigirEquipo(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");
  if (!esEquipo(sesion.rol)) redirect("/panel/mi-agenda");
  return sesion;
}

/** Solo administrador: cobros, accesos y catálogos del directorio. */
export async function exigirAdministrador(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");
  if (sesion.rol !== "ADMINISTRADOR") {
    redirect(esEquipo(sesion.rol) ? "/panel" : "/panel/mi-agenda");
  }
  return sesion;
}
