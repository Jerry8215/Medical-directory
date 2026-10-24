"use server";

/**
 * Invitar a opinar a un paciente que no agendó por el sitio.
 *
 * La opinión quedó atada al enlace de la cita, que es lo que demuestra
 * que la consulta existió. Eso resolvió que cualquiera pudiera opinar sin
 * haber sido paciente, pero dejó fuera a la mayoría: quien agendó por
 * teléfono, por WhatsApp o llegó al mostrador no tiene enlace, y el
 * consultorio se quedó sin manera de pedirle su reseña. Con la vara tan
 * alta, conseguir una opinión pasó de difícil a casi imposible.
 *
 * Este es el término medio. La invitación la emite el consultorio a
 * nombre de un paciente concreto, sirve una sola vez y queda registrada
 * con quién la generó. No es tan fuerte como una cita agendada por el
 * sitio —la respalda una persona, no el sistema— y por eso la moderación
 * las distingue: la reseña dirá «invitada por el consultorio» y no «se
 * atendió el 22 de octubre». Quien revisa decide con esa diferencia a la
 * vista.
 */

import { revalidatePath } from "next/cache";

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { nombreDePersona } from "@/lib/validacion";

export type Resultado =
  | { ok: true; mensaje: string; enlace: string; porCorreo: boolean }
  | { ok: false; mensaje: string };

/** El propio médico, o alguien del equipo en su nombre. */
async function dueñoOEquipo(profesionalId: string): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  if (s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION") return { nombre: s.nombre };
  return s.profesionalId === profesionalId ? { nombre: s.nombre } : null;
}

export async function invitarAOpinar(datos: {
  profesionalId: string;
  paciente: string;
  contacto?: string;
  atendidoEn?: string;
  nota?: string;
}): Promise<Resultado> {
  const quien = await dueñoOEquipo(datos.profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para esta operación." };

  const nombre = nombreDePersona(datos.paciente, { minimoPalabras: 1 });
  if (!nombre.ok) return { ok: false, mensaje: nombre.motivo };

  const profesional = await prisma.profesional.findUnique({
    where: { id: datos.profesionalId },
    select: { nombre: true, slug: true },
  });
  if (!profesional) return { ok: false, mensaje: "Ese perfil ya no existe." };

  const contacto = datos.contacto?.trim() || null;
  const atendido = datos.atendidoEn ? new Date(`${datos.atendidoEn}T12:00:00Z`) : null;

  const invitacion = await prisma.invitacionOpinion.create({
    data: {
      profesionalId: datos.profesionalId,
      paciente: nombre.valor,
      contacto,
      atendidoEn: Number.isNaN(atendido?.getTime()) ? null : atendido,
      nota: datos.nota?.trim() || null,
      emitidaPor: quien.nombre,
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "opinion.invitada",
      entidad: "profesional",
      entidadId: profesional.slug,
      detalle: `${nombre.valor}${contacto ? ` · ${contacto}` : ""}`,
    },
  });

  const enlace = urlAbsoluta(`/opinar/invitacion/${invitacion.id}`);

  // Si el contacto es un correo, se lo mandamos nosotros. Si es un
  // teléfono, el consultorio lo pega en su WhatsApp: mandar un mensaje
  // por una cuenta que todavía no existe sería prometer de más.
  let porCorreo = false;
  if (contacto?.includes("@")) {
    try {
      await enviarCorreo({
        para: contacto,
        asunto: `¿Cómo le fue con ${profesional.nombre}?`,
        cuerpo: [
          `${nombre.valor}:`,
          "",
          `Se atendió con ${profesional.nombre} y su opinión le sirve al`,
          "siguiente paciente que esté decidiendo. Son dos minutos:",
          "",
          enlace,
          "",
          "Se publica después de una revisión. El enlace es suyo y sirve",
          "una sola vez.",
          "",
          sitio.nombre,
        ].join("\n"),
      });
      porCorreo = true;
    } catch (error) {
      console.error("[opinion] no se pudo enviar la invitación", error);
    }
  }

  revalidatePath(`/panel/profesionales/${profesional.slug}`);
  return {
    ok: true,
    enlace,
    porCorreo,
    mensaje: porCorreo
      ? `Invitación enviada a ${contacto}. El enlace va abajo por si quiere mandarlo también por WhatsApp.`
      : "Invitación lista. Copie el enlace y mándeselo al paciente.",
  };
}
