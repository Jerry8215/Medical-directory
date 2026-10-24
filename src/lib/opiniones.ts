"use server";

/**
 * Opiniones de pacientes.
 *
 * Se publican después de que alguien del directorio las revisa. No es
 * burocracia: una opinión puede traer el nombre y el padecimiento de una
 * persona identificable, o una acusación sobre un tercero, y publicarla sin
 * leerla sería un problema para el médico y para el paciente.
 *
 * La calificación del perfil se recalcula sobre lo publicado, de modo que
 * lo que se ve en la ficha siempre corresponde a lo que se puede leer
 * abajo.
 */

import { revalidatePath } from "next/cache";

import { anotar, resolver } from "@/lib/novedades";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { nombreDePersona } from "@/lib/validacion";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

export async function dejarOpinion(datos: {
  slug: string;
  autor: string;
  calificacion: number;
  texto: string;
  /**
   * El enlace de su cita, si agendó por el sitio. Identifica la consulta
   * y demuestra a la vez que la hubo.
   */
  token?: string;
  /**
   * La invitación que le emitió el consultorio, si se atendió por otra
   * vía. La respalda una persona y no el sistema, así que la moderación
   * la distingue.
   */
  invitacion?: string;
}): Promise<Resultado> {
  const revision = nombreDePersona(datos.autor, { minimoPalabras: 1 });
  const texto = datos.texto.trim();

  if (!revision.ok) {
    return { ok: false, mensaje: revision.motivo };
  }
  const autor = revision.valor;
  if (texto.length < 15) {
    return {
      ok: false,
      mensaje: "Cuéntenos un poco más: una línea no le sirve a quien la lea.",
    };
  }
  if (texto.length > 1200) {
    return { ok: false, mensaje: "La opinión es demasiado larga." };
  }
  if (!Number.isInteger(datos.calificacion) || datos.calificacion < 1 || datos.calificacion > 5) {
    return { ok: false, mensaje: "Elija de una a cinco estrellas." };
  }

  const profesional = await prisma.profesional.findUnique({
    where: { slug: datos.slug },
  });
  if (!profesional) return { ok: false, mensaje: "Ese perfil ya no existe." };

  // El perfil prometía opiniones de pacientes y a la vez dejaba opinar a
  // cualquiera, sin nada que lo respaldara. Ahora hacen falta una de dos
  // cosas: el enlace de la cita, o la invitación que emitió el
  // consultorio para quien se atendió por teléfono o en el mostrador.
  let citaId: string | undefined;
  let invitacionId: string | undefined;

  if (datos.token) {
    const cita = await prisma.cita.findUnique({ where: { token: datos.token } });
    if (!cita || cita.profesionalId !== profesional.id) {
      return {
        ok: false,
        mensaje:
          "Ese enlace no corresponde a una consulta con este profesional.",
      };
    }
    if (cita.estado === "CANCELADA") {
      return { ok: false, mensaje: "Esa consulta quedó cancelada." };
    }
    if (cita.inicio > new Date()) {
      return {
        ok: false,
        mensaje: "Su consulta todavía no ocurre. El enlace sigue sirviendo después.",
      };
    }
    const yaOpino = await prisma.opinion.findUnique({ where: { citaId: cita.id } });
    if (yaOpino) {
      return { ok: false, mensaje: "Ya dejó su opinión de esa consulta. Gracias." };
    }
    citaId = cita.id;
  } else if (datos.invitacion) {
    const invitacion = await prisma.invitacionOpinion.findUnique({
      where: { id: datos.invitacion },
    });
    if (!invitacion || invitacion.profesionalId !== profesional.id) {
      return { ok: false, mensaje: "Esa invitación no es válida." };
    }
    if (invitacion.usadaEn) {
      return { ok: false, mensaje: "Esa invitación ya se usó. Gracias por opinar." };
    }
    invitacionId = invitacion.id;
  } else {
    return {
      ok: false,
      mensaje:
        "Las opiniones se dejan desde el enlace de su cita o desde la invitación que le manda el consultorio.",
    };
  }

  const opinion = await prisma.opinion.create({
    data: {
      profesionalId: profesional.id,
      autor,
      texto,
      calificacion: datos.calificacion,
      citaId,
      invitacionId,
    },
  });

  // La invitación se cierra en cuanto se usa: una invitación, una opinión.
  if (invitacionId) {
    await prisma.invitacionOpinion.update({
      where: { id: invitacionId },
      data: { usadaEn: new Date() },
    });
  }

  await anotar({
    tipo: "OPINION_NUEVA",
    titulo: `${autor} dejó una opinión de ${profesional.nombre}`,
    detalle: `${datos.calificacion} de 5 estrellas · por revisar antes de publicarse`,
    enlace: "/panel/opiniones",
    profesionalId: profesional.id,
    // Para que el aviso se apague solo cuando alguien la revise.
    referencia: opinion.id,
  });

  revalidatePath("/panel/opiniones");
  return {
    ok: true,
    mensaje:
      "Gracias. Su opinión se publica en cuanto la revisemos, normalmente el mismo día.",
  };
}

async function recalcular(profesionalId: string) {
  const publicadas = await prisma.opinion.findMany({
    where: { profesionalId, publicada: true },
    select: { calificacion: true },
  });

  const total = publicadas.length;
  const promedio =
    total > 0
      ? Math.round((publicadas.reduce((s, o) => s + o.calificacion, 0) / total) * 10) / 10
      : null;

  await prisma.profesional.update({
    where: { id: profesionalId },
    data: { calificacion: promedio, numeroOpiniones: total },
  });
}

export async function publicarOpinion(id: string, publicar: boolean): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "PROFESIONAL") {
    // Que un médico aprobara las opiniones sobre sí mismo haría inútil la
    // calificación.
    return { ok: false, mensaje: "No tiene permiso para revisar opiniones." };
  }

  const opinion = await prisma.opinion.update({
    where: { id },
    data: { publicada: publicar, revisadaPor: sesion.nombre },
    include: { profesional: true },
  });

  await recalcular(opinion.profesionalId);

  // Ya se revisó: el panel no tiene por qué seguir pidiéndolo.
  await resolver(opinion.id);

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: publicar ? "opinion.publicada" : "opinion.ocultada",
      entidad: "profesional",
      entidadId: opinion.profesional.slug,
    },
  });

  revalidatePath(`/medico/${opinion.profesional.slug}`);
  revalidatePath("/panel/opiniones");
  return { ok: true, mensaje: publicar ? "Opinión publicada." : "Opinión oculta." };
}

export async function eliminarOpinion(id: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede eliminar una opinión." };
  }

  const opinion = await prisma.opinion.delete({
    where: { id },
    include: { profesional: true },
  });
  await recalcular(opinion.profesionalId);
  await resolver(opinion.id);

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "opinion.eliminada",
      entidad: "profesional",
      entidadId: opinion.profesional.slug,
    },
  });

  revalidatePath(`/medico/${opinion.profesional.slug}`);
  revalidatePath("/panel/opiniones");
  return { ok: true, mensaje: "Opinión eliminada." };
}
