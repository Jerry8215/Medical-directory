"use server";

/**
 * Pedir y usar el enlace para recuperar la contraseña.
 *
 * Dos cuidados que atraviesan el archivo.
 *
 * El primero: pedir el enlace responde siempre lo mismo, exista o no la
 * cuenta. Decir «ese correo no está registrado» le confirma a cualquiera
 * qué direcciones tienen acceso al panel, que es justo lo que no conviene
 * regalar en una pantalla pública.
 *
 * El segundo: el enlace no se guarda en ninguna parte. Va firmado con el
 * resumen de la contraseña actual, de modo que al cambiarla deja de
 * servir. Eso lo vuelve de un solo uso sin tabla y sin migración.
 */

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { cifrarClave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { crearToken, revisarToken, usuarioDelToken } from "@/lib/recuperacion";
import { correoElectronico } from "@/lib/validacion";

export type Resultado = { ok: boolean; mensaje: string };

/** Lo mismo para todos, exista la cuenta o no. */
const ACUSE =
  "Si esa dirección tiene una cuenta, le acabamos de enviar un enlace para " +
  "crear una contraseña nueva. Revise su correo, y también la carpeta de " +
  "no deseados. El enlace vence en una hora.";

export async function pedirRecuperacion(correo: string): Promise<Resultado> {
  const revision = correoElectronico(correo);
  if (!revision.ok) {
    return { ok: false, mensaje: "Escriba el correo con el que entra al panel." };
  }

  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    console.error("[recuperacion] falta AUTH_SECRET");
    return {
      ok: false,
      mensaje: "El panel no está configurado para esto. Avise al desarrollador.",
    };
  }

  const usuario = await prisma.usuario.findUnique({
    where: { correo: revision.valor },
  });

  // Se registra el intento aunque la cuenta no exista: si alguien prueba
  // cien direcciones, conviene que quede por escrito.
  await prisma.registroAuditoria.create({
    data: {
      actor: revision.valor,
      accion: "clave.recuperacion_pedida",
      detalle: usuario ? "cuenta encontrada" : "sin cuenta",
    },
  });

  if (!usuario || !usuario.activo) return { ok: true, mensaje: ACUSE };

  const token = crearToken(usuario.id, usuario.hashClave, secreto);
  const enlace = urlAbsoluta(`/panel/recuperar/${token}`);

  await enviarCorreo({
    para: usuario.correo,
    asunto: `Recuperar su contraseña · ${sitio.nombre}`,
    cuerpo: [
      `${usuario.nombre}:`,
      "",
      "Alguien pidió crear una contraseña nueva para su cuenta del panel.",
      "Si fue usted, entre aquí y elija la suya:",
      "",
      enlace,
      "",
      "El enlace vence en una hora y sirve una sola vez.",
      "",
      "Si no fue usted, no haga nada: su contraseña actual sigue funcionando",
      "y este enlace caduca solo.",
      "",
      sitio.nombre,
    ].join("\n"),
  }).catch((error) => {
    // El acuse en pantalla no cambia: decir que el envío falló revelaría
    // que la cuenta existe.
    console.error("[recuperacion] no se pudo enviar el enlace", error);
  });

  return { ok: true, mensaje: ACUSE };
}

export async function fijarClaveConToken(
  token: string,
  nueva: string,
): Promise<Resultado> {
  const secreto = process.env.AUTH_SECRET;
  if (!secreto) {
    return {
      ok: false,
      mensaje: "El panel no está configurado para esto. Avise al desarrollador.",
    };
  }

  // Se recorta en las dos puntas, igual que al entrar: una contraseña que
  // empieza o termina en espacio es un candado que se cierra solo.
  const limpia = nueva.trim();
  if (limpia.length < 10) {
    return { ok: false, mensaje: "La contraseña debe tener al menos diez caracteres." };
  }

  const id = usuarioDelToken(token);
  if (!id) return { ok: false, mensaje: "Ese enlace no es válido. Pida uno nuevo." };

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario || !usuario.activo) {
    return { ok: false, mensaje: "Ese enlace no es válido. Pida uno nuevo." };
  }

  const revision = revisarToken(token, usuario.hashClave, secreto);
  if (!revision.ok) {
    return {
      ok: false,
      mensaje:
        revision.motivo === "vencido"
          ? "Ese enlace venció. Pida uno nuevo y úselo dentro de la hora siguiente."
          : "Ese enlace ya se usó o dejó de ser válido. Pida uno nuevo.",
    };
  }

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { hashClave: cifrarClave(limpia) },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: usuario.correo,
      accion: "clave.recuperada",
      entidad: "usuario",
      entidadId: usuario.id,
    },
  });

  // Avisar siempre. Si el cambio no lo hizo el titular, este correo es lo
  // único que se lo dice a tiempo.
  await enviarCorreo({
    para: usuario.correo,
    asunto: `Su contraseña cambió · ${sitio.nombre}`,
    cuerpo: [
      `${usuario.nombre}:`,
      "",
      "La contraseña de su cuenta del panel acaba de cambiar.",
      "",
      "Si fue usted, no tiene que hacer nada más.",
      "Si no fue usted, avísenos de inmediato: alguien tuvo acceso a su correo.",
      "",
      `Entrar: ${urlAbsoluta("/panel/acceso")}`,
      "",
      sitio.nombre,
    ].join("\n"),
  }).catch(() => {
    // El cambio ya quedó hecho; que el aviso falle no puede deshacerlo.
  });

  return { ok: true, mensaje: "Listo. Ya puede entrar con su contraseña nueva." };
}
