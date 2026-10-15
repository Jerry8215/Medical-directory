/**
 * Los precios de los planes.
 *
 * Viven en los ajustes y no en el código porque al consultorio se le
 * prometió poder cambiarlos sin depender de nadie. Si el ajuste no existe
 * todavía, o trae algo que no es un número, se usan los de arranque: es
 * preferible cobrar el precio de lista que dejar la pantalla rota.
 */

import { prisma } from "@/lib/prisma";
import { PRECIOS_POR_OMISION, type Precios } from "@/lib/suscripciones";

const CLAVES = {
  GOLD: "precio_gold_mensual",
  PREMIUM: "precio_premium_mensual",
} as const;

/** Datos bancarios que se le muestran al médico para la transferencia. */
export const CLAVE_DATOS_BANCARIOS = "datos_bancarios";

function aEntero(valor: string | undefined, porOmision: number): number {
  const n = Number(valor);
  return Number.isInteger(n) && n > 0 ? n : porOmision;
}

export async function precios(): Promise<Precios> {
  const filas = await prisma.ajuste.findMany({
    where: { clave: { in: [CLAVES.GOLD, CLAVES.PREMIUM] } },
  });
  const mapa = new Map(filas.map((f) => [f.clave, f.valor]));
  return {
    GOLD: aEntero(mapa.get(CLAVES.GOLD), PRECIOS_POR_OMISION.GOLD),
    PREMIUM: aEntero(mapa.get(CLAVES.PREMIUM), PRECIOS_POR_OMISION.PREMIUM),
  };
}

export async function guardarPrecios(gold: number, premium: number): Promise<void> {
  await Promise.all([
    prisma.ajuste.upsert({
      where: { clave: CLAVES.GOLD },
      create: { clave: CLAVES.GOLD, valor: String(gold) },
      update: { valor: String(gold) },
    }),
    prisma.ajuste.upsert({
      where: { clave: CLAVES.PREMIUM },
      create: { clave: CLAVES.PREMIUM, valor: String(premium) },
      update: { valor: String(premium) },
    }),
  ]);
}

export async function datosBancarios(): Promise<string> {
  const a = await prisma.ajuste.findUnique({ where: { clave: CLAVE_DATOS_BANCARIOS } });
  return a?.valor ?? "";
}

export async function guardarDatosBancarios(texto: string): Promise<void> {
  await prisma.ajuste.upsert({
    where: { clave: CLAVE_DATOS_BANCARIOS },
    create: { clave: CLAVE_DATOS_BANCARIOS, valor: texto },
    update: { valor: texto },
  });
}
