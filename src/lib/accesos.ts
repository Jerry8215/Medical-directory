/**
 * Alta del acceso de un médico.
 *
 * Vive en un módulo común y no en las acciones del panel porque hay dos
 * caminos que llegan hasta acá: el administrador que emite un acceso a
 * mano, y la publicación de un perfil, que lo crea sola al quedar
 * verificada la cédula. Si cada uno trajera su propia copia, bastaría con
 * corregir una para que la otra se quedara atrás.
 *
 * No comprueba permisos: eso le toca a quien llama, que es quien sabe en
 * nombre de quién está actuando. Por eso no es una acción de servidor.
 */

import { randomBytes } from "node:crypto";

import { cifrarClave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Larga para que no se adivine y corta para poder dictarla por teléfono. */
export function claveNueva(): string {
  return randomBytes(9).toString("base64url");
}

export type AltaDeAcceso =
  | { ok: true; clave: string; correo: string; nuevo: boolean }
  | { ok: false; mensaje: string };

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Crea o reemite el acceso de un profesional y devuelve su contraseña.
 *
 * La contraseña se devuelve una sola vez y no se guarda en claro: quien
 * llama decide si se la muestra en pantalla o se la manda por correo.
 */
export async function altaDeAcceso(
  profesionalId: string,
  correo: string,
): Promise<AltaDeAcceso> {
  const limpio = correo.trim().toLowerCase();
  if (!CORREO.test(limpio)) {
    return { ok: false, mensaje: "Revise el correo: con ese entra al panel." };
  }

  const existente = await prisma.usuario.findUnique({ where: { correo: limpio } });

  if (existente) {
    // Reemitir el acceso del mismo profesional es válido; apropiarse de la
    // cuenta de otro, no.
    if (existente.profesionalId && existente.profesionalId !== profesionalId) {
      return { ok: false, mensaje: "Ese correo ya tiene acceso a otro perfil." };
    }
    // Un administrador que use su propio correo acá se quedaría sin su
    // permiso y sin su contraseña, en la misma operación.
    if (existente.rol === "ADMINISTRADOR" || existente.rol === "RECEPCION") {
      return {
        ok: false,
        mensaje:
          "Ese correo es el de un acceso del equipo y perdería su permiso de administrador. Use otro correo para el acceso del profesional.",
      };
    }
  }

  const clave = claveNueva();

  if (existente) {
    await prisma.usuario.update({
      where: { id: existente.id },
      data: {
        hashClave: cifrarClave(clave),
        profesionalId,
        rol: "PROFESIONAL",
        activo: true,
      },
    });
    return { ok: true, clave, correo: limpio, nuevo: false };
  }

  const profesional = await prisma.profesional.findUnique({
    where: { id: profesionalId },
    select: { nombre: true },
  });
  if (!profesional) return { ok: false, mensaje: "Ese profesional no existe." };

  await prisma.usuario.create({
    data: {
      nombre: profesional.nombre,
      correo: limpio,
      hashClave: cifrarClave(clave),
      rol: "PROFESIONAL",
      profesionalId,
    },
  });
  return { ok: true, clave, correo: limpio, nuevo: true };
}
