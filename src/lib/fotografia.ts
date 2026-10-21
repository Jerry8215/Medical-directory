"use server";

/**
 * La fotografía del perfil.
 *
 * Es la pieza que más pesa en que un paciente elija a un médico y no a
 * otro, y hasta hoy no había forma de cargarla: la columna existía y la
 * pantalla la mostraba, pero nada la escribía.
 *
 * El archivo no se guarda en la base de datos ni en el servidor del sitio,
 * sino en un almacén aparte que devuelve una dirección pública. Así la
 * imagen la sirve quien sabe servirla, y la base guarda un renglón de
 * texto en lugar de un archivo.
 */

import { del, put } from "@vercel/blob";
import { revalidatePath } from "next/cache";

import { refrescarDirectorio } from "@/lib/refrescar";

import { puedeEditarPerfil } from "@/lib/permiso-perfil";
import { prisma } from "@/lib/prisma";

export type Resultado =
  | { ok: true; url: string; mensaje: string }
  | { ok: false; mensaje: string };

/** Un retrato no necesita más: el navegador ya lo redujo antes de enviarlo. */
const MAXIMO_BYTES = 2 * 1024 * 1024;

const FORMATOS = ["image/jpeg", "image/png", "image/webp"];

export async function subirFotografia(
  slug: string,
  datos: FormData,
): Promise<Resultado> {
  const quien = await puedeEditarPerfil(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para editar este perfil." };

  const archivo = datos.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, mensaje: "Elija una imagen." };
  }
  if (!FORMATOS.includes(archivo.type)) {
    return { ok: false, mensaje: "La imagen debe ser JPG, PNG o WebP." };
  }
  if (archivo.size > MAXIMO_BYTES) {
    return { ok: false, mensaje: "La imagen pesa demasiado. Intente con otra." };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      mensaje: "El almacén de imágenes todavía no está conectado. Avise al equipo.",
    };
  }

  const anterior = await prisma.profesional.findUnique({
    where: { slug },
    select: { fotografia: true },
  });

  let subida;
  try {
    subida = await put(`medicos/${slug}.jpg`, archivo, {
      access: "public",
      contentType: archivo.type,
      // Cada versión lleva su propio nombre: si se reutilizara el mismo, el
      // navegador del paciente seguiría mostrando la foto vieja durante días.
      addRandomSuffix: true,
    });
  } catch (error) {
    console.error("[fotografia] no se pudo subir", error);
    return { ok: false, mensaje: "No se pudo subir la imagen. Intente de nuevo." };
  }

  await prisma.profesional.update({
    where: { slug },
    data: { fotografia: subida.url },
  });

  // La anterior se borra después de guardar la nueva: si se borrara antes y
  // algo fallara, el perfil quedaría sin fotografía y sin forma de volver.
  if (anterior?.fotografia) {
    try {
      await del(anterior.fotografia);
    } catch (error) {
      console.error("[fotografia] quedó una imagen huérfana", error);
    }
  }

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "perfil.fotografia",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath(`/panel/profesionales/${slug}`);
  refrescarDirectorio(slug);
  return { ok: true, url: subida.url, mensaje: "Fotografía actualizada." };
}

export async function quitarFotografia(slug: string): Promise<Resultado> {
  const quien = await puedeEditarPerfil(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para editar este perfil." };

  const actual = await prisma.profesional.findUnique({
    where: { slug },
    select: { fotografia: true },
  });

  await prisma.profesional.update({ where: { slug }, data: { fotografia: null } });

  if (actual?.fotografia) {
    try {
      await del(actual.fotografia);
    } catch (error) {
      console.error("[fotografia] quedó una imagen huérfana", error);
    }
  }

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "perfil.fotografia.quitada",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath(`/panel/profesionales/${slug}`);
  refrescarDirectorio(slug);
  return { ok: true, url: "", mensaje: "Fotografía quitada." };
}
