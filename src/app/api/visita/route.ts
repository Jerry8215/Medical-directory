import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Una visita al sitio.
 *
 * Cuenta visitantes y no páginas vistas: el navegador avisa una sola vez
 * por sesión, no en cada clic. La diferencia no es cosmética. Una base de
 * datos que escribe en cada página cargada es lo que agotó la cuota de
 * cómputo del directorio en octubre, y el número que el consultorio
 * quiere ver —cuánta gente entró hoy— es precisamente el de visitantes.
 *
 * El día se guarda a medianoche de Chihuahua. Guardarlo en UTC haría que
 * las visitas de la tarde contaran como del día siguiente.
 */
export const dynamic = "force-dynamic";

const ZONA = 6 * 60 * 60_000;

export async function POST() {
  const ahora = Date.now();
  const local = new Date(ahora - ZONA);
  const dia = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );

  try {
    await prisma.visitaDiaria.upsert({
      where: { dia },
      create: { dia, visitas: 1 },
      update: { visitas: { increment: 1 } },
    });
  } catch (error) {
    // Perder una visita no puede costarle la página al paciente.
    console.error("[visita] no se pudo contar", error);
  }

  return NextResponse.json({ ok: true });
}
