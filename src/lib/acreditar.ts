/**
 * Acreditar un pago: el único punto que mueve la fecha de vencimiento.
 *
 * Vive en su propio módulo y no dentro de `cobros.ts` por la misma razón
 * que el comprobador de permisos vive aparte: `cobros.ts` es un archivo de
 * acciones de servidor, y todo lo que exporta queda invocable desde el
 * navegador. Una función que concede meses de suscripción es lo último que
 * uno quiere colgado de una dirección pública.
 *
 * Hay tres puertas legítimas hacia acá —el consultorio que aprueba un
 * depósito, el médico que estrena su mes de prueba y el webhook del
 * procesador cuando cobra la tarjeta— y las tres pasan por esta función,
 * de modo que no hay tres maneras distintas de calcular hasta cuándo
 * queda pagado.
 */

import { revalidatePath } from "next/cache";

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { resolver } from "@/lib/novedades";
import { prisma } from "@/lib/prisma";
import { refrescarDirectorio } from "@/lib/refrescar";
import {
  concepto,
  folio,
  nuevoVencimiento,
  pesos,
  type Periodicidad,
} from "@/lib/suscripciones";

export type Resultado =
  | { ok: true; mensaje: string; pagoId?: string }
  | { ok: false; mensaje: string };

export async function acreditar(pagoId: string, porQuien: string): Promise<Resultado> {
  const quien = { nombre: porQuien };

  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: { profesional: { select: { nombre: true, correo: true, planHasta: true } } },
  });
  if (!pago) return { ok: false, mensaje: "Ese cobro no existe." };
  if (pago.estado === "ACREDITADO") return { ok: false, mensaje: "Ese pago ya estaba acreditado." };

  const ahora = new Date();
  const desde = pago.profesional.planHasta && pago.profesional.planHasta > ahora
    ? pago.profesional.planHasta
    : ahora;
  const hasta = nuevoVencimiento(pago.profesional.planHasta, pago.meses, ahora);

  // El folio es correlativo por año y solo lo consumen los pagos que de
  // verdad se acreditaron.
  const anio = ahora.getUTCFullYear();
  const acreditadosEsteAnio = await prisma.pago.count({
    where: { estado: "ACREDITADO", folio: { startsWith: `MD-${anio}-` } },
  });

  await prisma.$transaction([
    prisma.pago.update({
      where: { id: pagoId },
      data: {
        estado: "ACREDITADO",
        folio: folio(anio, acreditadosEsteAnio + 1),
        periodoDesde: desde,
        periodoHasta: hasta,
        revisadoPor: quien.nombre,
        revisadoEn: ahora,
      },
    }),
    prisma.profesional.update({
      where: { id: pago.profesionalId },
      data: { plan: pago.plan, planHasta: hasta },
    }),
    prisma.registroAuditoria.create({
      data: {
        actor: quien.nombre,
        accion: "pago.acreditado",
        entidad: "pago",
        entidadId: pagoId,
        detalle: `${pago.plan} · ${pesos(pago.importe)} · vence ${hasta.toISOString().slice(0, 10)}`,
      },
    }),
  ]);

  await enviarRecibo(pagoId);

  // Ya se revisó el depósito: el panel no tiene por qué seguir pidiéndolo.
  await resolver(pagoId);

  revalidatePath("/panel/cobros");
  revalidatePath("/panel");
  // El plan enciende la fotografía, el WhatsApp y la agenda en el perfil
  // público. Sin esto, el médico pagaba y seguía viéndose igual hasta que
  // venciera la copia guardada: media hora de parecer que no sirvió.
  const suyo = await prisma.profesional.findUnique({
    where: { id: pago.profesionalId },
    select: { slug: true },
  });
  refrescarDirectorio(suyo?.slug);
  return {
    ok: true,
    mensaje: `Acreditado. El plan ${pago.plan} queda vigente hasta el ${hasta.toLocaleDateString("es-MX")}.`,
  };
}

/** El recibo que se le manda al médico cuando su pago queda acreditado. */
async function enviarRecibo(pagoId: string): Promise<void> {
  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: { profesional: { select: { nombre: true, correo: true } } },
  });
  if (!pago?.profesional.correo || !pago.folio || !pago.periodoHasta) return;

  const periodicidad: Periodicidad = pago.meses >= 12 ? "ANUAL" : "MENSUAL";
  await enviarCorreo({
    para: pago.profesional.correo,
    asunto: `Recibo ${pago.folio} · ${sitio.nombre}`,
    cuerpo: [
      `Doctor(a) ${pago.profesional.nombre}:`,
      "",
      "Su pago quedó acreditado y su plan está activo.",
      "",
      `Folio: ${pago.folio}`,
      `Concepto: ${concepto(pago.plan, periodicidad)}`,
      `Importe: ${pago.medio === "CORTESIA" ? "Cortesía del directorio" : pesos(pago.importe)}`,
      `Vigente hasta: ${pago.periodoHasta.toLocaleDateString("es-MX")}`,
      "",
      `Su perfil: ${urlAbsoluta("/panel")}`,
    ].join("\n"),
  }).catch(() => {
    // Un recibo que no sale no puede tumbar un pago que sí entró.
  });
}
