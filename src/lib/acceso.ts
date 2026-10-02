"use server";

/**
 * Entrar y salir del panel.
 *
 * Un mensaje único para usuario inexistente y clave incorrecta: decir cuál
 * de los dos falló le confirma a un desconocido qué correos existen.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { claveCoincide, COOKIE, DURACION_SEGUNDOS, emitirSesion, type Rol } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type Resultado = { ok: false; mensaje: string } | { ok: true };

export async function entrar(correo: string, clave: string): Promise<Resultado> {
  const usuario = await prisma.usuario.findUnique({
    where: { correo: correo.trim().toLowerCase() },
  });

  if (!usuario || !usuario.activo || !claveCoincide(clave, usuario.hashClave)) {
    return { ok: false, mensaje: "Correo o contraseña incorrectos." };
  }

  const cookie = emitirSesion({
    id: usuario.id,
    nombre: usuario.nombre,
    rol: usuario.rol as Rol,
    profesionalId: usuario.profesionalId ?? undefined,
  });

  if (!cookie) {
    return {
      ok: false,
      mensaje: "El panel no está configurado para iniciar sesión. Avise al desarrollador.",
    };
  }

  const almacen = await cookies();
  almacen.set(COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SEGUNDOS,
  });

  await prisma.registroAuditoria.create({
    data: { actor: usuario.correo, accion: "sesion.iniciada" },
  });

  return { ok: true };
}

export async function salir(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE);
  redirect("/panel/acceso");
}
