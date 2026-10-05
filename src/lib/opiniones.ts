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

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

export async function dejarOpinion(datos: {
  slug: string;
  autor: string;
  calificacion: number;
  texto: string;
  /** Si viene del enlace de su cita, la opinión queda ligada a ella. */
  token?: string;
}): Promise<Resultado> {
  const autor = datos.autor.trim();
  const texto = datos.texto.trim();

  if (autor.length < 3) {
    return { ok: false, mensaje: "Escriba su nombre o cómo quiere aparecer." };
  }
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

  let citaId: string | undefined;
  if (datos.token) {
    const cita = await prisma.cita.findUnique({ where: { token: datos.token } });
    if (cita && cita.profesionalId === profesional.id) {
      const yaOpino = await prisma.opinion.findUnique({ where: { citaId: cita.id } });
      if (yaOpino) {
        return { ok: false, mensaje: "Ya dejó su opinión de esa consulta. Gracias." };
      }
      citaId = cita.id;
    }
  }

  await prisma.opinion.create({
    data: {
      profesionalId: profesional.id,
      autor,
      texto,
      calificacion: datos.calificacion,
      citaId,
    },
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
