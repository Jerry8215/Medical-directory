"use server";

import { revalidatePath } from "next/cache";

import { marcarLeidas } from "@/lib/novedades";
import { sesionActual } from "@/lib/sesion-actual";

/** Marcar novedades como vistas. Solo desde el panel, con sesión abierta. */
export async function marcarComoVistas(ids: string[]): Promise<{ ok: boolean }> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false };

  await marcarLeidas(ids);
  revalidatePath("/panel");
  return { ok: true };
}
