"use server";

/**
 * Accesos del equipo y de cada profesional.
 *
 * La contraseña se genera acá y se muestra una sola vez: no se guarda en
 * claro ni se puede volver a consultar, así que si se pierde se emite otra.
 * Es la única forma honesta de entregar una contraseña por un medio que no
 * controlamos, como WhatsApp.
 */

import { revalidatePath } from "next/cache";

import { altaDeAcceso } from "@/lib/accesos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado =
  | { ok: true; mensaje: string; clave?: string }
  | { ok: false; mensaje: string };

export async function crearAccesoProfesional(
  slug: string,
  correo: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede crear accesos." };
  }

  const profesional = await prisma.profesional.findUnique({ where: { slug } });
  if (!profesional) return { ok: false, mensaje: "Ese profesional no existe." };

  const alta = await altaDeAcceso(profesional.id, correo);
  if (!alta.ok) return { ok: false, mensaje: alta.mensaje };

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: alta.nuevo ? "acceso.creado" : "acceso.reemitido",
      entidad: "profesional",
      entidadId: slug,
      detalle: alta.correo,
    },
  });

  revalidatePath("/panel");
  return {
    ok: true,
    mensaje: `Acceso listo para ${alta.correo}. Anote la contraseña: no se vuelve a mostrar.`,
    clave: alta.clave,
  };
}

/** Cambiar la propia contraseña. Nadie puede cambiar la de otro. */
export async function cambiarMiClave(
  actual: string,
  nueva: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, mensaje: "Su sesión expiró. Entre otra vez." };
  if (nueva.length < 10) {
    return { ok: false, mensaje: "La contraseña nueva debe tener al menos diez caracteres." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.id } });
  if (!usuario) return { ok: false, mensaje: "No encontramos su usuario." };

  const { cifrarClave, claveCoincide } = await import("@/lib/auth");
  if (!claveCoincide(actual, usuario.hashClave)) {
    return { ok: false, mensaje: "La contraseña actual no coincide." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { hashClave: cifrarClave(nueva) },
  });

  await prisma.registroAuditoria.create({
    data: { actor: usuario.correo, accion: "clave.cambiada" },
  });

  return { ok: true, mensaje: "Contraseña cambiada." };
}
