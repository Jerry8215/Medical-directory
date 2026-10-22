"use server";

/**
 * Contratar y dar de baja el cobro con tarjeta, desde el panel del médico.
 *
 * Es la contraparte de `suscripcion-tarjeta.ts`: acá va lo que el médico
 * pide él mismo, con su sesión abierta; allá, lo que hace el procesador
 * cuando cobra. La separación no es de estilo: todo lo que se exporta de
 * este archivo queda invocable desde el navegador, así que lo que concede
 * meses de plan tiene que estar del otro lado.
 *
 * Ninguna de estas dos funciones cambia el plan del perfil. Contratar
 * crea un cobro esperando y manda al médico a autorizarlo; el plan lo
 * mueve el aviso del procesador cuando el dinero entró de verdad. Cobrar
 * primero y acreditar después es lo que evita que un perfil estrene
 * herramientas con una tarjeta que fue rechazada.
 */

import { revalidatePath } from "next/cache";

import { urlAbsoluta } from "@/config/sitio";
import {
  cancelarSuscripcion,
  configurado,
  crearSuscripcion,
} from "@/lib/mercadopago";
import { precios } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import {
  concepto,
  importe,
  mesesDe,
  pesos,
  type Periodicidad,
} from "@/lib/suscripciones";

import type { Plan } from "@/lib/planes";

export type Resultado =
  | { ok: true; mensaje: string; irA?: string }
  | { ok: false; mensaje: string };

/** El propio médico, o alguien del equipo en su nombre. */
async function dueñoOEquipo(profesionalId: string): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  if (s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION") return { nombre: s.nombre };
  return s.profesionalId === profesionalId ? { nombre: s.nombre } : null;
}

/** ¿Se puede ofrecer la tarjeta, o solo queda el depósito? */
export async function hayCobroConTarjeta(): Promise<boolean> {
  return configurado();
}

export async function contratarConTarjeta(
  profesionalId: string,
  plan: Plan,
  periodicidad: Periodicidad,
): Promise<Resultado> {
  const quien = await dueñoOEquipo(profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };
  if (plan === "BASICO") {
    return {
      ok: false,
      mensaje: "El plan básico no se cobra: es la presencia en el directorio.",
    };
  }
  if (!configurado()) {
    return {
      ok: false,
      mensaje: "El cobro con tarjeta todavía no está habilitado. Puede pagar por depósito.",
    };
  }

  const profesional = await prisma.profesional.findUnique({
    where: { id: profesionalId },
    select: { id: true, correo: true, suscripcionId: true, suscripcionEstado: true },
  });
  if (!profesional) return { ok: false, mensaje: "Ese profesional no existe." };
  if (!profesional.correo) {
    // El procesador le manda ahí el aviso de cada cobro, y es donde el
    // médico reclama si algo sale mal.
    return {
      ok: false,
      mensaje: "Antes cargue su correo en el perfil: ahí le llegan los avisos de cada cobro.",
    };
  }
  if (profesional.suscripcionId && profesional.suscripcionEstado === "authorized") {
    return {
      ok: false,
      mensaje: "Ya tiene una suscripción activa. Dé de baja la actual para contratar otra.",
    };
  }

  // Un cobro a medias por el mismo perfil se reemplaza: si cambió de
  // opinión antes de autorizar, no tiene por qué arrastrar el anterior.
  await prisma.pago.updateMany({
    where: { profesionalId, estado: "PENDIENTE" },
    data: { estado: "RECHAZADO", detalle: "Reemplazado por una solicitud posterior." },
  });

  // Y la suscripción anterior se da de baja en el procesador, no solo
  // acá. Si quedara viva, el médico podría volver al enlace viejo y
  // autorizarla: se le cobraría una suscripción que este perfil ya no
  // reconoce, y el aviso de ese cobro no encontraría a quién acreditarle
  // el mes. Dinero cobrado y plan sin activar.
  if (profesional.suscripcionId && profesional.suscripcionEstado !== "cancelled") {
    await cancelarSuscripcion(profesional.suscripcionId).catch((error) => {
      console.error("[suscripcion] no se pudo dar de baja la anterior", error);
    });
  }

  const tarifa = await precios();
  const centavos = importe(plan, periodicidad, tarifa);

  const pago = await prisma.pago.create({
    data: {
      profesionalId,
      plan,
      meses: mesesDe(periodicidad),
      importe: centavos,
      medio: "TARJETA",
      estado: "PENDIENTE",
    },
  });

  try {
    const suscripcion = await crearSuscripcion({
      pagoId: pago.id,
      concepto: concepto(plan, periodicidad),
      correo: profesional.correo,
      centavos,
      periodicidad,
      volverA: urlAbsoluta("/panel/mi-plan?suscripcion=listo"),
    });

    await prisma.$transaction([
      // La referencia ata el cobro a su suscripción: es con lo que el
      // aviso de vuelta encuentra qué saldar.
      prisma.pago.update({
        where: { id: pago.id },
        data: { referencia: suscripcion.id },
      }),
      prisma.profesional.update({
        where: { id: profesionalId },
        data: { suscripcionId: suscripcion.id, suscripcionEstado: suscripcion.status },
      }),
      prisma.registroAuditoria.create({
        data: {
          actor: quien.nombre,
          accion: "suscripcion.creada",
          entidad: "profesional",
          entidadId: profesionalId,
          detalle: `${plan} · ${pesos(centavos)} · ${suscripcion.id}`,
        },
      }),
    ]);

    revalidatePath("/panel/mi-plan");
    return {
      ok: true,
      irA: suscripcion.init_point,
      mensaje: "Lo llevamos a autorizar el cobro. Su plan se activa en cuanto el pago entre.",
    };
  } catch (error) {
    // El cobro queda rechazado y no colgando: un pago pendiente que el
    // médico no puede pagar solo estorba en el panel de cobros.
    await prisma.pago.update({
      where: { id: pago.id },
      data: { estado: "RECHAZADO", detalle: "No se pudo crear la suscripción." },
    });
    console.error("[suscripcion] no se pudo crear", error);
    return {
      ok: false,
      mensaje: "El procesador no respondió. Vuelva a intentarlo o pague por depósito.",
    };
  }
}

/**
 * Dar de baja el cobro automático.
 *
 * No devuelve dinero ni quita el plan: el médico conserva lo que ya pagó
 * hasta que venza, y al vencer el perfil vuelve al básico sin salir del
 * directorio. Cancelar es dejar de cobrar, no castigar.
 */
export async function darDeBajaSuscripcion(profesionalId: string): Promise<Resultado> {
  const quien = await dueñoOEquipo(profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };

  const profesional = await prisma.profesional.findUnique({
    where: { id: profesionalId },
    select: { suscripcionId: true, planHasta: true },
  });
  if (!profesional?.suscripcionId) {
    return { ok: false, mensaje: "Este perfil no tiene un cobro automático contratado." };
  }

  try {
    await cancelarSuscripcion(profesional.suscripcionId);
  } catch (error) {
    console.error("[suscripcion] no se pudo cancelar", error);
    return {
      ok: false,
      mensaje: "El procesador no respondió. Vuelva a intentarlo en unos minutos.",
    };
  }

  await prisma.$transaction([
    prisma.profesional.update({
      where: { id: profesionalId },
      data: { suscripcionEstado: "cancelled" },
    }),
    prisma.pago.updateMany({
      where: { profesionalId, medio: "TARJETA", estado: "PENDIENTE" },
      data: { estado: "RECHAZADO", detalle: "La suscripción se dio de baja." },
    }),
    prisma.registroAuditoria.create({
      data: {
        actor: quien.nombre,
        accion: "suscripcion.cancelada",
        entidad: "profesional",
        entidadId: profesionalId,
        detalle: profesional.suscripcionId,
      },
    }),
  ]);

  revalidatePath("/panel/mi-plan");
  return {
    ok: true,
    mensaje: profesional.planHasta
      ? `Listo, no se le vuelve a cobrar. Su plan sigue activo hasta el ${profesional.planHasta.toLocaleDateString("es-MX")}.`
      : "Listo, no se le vuelve a cobrar.",
  };
}
