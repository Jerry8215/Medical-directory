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

import { sitio, urlAbsoluta } from "@/config/sitio";
import { altaDeAcceso } from "@/lib/accesos";
import { enviarCorreo } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado =
  | { ok: true; mensaje: string; clave?: string; porCorreo?: boolean }
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

  // El correo también sale de aquí. Antes solo se enviaba al aprobar el
  // alta, de modo que si aquel se perdía no había forma de reintentarlo:
  // el administrador se quedaba con la contraseña en pantalla y el médico
  // sin nada en su buzón.
  let salioElCorreo = false;
  try {
    await enviarCorreo({
      para: alta.correo,
      asunto: `${profesional.nombre}: su acceso a ${sitio.nombre}`,
      cuerpo: [
        `Doctor(a) ${profesional.nombre}:`,
        "",
        "Estos son sus datos para entrar a administrar su perfil.",
        "",
        `Entre aquí: ${urlAbsoluta("/panel/acceso")}`,
        `Correo: ${alta.correo}`,
        `Contraseña: ${alta.clave}`,
        "",
        "Le recomendamos cambiarla desde «Mi contraseña» en cuanto entre.",
      ].join("\n"),
    });
    salioElCorreo = true;
  } catch (error) {
    console.error("[acceso] no se pudo enviar la contraseña", error);
  }

  revalidatePath("/panel");
  return {
    ok: true,
    mensaje: salioElCorreo
      ? `Acceso listo y enviado a ${alta.correo}. La contraseña va abajo por si no llega.`
      : `Acceso listo para ${alta.correo}, pero el correo no salió: entrégesela usted.`,
    clave: alta.clave,
    porCorreo: salioElCorreo,
  };
}

/** Cambiar la propia contraseña. Nadie puede cambiar la de otro. */
export async function cambiarMiClave(
  actual: string,
  nueva: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, mensaje: "Su sesión expiró. Entre otra vez." };
  // Se recorta al fijarla y al entrar, en las dos puntas: una contraseña
  // que empieza o termina en espacio es un candado que se cierra solo.
  const limpia = nueva.trim();
  if (limpia.length < 10) {
    return { ok: false, mensaje: "La contraseña nueva debe tener al menos diez caracteres." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: sesion.id } });
  if (!usuario) return { ok: false, mensaje: "No encontramos su usuario." };

  const { cifrarClave, claveCoincide } = await import("@/lib/auth");
  if (!claveCoincide(actual.trim(), usuario.hashClave)) {
    return { ok: false, mensaje: "La contraseña actual no coincide." };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { hashClave: cifrarClave(limpia) },
  });

  await prisma.registroAuditoria.create({
    data: { actor: usuario.correo, accion: "clave.cambiada" },
  });

  return { ok: true, mensaje: "Contraseña cambiada." };
}
