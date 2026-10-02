"use server";

/**
 * Verificación de solicitudes.
 *
 * Es el trámite que sostiene la promesa del directorio: ningún perfil se
 * publica sin que una persona haya comprobado la cédula y haya quedado
 * registrado quién lo aprobó y cuándo.
 *
 * El permiso se comprueba acá dentro y no solo en el middleware: una acción
 * del servidor se puede invocar directamente, sin pasar por la pantalla que
 * la ofrece.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

/** Dirección pública donde se consulta una cédula en el registro de la SEP. */
export async function consultaSep(cedula: string): Promise<string> {
  return `https://cedulaprofesional.sep.gob.mx/cedula/buscaCedulaJson.action?json=%7B%22maxResult%22%3A%221%22%2C%22idCedula%22%3A%22${encodeURIComponent(
    cedula,
  )}%22%7D`;
}

function slugDe(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^(dr|dra|lic|mtro|mtra)\.?\s+/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function slugLibre(base: string): Promise<string> {
  let slug = base;
  let n = 2;
  while (await prisma.profesional.findUnique({ where: { slug } })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}

export async function marcarEnVerificacion(id: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "PROFESIONAL") {
    return { ok: false, mensaje: "No tiene permiso para esta acción." };
  }

  await prisma.solicitudAlta.update({
    where: { id },
    data: { estado: "EN_VERIFICACION", revisadaPor: sesion.nombre, revisadaEn: new Date() },
  });
  revalidatePath("/panel");
  return { ok: true, mensaje: "Marcada en verificación." };
}

export async function rechazarSolicitud(id: string, motivo: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede rechazar una solicitud." };
  }

  await prisma.solicitudAlta.update({
    where: { id },
    data: {
      estado: "RECHAZADA",
      revisadaPor: sesion.nombre,
      revisadaEn: new Date(),
      mensaje: motivo || null,
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "solicitud.rechazada",
      entidad: "solicitud",
      entidadId: id,
      detalle: motivo,
    },
  });

  revalidatePath("/panel");
  return { ok: true, mensaje: "Solicitud rechazada." };
}

/**
 * Aprobar publica el perfil.
 *
 * Todo ocurre en una sola transacción: el perfil, su especialidad, su
 * consultorio y la constancia de la cédula comprobada. Si algo falla, no
 * queda un perfil a medias en el directorio.
 */
export async function aprobarSolicitud(id: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede publicar un perfil." };
  }

  const solicitud = await prisma.solicitudAlta.findUnique({ where: { id } });
  if (!solicitud) return { ok: false, mensaje: "La solicitud ya no existe." };
  if (solicitud.estado === "PUBLICADA") {
    return { ok: false, mensaje: "Esa solicitud ya está publicada." };
  }

  const [especialidad, ciudad] = await Promise.all([
    prisma.especialidad.findUnique({
      where: { slug: solicitud.especialidad },
      include: { profesion: true },
    }),
    prisma.ciudad.findUnique({ where: { slug: solicitud.ciudadSlug } }),
  ]);

  if (!especialidad || !ciudad) {
    return { ok: false, mensaje: "La especialidad o la ciudad ya no están en el catálogo." };
  }

  const slug = await slugLibre(slugDe(solicitud.nombre));

  try {
    await prisma.$transaction(async (tx) => {
      const profesional = await tx.profesional.create({
        data: {
          nombre: solicitud.nombre,
          slug,
          profesionId: especialidad.profesionId,
          correo: solicitud.correo,
          telefono: solicitud.telefono,
          estado: "PUBLICADO",
          especialidades: {
            create: { especialidadId: especialidad.id, principal: true },
          },
        },
      });

      await tx.verificacion.create({
        data: {
          profesionalId: profesional.id,
          tipo: "CEDULA_PROFESIONAL",
          numero: solicitud.cedula,
          institucion: "Registro Nacional de Profesionistas",
          estado: "APROBADA",
          evidencia: `Cotejada en el registro de la SEP por ${sesion.nombre}.`,
          revisadaPor: sesion.nombre,
          revisadaEn: new Date(),
        },
      });

      // La certificación de consejo caduca, así que entra como pendiente
      // hasta que se registre su vigencia.
      if (solicitud.consejo) {
        await tx.verificacion.create({
          data: {
            profesionalId: profesional.id,
            tipo: "CONSEJO_ESPECIALIDAD",
            numero: solicitud.consejo,
            estado: "PENDIENTE",
            evidencia: "Declarada por el profesional; falta registrar la vigencia.",
          },
        });
      }

      if (solicitud.consultorio) {
        await tx.consultorio.create({
          data: {
            profesionalId: profesional.id,
            ciudadId: ciudad.id,
            nombre: solicitud.consultorio,
            direccion: solicitud.consultorio,
          },
        });
      }

      await tx.solicitudAlta.update({
        where: { id },
        data: {
          estado: "PUBLICADA",
          revisadaPor: sesion.nombre,
          revisadaEn: new Date(),
        },
      });

      await tx.registroAuditoria.create({
        data: {
          actor: sesion.nombre,
          accion: "perfil.publicado",
          entidad: "profesional",
          entidadId: profesional.id,
          detalle: `${solicitud.nombre} · cédula ${solicitud.cedula}`,
        },
      });
    });
  } catch (error) {
    console.error("[verificacion] no se pudo publicar", error);
    return { ok: false, mensaje: "No se pudo publicar el perfil. Intente de nuevo." };
  }

  revalidatePath("/panel");
  revalidatePath("/");
  return {
    ok: true,
    mensaje: `Perfil publicado. Ya aparece en el directorio con su cédula verificada.`,
  };
}

/** Quitar o devolver un perfil al directorio, sin borrarlo. */
export async function cambiarEstadoPerfil(
  slug: string,
  publicar: boolean,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede suspender un perfil." };
  }

  await prisma.profesional.update({
    where: { slug },
    data: { estado: publicar ? "PUBLICADO" : "SUSPENDIDO" },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: publicar ? "perfil.publicado" : "perfil.suspendido",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath("/panel");
  revalidatePath(`/medico/${slug}`);
  return { ok: true, mensaje: publicar ? "Perfil publicado." : "Perfil suspendido." };
}
