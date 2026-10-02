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

import { prisma } from "@/lib/prisma";

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

const CEDULA = /^\d{6,9}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Diez dígitos, con o sin espacios, guiones o lada del país. */
function telefonoValido(valor: string): boolean {
  return /^\d{10}$/.test(valor.replace(/\D/g, "").replace(/^52/, ""));
}

export async function registrarSolicitud(datos: Solicitud): Promise<Resultado> {
  const errores: Partial<Record<keyof Solicitud, string>> = {};

  if (datos.nombre.trim().length < 5) {
    errores.nombre = "Escriba su nombre completo, como aparece en su cédula.";
  }
  if (!CORREO.test(datos.correo.trim())) {
    errores.correo = "Revise el correo: ahí le avisamos del resultado.";
  }
  if (!telefonoValido(datos.telefono)) {
    errores.telefono = "El teléfono debe tener diez dígitos.";
  }
  if (!CEDULA.test(datos.cedula.trim())) {
    errores.cedula = "La cédula profesional son de seis a nueve dígitos.";
  }
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
      nombre: datos.nombre.trim(),
      correo: datos.correo.trim(),
      telefono: datos.telefono.replace(/\D/g, ""),
      profesionSlug: especialidad.profesion.slug,
      especialidad: datos.especialidad,
      ciudadSlug: datos.ciudad,
      cedula: datos.cedula.trim(),
      consejo: datos.consejo?.trim() || null,
      consultorio: datos.consultorio?.trim() || null,
      mensaje: datos.mensaje?.trim() || null,
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: "sitio",
      accion: "solicitud.recibida",
      detalle: `${datos.nombre.trim()} · ${datos.especialidad} · ${datos.ciudad}`,
    },
  });

  revalidatePath("/panel");
  return { ok: true };
}
