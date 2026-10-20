/**
 * Quién puede editar el perfil de un profesional.
 *
 * Vive en su propio módulo y no dentro de una acción de servidor por dos
 * razones. La primera es que dos copias de una regla de permisos terminan
 * divergiendo, y la que se queda atrás es la que deja pasar a quien no
 * debía. La segunda es que exportarla desde un archivo de acciones la
 * convertiría en una acción más, invocable desde el navegador, que es lo
 * último que uno quiere de un comprobador de permisos.
 */

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

/** El administrador, la recepción, o el propio profesional. */
export async function puedeEditarPerfil(
  slug: string,
): Promise<{ nombre: string } | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;

  if (sesion.rol === "ADMINISTRADOR" || sesion.rol === "RECEPCION") {
    return { nombre: sesion.nombre };
  }

  const profesional = await prisma.profesional.findUnique({ where: { slug } });
  if (profesional && sesion.profesionalId === profesional.id) {
    return { nombre: sesion.nombre };
  }

  return null;
}
