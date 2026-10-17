"use server";

/**
 * Guardar los precios y los datos del depósito.
 *
 * Va aparte de `precios.ts` porque aquel se lee desde páginas del servidor
 * y este es una acción del panel: mezclarlos obligaría a marcar como
 * acción todo lo que solo consulta.
 */

import { revalidatePath } from "next/cache";

import { guardarDatosBancarios, guardarPrecios } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: boolean; mensaje: string };

/** Tope de cordura: nadie cobra cien mil pesos al mes por un perfil. */
const MAXIMO_CENTAVOS = 10_000_000;

export async function guardarAjustesDeCobro(
  goldCentavos: number,
  premiumCentavos: number,
  bancarios: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (sesion?.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede cambiar los precios." };
  }

  for (const v of [goldCentavos, premiumCentavos]) {
    if (!Number.isInteger(v) || v <= 0 || v > MAXIMO_CENTAVOS) {
      return { ok: false, mensaje: "Revise los precios: deben ser cantidades en pesos." };
    }
  }

  await guardarPrecios(goldCentavos, premiumCentavos);
  await guardarDatosBancarios(bancarios.trim());

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "precios.cambiados",
      entidad: "ajuste",
      entidadId: "planes",
      detalle: `Gold ${goldCentavos / 100} · Premium ${premiumCentavos / 100}`,
    },
  });

  revalidatePath("/panel/cobros");
  revalidatePath("/planes");
  return { ok: true, mensaje: "Precios y datos de depósito guardados." };
}
