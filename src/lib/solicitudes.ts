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

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
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
  /** La que emite la SEP al terminar la residencia. */
  cedulaEspecialidad?: string;
  consejo?: string;
  consultorio?: string;
  mensaje?: string;
  /** El plan que eligió antes de llenar el formulario. */
  plan?: "BASICO" | "GOLD" | "PREMIUM";
  /** MENSUAL o ANUAL, solo para los de pago. */
  periodicidad?: string;
  /** Referencia del depósito, si la reportó al registrarse. */
  referenciaPago?: string;
};

export type Resultado =
  /** `duplicada` cuando ya había una solicitud suya esperando revisión. */
  | { ok: true; duplicada?: boolean }
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

  // Una misma persona registrándose cuatro veces en tres minutos no está
  // insistiendo: está comprobando si funcionó, porque la pantalla no se
  // lo dejó claro. El panel no tiene por qué llenarse de copias por eso.
  const yaEstaba = await prisma.solicitudAlta.findFirst({
    where: {
      estado: { in: ["RECIBIDA", "EN_VERIFICACION"] },
      OR: [
        { cedula: cedula.ok ? cedula.valor : datos.cedula.trim() },
        { correo: correo.ok ? correo.valor : datos.correo.trim() },
      ],
    },
    select: { id: true },
  });

  if (yaEstaba) {
    return {
      ok: true,
      duplicada: true,
    };
  }

  const solicitud = await prisma.solicitudAlta.create({
    data: {
      nombre: nombre.ok ? nombre.valor : datos.nombre.trim(),
      correo: correo.ok ? correo.valor : datos.correo.trim(),
      telefono: telefono.ok ? telefono.valor : datos.telefono.replace(/\D/g, ""),
      profesionSlug: especialidad.profesion.slug,
      especialidad: datos.especialidad,
      ciudadSlug: datos.ciudad,
      cedula: cedula.ok ? cedula.valor : datos.cedula.trim(),
      cedulaEspecialidad: datos.cedulaEspecialidad?.trim() || null,
      consejo: datos.consejo?.trim() || null,
      consultorio: datos.consultorio?.trim() || null,
      mensaje: datos.mensaje?.trim() || null,
      plan: datos.plan ?? "BASICO",
      periodicidad: datos.periodicidad ?? null,
      referenciaPago: datos.referenciaPago?.trim() || null,
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
    // Para que el aviso se apague solo al aprobarla o rechazarla.
    referencia: solicitud.id,
  });

  // Acuse al médico. Hasta ahora mandaba su solicitud y no recibía nada:
  // ni confirmación de que llegó, ni idea de qué sigue ni de cuánto
  // tarda. Quien se registra de noche y no ve nada en su buzón concluye
  // que el formulario falló, y vuelve a mandarlo.
  await enviarCorreo({
    para: correo.ok ? correo.valor : datos.correo.trim(),
    asunto: `${nombre.ok ? nombre.valor : datos.nombre}: recibimos su solicitud · ${sitio.nombre}`,
    cuerpo: [
      `Doctor(a) ${nombre.ok ? nombre.valor : datos.nombre}:`,
      "",
      "Su solicitud quedó recibida. Todavía no aparece en el directorio:",
      "falta que revisemos su cédula en el Registro Nacional de",
      "Profesionistas, que es un paso manual y normalmente toma el mismo",
      "día hábil.",
      "",
      "Esto fue lo que nos dejó:",
      `  Especialidad: ${especialidad.nombre}`,
      `  Ciudad: ${datos.ciudad}`,
      `  Cédula profesional: ${cedula.ok ? cedula.valor : datos.cedula}`,
      "",
      "En cuanto quede aprobada le escribimos a este mismo correo con su",
      "acceso para administrar su perfil. No hace falta que haga nada más.",
      "",
      `Si algo de lo anterior está mal, responda a este correo: ${urlAbsoluta("/")}`,
    ].join("\n"),
  }).catch((error) => {
    // Su solicitud ya quedó guardada: que el acuse falle no puede
    // deshacerla, pero sí tiene que dejar rastro.
    console.error("[alta] no se pudo enviar el acuse", error);
  });

  revalidatePath("/panel");
  return { ok: true };
}
