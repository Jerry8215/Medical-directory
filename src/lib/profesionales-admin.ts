"use server";

/**
 * Edición de perfiles desde el panel.
 *
 * Lo que se guarda acá es lo que el paciente va a leer y lo que la agenda
 * va a ofrecer, así que dos cuidados: los horarios se validan antes de
 * guardarse —un tramo que termina antes de empezar deja la agenda muda— y
 * cada cambio queda asentado con su autor.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

export type FranjaEntrada = { dia: number; desde: string; hasta: string };

export type DatosPerfil = {
  nombre: string;
  semblanza: string;
  convenios: string;
  correo: string;
  telefono: string;
  avisoCorreo: boolean;
  avisoWhatsapp: boolean;
  publicado: boolean;
};

export type DatosConsultorio = {
  id?: string;
  /// Calendario de Google del médico, solo para el plan Premium.
  calendarioGoogleId?: string;
  ciudadSlug: string;
  nombre: string;
  direccion: string;
  referencias: string;
  precioValoracion?: number;
  duracionCitaMin: number;
  franjas: FranjaEntrada[];
};

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Quien edita: el administrador, la recepción, o el propio profesional. */
async function permiso(slug: string): Promise<{ nombre: string } | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;
  if (sesion.rol === "ADMINISTRADOR" || sesion.rol === "RECEPCION") {
    return { nombre: sesion.nombre };
  }

  const profesional = await prisma.profesional.findUnique({ where: { slug } });
  if (profesional && sesion.profesionalId === profesional.id) {
    return { nombre: sesion.nombre };
  }
  return null;
}

export async function guardarPerfil(
  slug: string,
  datos: DatosPerfil,
): Promise<Resultado> {
  const quien = await permiso(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para editar este perfil." };

  if (datos.nombre.trim().length < 5) {
    return { ok: false, mensaje: "Escriba el nombre completo del profesional." };
  }
  if (datos.avisoCorreo && !datos.correo.trim()) {
    return {
      ok: false,
      mensaje: "Para avisar por correo hace falta un correo donde recibirlo.",
    };
  }
  if (datos.avisoWhatsapp && datos.telefono.replace(/\D/g, "").length < 10) {
    return {
      ok: false,
      mensaje: "Para avisar por WhatsApp hace falta un teléfono de diez dígitos.",
    };
  }

  await prisma.profesional.update({
    where: { slug },
    data: {
      nombre: datos.nombre.trim(),
      semblanza: datos.semblanza.trim() || null,
      convenios: datos.convenios.trim() || null,
      correo: datos.correo.trim() || null,
      telefono: datos.telefono.replace(/\D/g, "") || null,
      avisoCorreo: datos.avisoCorreo,
      avisoWhatsapp: datos.avisoWhatsapp,
      estado: datos.publicado ? "PUBLICADO" : "SUSPENDIDO",
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "perfil.editado",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath("/panel");
  return { ok: true, mensaje: "Perfil guardado." };
}

export async function guardarConsultorio(
  slug: string,
  datos: DatosConsultorio,
): Promise<Resultado> {
  const quien = await permiso(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para editar este perfil." };

  if (datos.nombre.trim().length < 3 || datos.direccion.trim().length < 5) {
    return { ok: false, mensaje: "El consultorio necesita nombre y dirección." };
  }
  if (datos.duracionCitaMin < 5 || datos.duracionCitaMin > 240) {
    return { ok: false, mensaje: "La duración de la consulta debe estar entre 5 y 240 minutos." };
  }

  for (const f of datos.franjas) {
    if (!HORA.test(f.desde) || !HORA.test(f.hasta)) {
      return { ok: false, mensaje: "Las horas se escriben como 09:00 y 14:00." };
    }
    if (f.desde >= f.hasta) {
      return { ok: false, mensaje: "Un tramo no puede terminar antes de empezar." };
    }
  }

  const [profesional, ciudad] = await Promise.all([
    prisma.profesional.findUnique({ where: { slug } }),
    prisma.ciudad.findUnique({ where: { slug: datos.ciudadSlug } }),
  ]);
  if (!profesional || !ciudad) {
    return { ok: false, mensaje: "No encontramos el profesional o la ciudad." };
  }

  const comun = {
    ciudadId: ciudad.id,
    calendarioGoogleId: datos.calendarioGoogleId?.trim() || null,
    nombre: datos.nombre.trim(),
    direccion: datos.direccion.trim(),
    referencias: datos.referencias.trim() || null,
    precioValoracion: datos.precioValoracion ?? null,
    duracionCitaMin: datos.duracionCitaMin,
  };

  if (datos.id) {
    await prisma.$transaction([
      prisma.consultorio.update({ where: { id: datos.id }, data: comun }),
      // Las franjas se rehacen enteras: son pocas y así no quedan tramos
      // viejos conviviendo con los nuevos.
      prisma.franja.deleteMany({ where: { consultorioId: datos.id } }),
      prisma.franja.createMany({
        data: datos.franjas.map((f) => ({ ...f, consultorioId: datos.id! })),
      }),
    ]);
  } else {
    await prisma.consultorio.create({
      data: {
        ...comun,
        profesionalId: profesional.id,
        franjas: { create: datos.franjas },
      },
    });
  }

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: datos.id ? "consultorio.editado" : "consultorio.creado",
      entidad: "profesional",
      entidadId: slug,
      detalle: datos.nombre.trim(),
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath("/panel");
  return {
    ok: true,
    mensaje: datos.id ? "Consultorio actualizado." : "Consultorio agregado.",
  };
}

/**
 * Comprueba la conexión con el calendario del médico.
 *
 * Se prueba antes de depender de ella: descubrir que el calendario no está
 * compartido el día que un paciente reserva significa una hora ofrecida
 * sobre una cirugía.
 */
export async function probarConexionGoogle(
  slug: string,
  calendarioId: string,
): Promise<Resultado> {
  const quien = await permiso(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para este perfil." };
  if (!calendarioId.trim()) {
    return { ok: false, mensaje: "Pegue primero el identificador del calendario." };
  }

  const { probarCalendario, direccionDeServicio } = await import("@/lib/google-calendar");
  const resultado = await probarCalendario(calendarioId.trim());

  if (!resultado.ok) {
    const direccion = direccionDeServicio();
    return {
      ok: false,
      mensaje: direccion
        ? `${resultado.mensaje} Comparta el calendario con ${direccion}.`
        : resultado.mensaje,
    };
  }

  return { ok: true, mensaje: resultado.mensaje };
}

export async function eliminarConsultorio(
  slug: string,
  id: string,
): Promise<Resultado> {
  const quien = await permiso(slug);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para editar este perfil." };

  const citas = await prisma.cita.count({
    where: { consultorioId: id, estado: { in: ["AGENDADA", "CONFIRMADA"] }, inicio: { gte: new Date() } },
  });
  if (citas > 0) {
    // Borrarlo dejaría pacientes citados en una dirección que ya no existe.
    return {
      ok: false,
      mensaje: `Ese consultorio tiene ${citas} cita(s) por atender. Atiéndalas o cancélelas antes de eliminarlo.`,
    };
  }

  await prisma.consultorio.delete({ where: { id } });
  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "consultorio.eliminado",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath("/panel");
  return { ok: true, mensaje: "Consultorio eliminado." };
}

/**
 * Cambiar el plan de un perfil.
 *
 * Solo el administrador: el plan define qué herramientas tiene el perfil y
 * un profesional no puede subirse el suyo. La fecha de vencimiento es lo
 * que devuelve el perfil al básico cuando deja de pagarse, sin que nadie
 * tenga que acordarse.
 */
export async function cambiarPlan(
  slug: string,
  plan: "BASICO" | "GOLD" | "PREMIUM",
  hasta?: string,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede cambiar el plan." };
  }

  const vencimiento = hasta ? new Date(`${hasta}T12:00:00Z`) : null;
  if (hasta && Number.isNaN(vencimiento!.getTime())) {
    return { ok: false, mensaje: "La fecha de vencimiento no es válida." };
  }

  await prisma.profesional.update({
    where: { slug },
    data: { plan, planHasta: plan === "BASICO" ? null : vencimiento },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "plan.cambiado",
      entidad: "profesional",
      entidadId: slug,
      detalle: `${plan}${hasta ? ` hasta ${hasta}` : ""}`,
    },
  });

  revalidatePath(`/medico/${slug}`);
  revalidatePath("/panel");
  return {
    ok: true,
    mensaje:
      plan === "BASICO"
        ? "Perfil en plan Básico."
        : `Plan ${plan === "GOLD" ? "Gold" : "Premium"} activo${hasta ? ` hasta el ${hasta}` : ""}.`,
  };
}

/**
 * Eliminar un perfil.
 *
 * Se niega si el profesional tiene citas por atender: borrarlo dejaría a
 * esos pacientes con una cita que ya no existe y sin nadie a quién
 * reclamarle. Para sacarlo del directorio sin perder su historial está la
 * suspensión, que es lo que conviene en casi todos los casos.
 *
 * Lo que sí se borra, se borra entero: perfil, consultorios, horarios,
 * verificaciones, opiniones y su acceso al panel. Las citas pasadas se
 * conservan, porque son el registro de lo que ocurrió.
 */
export async function eliminarProfesional(slug: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede eliminar un perfil." };
  }

  const profesional = await prisma.profesional.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { citas: true },
      },
    },
  });
  if (!profesional) return { ok: false, mensaje: "Ese perfil ya no existe." };

  const porAtender = await prisma.cita.count({
    where: {
      profesionalId: profesional.id,
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: new Date() },
    },
  });

  if (porAtender > 0) {
    return {
      ok: false,
      mensaje: `${profesional.nombre} tiene ${porAtender} cita(s) por atender. Atiéndalas o cancélelas antes de eliminar el perfil; si solo quiere quitarlo del directorio, suspéndalo.`,
    };
  }

  if (profesional._count.citas > 0) {
    return {
      ok: false,
      mensaje: `${profesional.nombre} tiene citas registradas en su historial. Para conservar ese registro, el perfil se suspende en lugar de eliminarse.`,
    };
  }

  try {
    await prisma.$transaction([
      prisma.usuario.updateMany({
        where: { profesionalId: profesional.id },
        data: { activo: false, profesionalId: null },
      }),
      prisma.opinion.deleteMany({ where: { profesionalId: profesional.id } }),
      prisma.verificacion.deleteMany({ where: { profesionalId: profesional.id } }),
      prisma.profesionalEspecialidad.deleteMany({
        where: { profesionalId: profesional.id },
      }),
      prisma.consultorio.deleteMany({ where: { profesionalId: profesional.id } }),
      prisma.profesional.delete({ where: { id: profesional.id } }),
    ]);
  } catch (error) {
    console.error("[perfil] no se pudo eliminar", error);
    return {
      ok: false,
      mensaje: "No se pudo eliminar el perfil. Intente suspenderlo y avíseme.",
    };
  }

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "perfil.eliminado",
      entidad: "profesional",
      entidadId: slug,
      detalle: profesional.nombre,
    },
  });

  revalidatePath("/panel");
  revalidatePath("/");
  return { ok: true, mensaje: `${profesional.nombre} quedó fuera del directorio.` };
}

/** Quitar del directorio sin borrar: conserva historial y se puede revertir. */
export async function suspenderProfesional(
  slug: string,
  suspender: boolean,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede suspender un perfil." };
  }

  const p = await prisma.profesional.update({
    where: { slug },
    data: { estado: suspender ? "SUSPENDIDO" : "PUBLICADO" },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: suspender ? "perfil.suspendido" : "perfil.publicado",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath("/panel");
  revalidatePath(`/medico/${slug}`);
  revalidatePath("/");
  return {
    ok: true,
    mensaje: suspender
      ? `${p.nombre} ya no aparece en el directorio. Su información se conserva.`
      : `${p.nombre} volvió al directorio.`,
  };
}
