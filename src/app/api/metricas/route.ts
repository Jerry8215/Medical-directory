import { NextResponse, type NextRequest } from "next/server";

import { diaLocal, esTipo } from "@/lib/metricas";
import { prisma } from "@/lib/prisma";

/**
 * Registro de una visita o de un contacto.
 *
 * La página del perfil se sirve estática y cacheada, así que el servidor
 * no se entera de cada visita: tiene que avisar el navegador. Eso trae una
 * ventaja de regalo, y es que los rastreadores que no ejecutan JavaScript
 * no inflan el conteo.
 *
 * Es un endpoint público, como tiene que ser, así que no acepta un número
 * sino un hecho: suma uno y nada más. Lo peor que puede hacer alguien que
 * lo descubra es inflar sus propias visitas, que es el mismo daño que
 * recargando la página.
 */
export const dynamic = "force-dynamic";

export async function POST(peticion: NextRequest) {
  let cuerpo: unknown;
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { slug, tipo } = (cuerpo ?? {}) as { slug?: unknown; tipo?: unknown };
  if (typeof slug !== "string" || slug.length > 120 || !esTipo(tipo)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const profesional = await prisma.profesional.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!profesional) return NextResponse.json({ ok: false }, { status: 404 });

  const dia = diaLocal(new Date());
  const campo = tipo === "vista" ? "vistas" : tipo;

  // El upsert sobre el índice único es lo que permite que dos visitas
  // simultáneas sumen dos y no una.
  await prisma.metricaDiaria.upsert({
    where: { profesionalId_dia: { profesionalId: profesional.id, dia } },
    create: { profesionalId: profesional.id, dia, [campo]: 1 },
    update: { [campo]: { increment: 1 } },
  });

  return NextResponse.json({ ok: true });
}
