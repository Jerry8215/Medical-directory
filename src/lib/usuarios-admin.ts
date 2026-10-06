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
import { randomBytes } from "node:crypto";

import { cifrarClave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado =
  | { ok: true; mensaje: string; clave?: string }
  | { ok: false; mensaje: string };

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function claveNueva(): string {
  // Suficientemente larga para no adivinarse y corta para dictarla.
  return randomBytes(9).toString("base64url");
}

export async function crearAccesoProfesional(
  slug: string,
  correo: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede crear accesos." };
  }
  if (!CORREO.test(correo.trim())) {
    return { ok: false, mensaje: "Revise el correo: con ese entra al panel." };
  }

  const profesional = await prisma.profesional.findUnique({ where: { slug } });
  if (!profesional) return { ok: false, mensaje: "Ese profesional no existe." };

  const limpio = correo.trim().toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { correo: limpio } });

  const clave = claveNueva();

  if (existente) {
    // Reemitir la contraseña del mismo profesional es válido; apropiarse de
    // la cuenta de otro, no.
    if (existente.profesionalId && existente.profesionalId !== profesional.id) {
      return { ok: false, mensaje: "Ese correo ya tiene acceso a otro perfil." };
    }
    // Un administrador que use su propio correo acá se quedaría sin su
    // propio acceso: esta misma llamada le cambia la contraseña y lo baja a
    // profesional. Le pasó al dueño del directorio, que quedó fuera de su
    // panel por pulsar un botón que tenía derecho a pulsar.
    if (existente.rol === "ADMINISTRADOR" || existente.rol === "RECEPCION") {
      return {
        ok: false,
        mensaje:
          "Ese correo es el de un acceso del equipo y perdería su permiso de administrador. Use otro correo para el acceso del profesional.",
      };
    }
    await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        hashClave: cifrarClave(clave),
        profesionalId: profesional.id,
        rol: "PROFESIONAL",
        activo: true,
      },
    });
  } else {
    await prisma.usuario.create({
      data: {
        nombre: profesional.nombre,
        correo: limpio,
        hashClave: cifrarClave(clave),
        rol: "PROFESIONAL",
        profesionalId: profesional.id,
      },
    });
  }

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: existente ? "acceso.reemitido" : "acceso.creado",
      entidad: "profesional",
      entidadId: slug,
      detalle: limpio,
    },
  });

  revalidatePath("/panel");
  return {
    ok: true,
    mensaje: `Acceso listo para ${limpio}. Anote la contraseña: no se vuelve a mostrar.`,
    clave,
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

  const { claveCoincide } = await import("@/lib/auth");
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
