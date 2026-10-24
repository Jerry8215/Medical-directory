"use server";

/**
 * Entrar como paciente, con el correo y el WhatsApp y nada más.
 *
 * Un paciente no va a inventar y recordar una contraseña para escribirle
 * una vez a un médico. Pedírsela es perder a la mitad en la primera
 * pantalla: esta función compite con mandar un WhatsApp, no con llenar
 * un formulario.
 *
 * El correo se comprueba haciéndolo servir. Se manda un enlace y entra
 * quien lo recibe, que es la única prueba que hace falta de que la
 * dirección es suya. El WhatsApp se guarda porque es por donde el médico
 * lo va a localizar si hace falta, y porque identifica al paciente entre
 * visitas: una misma persona existe una sola vez aunque se atienda con
 * varios médicos.
 */

import { cookies } from "next/headers";

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import {
  COOKIE_PACIENTE,
  crearEnlace,
  DURACION_SEGUNDOS,
  emitirSesionPaciente,
  leerEnlace,
  leerSesionPaciente,
  type SesionPaciente,
} from "@/lib/sesion-paciente";
import { correoElectronico, nombreDePersona, telefonoMexicano } from "@/lib/validacion";

export type Resultado = { ok: boolean; mensaje: string };

/** Quién está del otro lado, si es que hay alguien. */
export async function pacienteActual(): Promise<SesionPaciente | null> {
  const almacen = await cookies();
  return leerSesionPaciente(
    almacen.get(COOKIE_PACIENTE)?.value,
    process.env.AUTH_SECRET,
  );
}

const ACUSE =
  "Le mandamos un enlace a su correo para entrar. Revise también la carpeta " +
  "de no deseados; vence en una hora.";

/**
 * Darse de alta o volver a entrar. Es la misma operación.
 *
 * No hay dos pantallas, una de registro y otra de acceso, porque para el
 * paciente no son dos cosas distintas: escribe sus datos y quiere entrar.
 * Si ya existía, se actualizan su nombre y su teléfono; si no, se crea.
 */
export async function pedirEntrada(datos: {
  nombre: string;
  correo: string;
  telefono: string;
}): Promise<Resultado> {
  const llave = process.env.AUTH_SECRET;
  if (!llave) {
    console.error("[paciente] falta AUTH_SECRET");
    return { ok: false, mensaje: "Esto no está configurado. Avise al consultorio." };
  }

  const nombre = nombreDePersona(datos.nombre, { minimoPalabras: 1 });
  if (!nombre.ok) return { ok: false, mensaje: nombre.motivo };

  const correo = correoElectronico(datos.correo);
  if (!correo.ok) {
    return { ok: false, mensaje: "Revise su correo: ahí le llega el enlace para entrar." };
  }

  const telefono = telefonoMexicano(datos.telefono);
  if (!telefono.ok) return { ok: false, mensaje: telefono.motivo };

  // El paciente existe una sola vez, identificado por su teléfono, para
  // que su historial no quede partido en dos.
  const paciente = await prisma.paciente.upsert({
    where: { telefono: telefono.valor },
    update: { nombre: nombre.valor, correo: correo.valor, bajaEn: null },
    create: {
      telefono: telefono.valor,
      nombre: nombre.valor,
      correo: correo.valor,
      consentimiento: new Date(),
    },
  });

  const enlace = urlAbsoluta(`/paciente/entrar/${crearEnlace(paciente.id, llave)}`);

  await enviarCorreo({
    para: correo.valor,
    asunto: `Su enlace para entrar · ${sitio.nombre}`,
    cuerpo: [
      `${nombre.valor}:`,
      "",
      "Entre aquí para abrir su consulta y ver sus conversaciones:",
      "",
      enlace,
      "",
      "El enlace vence en una hora. No hace falta contraseña: con este",
      "correo y su WhatsApp le generamos uno nuevo cuando lo necesite.",
      "",
      sitio.nombre,
    ].join("\n"),
  }).catch((error) => {
    console.error("[paciente] no se pudo enviar el enlace", error);
  });

  return { ok: true, mensaje: ACUSE };
}

/** Canjear el enlace del correo por una sesión. */
export async function entrarConEnlace(token: string): Promise<Resultado> {
  const llave = process.env.AUTH_SECRET;
  if (!llave) return { ok: false, mensaje: "Esto no está configurado." };

  const id = leerEnlace(token, llave);
  if (!id) {
    return {
      ok: false,
      mensaje: "Ese enlace venció o no es válido. Pida uno nuevo con su correo.",
    };
  }

  const paciente = await prisma.paciente.findUnique({ where: { id } });
  if (!paciente || paciente.bajaEn) {
    return { ok: false, mensaje: "Ese enlace ya no es válido." };
  }

  const almacen = await cookies();
  almacen.set(
    COOKIE_PACIENTE,
    emitirSesionPaciente({ id: paciente.id, nombre: paciente.nombre ?? "" }, llave),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DURACION_SEGUNDOS,
    },
  );

  return { ok: true, mensaje: "Listo." };
}

export async function salirComoPaciente(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE_PACIENTE);
}
