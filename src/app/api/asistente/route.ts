import { NextResponse, type NextRequest } from "next/server";

import { conversar, type Turno } from "@/lib/asistente/conversar";

/**
 * El asistente, para el chat del sitio.
 *
 * Límite simple por dirección: una conversación normal no manda treinta
 * mensajes por minuto, y sin tope cualquiera podría gastar el presupuesto
 * de inteligencia artificial del consultorio desde una pestaña.
 */
const VISITAS = new Map<string, { cuenta: number; desde: number }>();
const VENTANA = 60_000;
const MAXIMO = 20;

function excedido(quien: string): boolean {
  const ahora = Date.now();
  const previo = VISITAS.get(quien);
  if (!previo || ahora - previo.desde > VENTANA) {
    VISITAS.set(quien, { cuenta: 1, desde: ahora });
    return false;
  }
  previo.cuenta += 1;
  return previo.cuenta > MAXIMO;
}

export async function POST(peticion: NextRequest) {
  const quien =
    peticion.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "desconocido";

  if (excedido(quien)) {
    return NextResponse.json(
      { error: "Demasiados mensajes seguidos. Espere un momento." },
      { status: 429 },
    );
  }

  let cuerpo: { mensaje?: string; historial?: Turno[] };
  try {
    cuerpo = await peticion.json();
  } catch {
    return NextResponse.json({ error: "Petición no válida." }, { status: 400 });
  }

  const mensaje = (cuerpo.mensaje ?? "").trim().slice(0, 500);
  if (!mensaje) {
    return NextResponse.json({ error: "Escriba su mensaje." }, { status: 400 });
  }

  try {
    const respuesta = await conversar(mensaje, cuerpo.historial ?? []);
    return NextResponse.json(respuesta);
  } catch (error) {
    console.error("[asistente] falló", error);
    return NextResponse.json(
      {
        texto:
          "Disculpe, tuve un problema para responderle. Puede buscar al " +
          "especialista directamente en el directorio.",
        sugerencias: [],
        origen: "catalogo",
      },
      { status: 200 },
    );
  }
}
