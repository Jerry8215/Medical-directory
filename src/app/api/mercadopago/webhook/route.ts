import { NextResponse, type NextRequest } from "next/server";

import {
  consultarCobro,
  consultarSuscripcion,
  firmaConfigurada,
  firmaValida,
} from "@/lib/mercadopago";
import { prisma } from "@/lib/prisma";
import {
  cobrarPeriodoDeSuscripcion,
  marcarEstadoDeSuscripcion,
} from "@/lib/suscripcion-tarjeta";

export const dynamic = "force-dynamic";

/**
 * Los avisos del procesador de pagos.
 *
 * Es la única puerta por la que un cobro con tarjeta se convierte en
 * meses de plan, así que trabaja con tres cautelas:
 *
 *   1. Se comprueba la firma antes de leer nada. Sin eso, cualquiera que
 *      adivine esta dirección se regala un Premium con un POST.
 *   2. No se cree el contenido del aviso: solo se toma el identificador y
 *      se le vuelve a preguntar al procesador qué pasó. Lo que llega por
 *      la red es una pista, no un hecho.
 *   3. Se contesta 200 aunque algo falle de nuestro lado, salvo que
 *      convenga que lo reintenten. Un 500 por un aviso que no entendemos
 *      hace que el procesador lo repita durante días.
 */
export async function POST(peticion: NextRequest) {
  const url = new URL(peticion.url);
  const texto = await peticion.text();

  let cuerpo: { type?: string; topic?: string; data?: { id?: string } } = {};
  try {
    cuerpo = texto ? JSON.parse(texto) : {};
  } catch {
    return NextResponse.json({ error: "cuerpo ilegible" }, { status: 400 });
  }

  // El identificador viaja en el cuerpo o en la dirección, según el aviso.
  const dataId =
    cuerpo.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id");
  if (!dataId) {
    return NextResponse.json({ error: "aviso sin identificador" }, { status: 400 });
  }

  if (
    !firmaValida(
      String(dataId),
      peticion.headers.get("x-request-id"),
      peticion.headers.get("x-signature"),
    )
  ) {
    // 401 y no 400: que quede claro en los registros del procesador que lo
    // rechazamos por quién lo manda, no por cómo viene escrito.
    return NextResponse.json({ error: "firma no válida" }, { status: 401 });
  }

  const tipo = cuerpo.type ?? cuerpo.topic ?? url.searchParams.get("type") ?? "";

  try {
    if (tipo === "subscription_preapproval") {
      const suscripcion = await consultarSuscripcion(String(dataId));
      await marcarEstadoDeSuscripcion(suscripcion.id, suscripcion.status);
      return NextResponse.json({ atendido: "suscripcion", estado: suscripcion.status });
    }

    if (tipo === "subscription_authorized_payment") {
      const cobro = await consultarCobro(String(dataId));
      const resultado = await cobrarPeriodoDeSuscripcion({
        suscripcionId: cobro.preapproval_id,
        idExterno: String(cobro.payment?.id ?? cobro.id),
        aprobado:
          cobro.status === "processed" && (cobro.payment?.status ?? "approved") === "approved",
      });
      return NextResponse.json({ atendido: "cobro", ...resultado });
    }

    // Cualquier otro tipo se registra y se da por recibido: insistir con un
    // aviso que no nos toca no lo vuelve nuestro.
    await prisma.registroAuditoria.create({
      data: {
        actor: "mercadopago",
        accion: "webhook.ignorado",
        entidad: "pago",
        entidadId: String(dataId),
        detalle: tipo.slice(0, 120),
      },
    });
    return NextResponse.json({ atendido: "ninguno", tipo });
  } catch (error) {
    // Acá sí conviene el 500: el aviso era legítimo y no pudimos con él,
    // de modo que el reintento del procesador es lo que lo salva.
    console.error("[mercadopago] no se pudo atender el aviso", error);
    return NextResponse.json({ error: "no se pudo atender" }, { status: 500 });
  }
}

/**
 * El procesador comprueba la dirección con un GET antes de usarla.
 *
 * Devuelve si hay con qué firmar, que es el error de configuración que de
 * otro modo solo se descubre el día del primer cobro.
 */
export async function GET() {
  return NextResponse.json({ listo: firmaConfigurada() });
}
