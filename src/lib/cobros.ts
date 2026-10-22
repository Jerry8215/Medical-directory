"use server";

/**
 * El ciclo de un cobro de suscripción.
 *
 * Hoy entra dinero por transferencia, que es lo que no depende de ningún
 * proveedor: el médico elige su plan, deposita, reporta su referencia y
 * alguien del consultorio la aprueba. El cobro con tarjeta se conecta
 * cuando exista la cuenta del procesador, y entra por la misma puerta:
 * `acreditar` es el único lugar que mueve la fecha de vencimiento, así que
 * agregar tarjeta no toca nada de lo que ya está probado.
 *
 * Una regla que atraviesa todo el archivo: el plan vencido nunca quita el
 * perfil del directorio, solo le retira las herramientas. Se cobra el
 * plan, no la presencia del médico.
 */

import { revalidatePath } from "next/cache";

import { acreditar } from "@/lib/acreditar";
import { anotar, resolver } from "@/lib/novedades";
import { precios } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { importe, mesesDe, pesos, type Periodicidad } from "@/lib/suscripciones";

import type { Plan } from "@/lib/planes";

export type Resultado =
  | { ok: true; mensaje: string; pagoId?: string }
  | { ok: false; mensaje: string };

/** Administrador o recepción: quien lleva la caja del directorio. */
async function equipo(): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  return s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION" ? { nombre: s.nombre } : null;
}

/** El propio médico, o alguien del equipo en su nombre. */
async function dueñoOEquipo(profesionalId: string): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  if (s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION") return { nombre: s.nombre };
  return s.profesionalId === profesionalId ? { nombre: s.nombre } : null;
}

/**
 * Elegir plan y generar el cobro por transferencia.
 *
 * No cambia el plan del perfil: solo lo hará el pago acreditado. Cobrar
 * primero y acreditar después es lo que evita que un perfil estrene
 * herramientas con un depósito que nunca llegó.
 */
export async function solicitarSuscripcion(
  profesionalId: string,
  plan: Plan,
  periodicidad: Periodicidad,
): Promise<Resultado> {
  const quien = await dueñoOEquipo(profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };
  if (plan === "BASICO") {
    return { ok: false, mensaje: "El plan básico no se cobra: es la presencia en el directorio." };
  }

  const profesional = await prisma.profesional.findUnique({ where: { id: profesionalId } });
  if (!profesional) return { ok: false, mensaje: "Ese profesional no existe." };

  // Un pago a medias por el mismo perfil se reemplaza: si cambió de
  // opinión antes de depositar, no tiene por qué arrastrar el anterior.
  await prisma.pago.updateMany({
    where: { profesionalId, estado: "PENDIENTE" },
    data: { estado: "RECHAZADO", detalle: "Reemplazado por una solicitud posterior." },
  });

  const tarifa = await precios();
  const pago = await prisma.pago.create({
    data: {
      profesionalId,
      plan,
      meses: mesesDe(periodicidad),
      importe: importe(plan, periodicidad, tarifa),
      medio: "TRANSFERENCIA",
      estado: "PENDIENTE",
    },
  });

  revalidatePath("/panel/cobros");
  return {
    ok: true,
    pagoId: pago.id,
    mensaje: `Listo. Deposite ${pesos(pago.importe)} y reporte su referencia para activar el plan.`,
  };
}

/** El médico reporta el comprobante de su depósito. */
export async function reportarComprobante(
  pagoId: string,
  referencia: string,
): Promise<Resultado> {
  const pago = await prisma.pago.findUnique({ where: { id: pagoId } });
  if (!pago) return { ok: false, mensaje: "Ese cobro no existe." };

  const quien = await dueñoOEquipo(pago.profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };
  if (pago.estado !== "PENDIENTE") {
    return { ok: false, mensaje: "Ese cobro ya no está esperando comprobante." };
  }
  if (referencia.trim().length < 4) {
    return { ok: false, mensaje: "Escriba la referencia o el folio de su depósito." };
  }

  await prisma.pago.update({
    where: { id: pagoId },
    data: { estado: "EN_REVISION", referencia: referencia.trim() },
  });

  const profesional = await prisma.profesional.findUnique({
    where: { id: pago.profesionalId },
    select: { nombre: true, slug: true },
  });

  await anotar({
    tipo: "SOLICITUD_ALTA",
    titulo: `${profesional?.nombre ?? "Un médico"} reportó un pago de ${pesos(pago.importe)}`,
    detalle: `Referencia ${referencia.trim()}. Falta aprobarlo para que su plan se active.`,
    enlace: "/panel/cobros",
    profesionalId: pago.profesionalId,
    // Para que el aviso se apague al acreditarlo o rechazarlo.
    referencia: pagoId,
  });

  revalidatePath("/panel/cobros");
  return { ok: true, mensaje: "Recibido. En cuanto se confirme el depósito, su plan queda activo." };
}

/**
 * Acreditar un pago: el único punto que mueve la fecha de vencimiento.
 *
 * Suma los meses al final de lo ya pagado, de modo que renovar antes de
 * tiempo no cueste los días que faltaban.
 */
export async function acreditarPago(pagoId: string): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede acreditar pagos." };
  return acreditar(pagoId, quien.nombre);
}

export async function rechazarPago(pagoId: string, motivo: string): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede rechazar pagos." };

  await prisma.pago.update({
    where: { id: pagoId },
    data: {
      estado: "RECHAZADO",
      detalle: motivo.trim() || "Sin motivo registrado.",
      revisadoPor: quien.nombre,
      revisadoEn: new Date(),
    },
  });

  await resolver(pagoId);

  revalidatePath("/panel/cobros");
  return { ok: true, mensaje: "Cobro rechazado. El plan del perfil no cambió." };
}

/**
 * Cortesía: se regala un periodo sin que entre dinero.
 *
 * Queda registrada como un pago de importe cero y medio CORTESIA, para que
 * el panel de cobros no mienta sobre cuánto se facturó.
 */
export async function darCortesia(
  profesionalId: string,
  plan: Plan,
  meses: number,
): Promise<Resultado> {
  const quien = await equipo();
  if (!quien) return { ok: false, mensaje: "Solo el equipo del consultorio puede dar cortesías." };
  if (plan === "BASICO") return { ok: false, mensaje: "El básico no necesita cortesía." };
  if (!Number.isInteger(meses) || meses < 1 || meses > 24) {
    return { ok: false, mensaje: "La cortesía va de uno a veinticuatro meses." };
  }

  const pago = await prisma.pago.create({
    data: { profesionalId, plan, meses, importe: 0, medio: "CORTESIA", estado: "PENDIENTE" },
  });
  return acreditar(pago.id, quien.nombre);
}

/**
 * El primer mes, de regalo.
 *
 * Es lo que permite que un médico estrene su plan completo antes de pagar
 * nada, que es la única forma de pedir dinero por algo que todavía no le
 * ha traído pacientes. Se concede una sola vez por perfil: se comprueba
 * que nunca haya tenido un periodo acreditado, de modo que nadie encadene
 * meses gratis cancelando y volviendo a empezar.
 *
 * Al vencer no hay cobro automático ni tarjeta guardada. El perfil vuelve
 * al básico y el médico decide si paga, que es lo honesto cuando quien
 * prueba no dejó un medio de pago.
 */
export async function estrenarMesGratis(
  profesionalId: string,
  plan: Plan,
): Promise<Resultado> {
  const quien = await dueñoOEquipo(profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };
  if (plan === "BASICO") {
    return { ok: false, mensaje: "El plan básico ya es gratuito y no necesita prueba." };
  }

  const yaTuvo = await prisma.pago.count({
    where: { profesionalId, estado: "ACREDITADO" },
  });
  if (yaTuvo > 0) {
    return {
      ok: false,
      mensaje: "Este perfil ya estrenó su mes de prueba. Elija un plan para continuar.",
    };
  }

  const pago = await prisma.pago.create({
    data: {
      profesionalId,
      plan,
      meses: 1,
      importe: 0,
      medio: "CORTESIA",
      estado: "PENDIENTE",
      detalle: "Primer mes de prueba, sin costo.",
    },
  });
  return acreditar(pago.id, quien.nombre);
}
