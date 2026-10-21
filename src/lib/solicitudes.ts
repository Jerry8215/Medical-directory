"use server";

/**
 * Solicitudes de alta de profesionales.
 *
 * La solicitud se guarda aparte del padrón a propósito: hasta que alguien
 * verifica la cédula no hay perfil, solo una solicitud. Así el directorio
 * publicado nunca contiene nada sin revisar, que es justamente lo que se le
 * promete al paciente.
 */

import { revalidatePath } from "next/cache";

import { anotar } from "@/lib/novedades";
import { prisma } from "@/lib/prisma";
import {
  cedulaProfesional,
  correoElectronico,
  nombreDePersona,
  telefonoMexicano,
} from "@/lib/validacion";

export type Solicitud = {
  nombre: string;
  correo: string;
  telefono: string;
  especialidad: string;
  ciudad: string;
  cedula: string;
  consejo?: string;
  consultorio?: string;
  mensaje?: string;
};

export type Resultado =
  | { ok: true }
  | { ok: false; errores: Partial<Record<keyof Solicitud, string>> };

export async function registrarSolicitud(datos: Solicitud): Promise<Resultado> {
  const errores: Partial<Record<keyof Solicitud, string>> = {};

  // El nombre se publica en el perfil y en la agenda, así que se revisa de
  // verdad: sin números, sin símbolos y con nombre y apellido.
  const nombre = nombreDePersona(datos.nombre);
  if (!nombre.ok) errores.nombre = nombre.motivo;

  const correo = correoElectronico(datos.correo);
  if (!correo.ok) errores.correo = "Revise el correo: ahí le avisamos del resultado.";

  const telefono = telefonoMexicano(datos.telefono);
  if (!telefono.ok) errores.telefono = telefono.motivo;

  const cedula = cedulaProfesional(datos.cedula);
  if (!cedula.ok) errores.cedula = cedula.motivo;

  if (!datos.especialidad) {
    errores.especialidad = "Elija su especialidad.";
  }
  if (!datos.ciudad) {
    errores.ciudad = "Elija la ciudad donde atiende.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  const especialidad = await prisma.especialidad.findUnique({
    where: { slug: datos.especialidad },
    include: { profesion: true },
  });

  if (!especialidad) {
    return {
      ok: false,
      errores: { especialidad: "Esa especialidad ya no está disponible." },
    };
  }

  await prisma.solicitudAlta.create({
    data: {
      nombre: nombre.ok ? nombre.valor : datos.nombre.trim(),
      correo: correo.ok ? correo.valor : datos.correo.trim(),
      telefono: telefono.ok ? telefono.valor : datos.telefono.replace(/\D/g, ""),
      profesionSlug: especialidad.profesion.slug,
      especialidad: datos.especialidad,
      ciudadSlug: datos.ciudad,
      cedula: cedula.ok ? cedula.valor : datos.cedula.trim(),
      consejo: datos.consejo?.trim() || null,
      consultorio: datos.consultorio?.trim() || null,
      mensaje: datos.mensaje?.trim() || null,
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: "sitio",
      accion: "solicitud.recibida",
      detalle: `${nombre.ok ? nombre.valor : ""} · ${datos.especialidad} · ${datos.ciudad}`,
    },
  });

  await anotar({
    tipo: "SOLICITUD_ALTA",
    titulo: `${nombre.ok ? nombre.valor : datos.nombre} quiere aparecer en el directorio`,
    detalle: `${especialidad.nombre} · ${datos.ciudad} · cédula ${
      cedula.ok ? cedula.valor : ""
    }`,
    enlace: "/panel/solicitudes",
  });

  revalidatePath("/panel");
  return { ok: true };
}
