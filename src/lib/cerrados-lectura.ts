/**
 * Los días que un médico tiene cerrados, listos para el motor de agenda.
 *
 * Se expande el rango a días sueltos acá y no dentro del motor para que
 * el motor siga siendo una función pura sobre fechas, sin saber que
 * existe una base de datos.
 */

import { diasDelPeriodo } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";

/**
 * Recibe el slug y no el identificador porque el perfil público no expone
 * identificadores de la base: se dirige por slug y conviene que siga así.
 */
export async function cerradosDe(slug: string): Promise<string[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const periodos = await prisma.periodoCerrado.findMany({
    // Lo que ya terminó no afecta a ninguna cita futura.
    where: { profesional: { slug }, hasta: { gte: hoy } },
    select: { desde: true, hasta: true },
  });
  return periodos.flatMap((p) => diasDelPeriodo(p.desde, p.hasta));
}
