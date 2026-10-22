/**
 * Lo que pasa cuando el procesador cobra la tarjeta.
 *
 * Vive fuera de los archivos de acciones a propósito. Todo lo que se
 * exporta desde un `"use server"` queda invocable desde el navegador, y
 * acá hay funciones que conceden meses de suscripción: colgarlas de una
 * dirección pública sería regalar planes a quien sepa escribir un POST.
 * Solo las llama el webhook, que primero comprueba la firma.
 *
 * El acreditamiento no se reimplementa: termina en `acreditar`, que sigue
 * siendo el único lugar donde se mueve la fecha de vencimiento, venga el
 * dinero de una transferencia, de una cortesía o de una tarjeta.
 */

import { acreditar } from "@/lib/acreditar";
import { prisma } from "@/lib/prisma";

/** Lo último que el procesador dijo de una suscripción. */
export async function marcarEstadoDeSuscripcion(
  suscripcionId: string,
  estado: string,
): Promise<{ profesional: string | null }> {
  const profesional = await prisma.profesional.findUnique({
    where: { suscripcionId },
    select: { id: true, nombre: true },
  });
  if (!profesional) return { profesional: null };

  await prisma.profesional.update({
    where: { id: profesional.id },
    data: { suscripcionEstado: estado },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: "mercadopago",
      accion: "suscripcion.estado",
      entidad: "profesional",
      entidadId: profesional.id,
      detalle: `${suscripcionId} · ${estado}`,
    },
  });

  return { profesional: profesional.nombre };
}

export type ResultadoDeCobro = {
  /** El aviso ya se había atendido: llegó repetido. */
  repetido?: boolean;
  acreditado?: boolean;
  motivo?: string;
};

/**
 * Un cobro de la suscripción se convierte en meses de plan.
 *
 * Tres cosas que importan acá:
 *
 *   · El primer cobro salda el pago que quedó pendiente al contratar; los
 *     siguientes nacen como pagos nuevos con el mismo plan e importe, de
 *     modo que el panel de cobros muestre la historia completa y no un
 *     solo renglón que se va actualizando.
 *   · `idExterno` es único en la base. Los webhooks se reintentan y
 *     llegan repetidos; sin eso, el mismo cobro acreditaría dos veces y la
 *     suscripción ganaría un mes que nadie pagó.
 *   · Un cobro rechazado no quita el plan. El médico conserva lo que ya
 *     pagó hasta que venza, y recién entonces el perfil vuelve al básico,
 *     sin salir del directorio.
 */
export async function cobrarPeriodoDeSuscripcion(datos: {
  suscripcionId: string;
  idExterno: string;
  aprobado: boolean;
}): Promise<ResultadoDeCobro> {
  const profesional = await prisma.profesional.findUnique({
    where: { suscripcionId: datos.suscripcionId },
    select: { id: true, nombre: true },
  });
  if (!profesional) {
    return { motivo: "esa suscripción no corresponde a ningún perfil" };
  }

  const yaAtendido = await prisma.pago.findUnique({
    where: { idExterno: datos.idExterno },
    select: { id: true, estado: true },
  });
  if (yaAtendido) {
    return { repetido: true, acreditado: yaAtendido.estado === "ACREDITADO" };
  }

  if (!datos.aprobado) {
    await prisma.registroAuditoria.create({
      data: {
        actor: "mercadopago",
        accion: "suscripcion.cobro_rechazado",
        entidad: "profesional",
        entidadId: profesional.id,
        detalle: `${datos.suscripcionId} · cobro ${datos.idExterno}`,
      },
    });
    return { acreditado: false, motivo: "el cobro no quedó aprobado" };
  }

  // El pago que quedó esperando al contratar, si es el primer cobro.
  const pendiente = await prisma.pago.findFirst({
    where: {
      profesionalId: profesional.id,
      medio: "TARJETA",
      estado: "PENDIENTE",
      referencia: datos.suscripcionId,
    },
    orderBy: { creadoEn: "desc" },
  });

  let pagoId: string;
  if (pendiente) {
    await prisma.pago.update({
      where: { id: pendiente.id },
      data: { idExterno: datos.idExterno },
    });
    pagoId = pendiente.id;
  } else {
    // Una renovación: se copia el último cobro acreditado de esta misma
    // suscripción, que es lo que el médico aceptó que se le cobrara.
    const anterior = await prisma.pago.findFirst({
      where: {
        profesionalId: profesional.id,
        medio: "TARJETA",
        estado: "ACREDITADO",
        referencia: datos.suscripcionId,
      },
      orderBy: { creadoEn: "desc" },
    });
    if (!anterior) {
      return { motivo: "no hay un cobro anterior del que copiar el plan" };
    }

    const nuevo = await prisma.pago.create({
      data: {
        profesionalId: profesional.id,
        plan: anterior.plan,
        meses: anterior.meses,
        importe: anterior.importe,
        medio: "TARJETA",
        estado: "PENDIENTE",
        referencia: datos.suscripcionId,
        idExterno: datos.idExterno,
        detalle: "Renovación automática de la suscripción.",
      },
    });
    pagoId = nuevo.id;
  }

  const resultado = await acreditar(pagoId, "Mercado Pago");
  return { acreditado: resultado.ok, motivo: resultado.ok ? undefined : resultado.mensaje };
}
