import { NextResponse, type NextRequest } from "next/server";

import { procesarAvisos, recordarCitasDeManana } from "@/lib/avisos";

/**
 * Tareas programadas.
 *
 * Vercel la invoca por horario; la llave evita que cualquiera la dispare
 * desde fuera. Hace dos cosas: preparar los recordatorios de las citas de
 * mañana y vaciar la cola de avisos pendientes.
 */
export async function GET(peticion: NextRequest) {
  const llave = process.env.CRON_SECRET;
  const cabecera = peticion.headers.get("authorization");

  if (!llave || cabecera !== `Bearer ${llave}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }

  const recordatorios = await recordarCitasDeManana();
  const avisos = await procesarAvisos();

  return NextResponse.json({ ...recordatorios, ...avisos, cuando: new Date().toISOString() });
}
