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

import { refrescarDirectorio } from "@/lib/refrescar";

import { altaDeAcceso } from "@/lib/accesos";
import { anotar, resolver } from "@/lib/novedades";
import { enviarCorreo } from "@/lib/avisos";
import { precios } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { importe, mesesDe, pesos } from "@/lib/suscripciones";
import { sitio, urlAbsoluta } from "@/config/sitio";

import type { Plan } from "@/lib/planes";
import type { Periodicidad } from "@/lib/suscripciones";

export type Resultado =
  | {
      ok: true;
      mensaje: string;
      /** Las credenciales recién creadas, para enseñarlas en pantalla. */
      acceso?: { correo: string; clave: string; porCorreo: boolean };
    }
  | { ok: false; mensaje: string };

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
  await resolver(id);
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
  let creado = "";

  try {
    creado = await prisma.$transaction(async (tx) => {
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

      // La cédula de especialidad no caduca, pero tampoco se cotejó: se
      // guarda declarada y pendiente, para que quien revise sepa que hay
      // un segundo documento que mirar.
      if (solicitud.cedulaEspecialidad) {
        await tx.verificacion.create({
          data: {
            profesionalId: profesional.id,
            tipo: "CEDULA_ESPECIALIDAD",
            numero: solicitud.cedulaEspecialidad,
            institucion: "Registro Nacional de Profesionistas",
            estado: "PENDIENTE",
            evidencia: "Declarada por el profesional; falta cotejarla.",
          },
        });
      }

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

      return profesional.id;
    });
  } catch (error) {
    console.error("[verificacion] no se pudo publicar", error);
    return { ok: false, mensaje: "No se pudo publicar el perfil. Intente de nuevo." };
  }

  // El plan que eligió al registrarse se convierte en un cobro. Antes se
  // guardaba en la solicitud y ahí se quedaba: el perfil nacía en básico
  // aunque hubiera pedido Gold, no aparecía en el panel de cobros y nadie
  // sabía hasta cuándo estaba vigente. El plan no se activa acá, lo
  // activa el pago acreditado, que es lo que evita estrenar herramientas
  // con un depósito que nunca llegó.
  const planPedido = (solicitud.plan ?? "BASICO") as Plan;
  if (planPedido !== "BASICO") {
    const periodicidad: Periodicidad =
      solicitud.periodicidad === "ANUAL" ? "ANUAL" : "MENSUAL";
    const tarifa = await precios();
    const aCobrar = importe(planPedido, periodicidad, tarifa);

    const pago = await prisma.pago.create({
      data: {
        profesionalId: creado,
        plan: planPedido,
        meses: mesesDe(periodicidad),
        importe: aCobrar,
        medio: "TRANSFERENCIA",
        // Si ya reportó su referencia al registrarse, entra directo a
        // revisión: volver a pedírsela sería no haber leído lo que puso.
        estado: solicitud.referenciaPago ? "EN_REVISION" : "PENDIENTE",
        referencia: solicitud.referenciaPago,
      },
    });

    await anotar({
      tipo: "SOLICITUD_ALTA",
      titulo: `${solicitud.nombre} eligió el plan ${planPedido} al registrarse`,
      detalle: solicitud.referenciaPago
        ? `${pesos(aCobrar)} · referencia ${solicitud.referenciaPago} · falta acreditarlo`
        : `${pesos(aCobrar)} · falta que deposite y reporte su referencia`,
      enlace: "/panel/cobros",
      profesionalId: creado,
      referencia: pago.id,
    });
  }

  // Verificada la cédula, el acceso del médico nace solo. Hasta ahora
  // alguien tenía que acordarse de crearlo a mano, y mientras no lo hacía
  // el médico no podía tocar su propio perfil.
  const acceso = await altaDeAcceso(creado, solicitud.correo);
  let salioElCorreo = false;
  if (acceso.ok) {
    await enviarCorreo({
      para: acceso.correo,
      asunto: `${solicitud.nombre}: su perfil ya está publicado · ${sitio.nombre}`,
      cuerpo: [
        `Doctor(a) ${solicitud.nombre}:`,
        "",
        "Su cédula quedó verificada y su perfil ya aparece en el directorio.",
        "",
        "Desde su acceso puede editar su semblanza, sus consultorios, sus horarios",
        "y sus precios, y ver cuántos pacientes lo buscaron.",
        "",
        `Entre aquí: ${urlAbsoluta("/panel/acceso")}`,
        `Correo: ${acceso.correo}`,
        `Contraseña: ${acceso.clave}`,
        "",
        "Le recomendamos cambiarla desde «Mi contraseña» en cuanto entre.",
      ].join("\n"),
    })
      .then(() => {
        salioElCorreo = true;
      })
      .catch((error) => {
        // El perfil ya quedó publicado: que no salga el correo no puede
        // deshacerlo. Pero callarlo sí hacía daño, porque el consultorio
        // daba por enviada una contraseña que nunca llegó y el médico se
        // quedaba esperando un correo que no existía.
        console.error("[acceso] no se pudo enviar la contraseña", error);
      });
  }

  revalidatePath("/panel");
  revalidatePath("/");
  await resolver(id);
  refrescarDirectorio();
  if (!acceso.ok) {
    return {
      ok: true,
      mensaje: `Perfil publicado. No se pudo crear su acceso: ${acceso.mensaje}`,
    };
  }

  return {
    ok: true,
    // La contraseña se devuelve siempre, salga o no el correo. El
    // administrador está delante de la pantalla en ese momento: hacerlo
    // depender de un correo que puede caer en la carpeta de no deseados
    // es poner entre él y el médico un eslabón que no hace falta.
    mensaje: salioElCorreo
      ? "Perfil publicado y acceso enviado por correo. La contraseña va abajo por si no llega."
      : "Perfil publicado. El correo no salió: dicte usted estos datos al médico.",
    acceso: {
      correo: acceso.correo,
      clave: acceso.clave,
      porCorreo: salioElCorreo,
    },
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
  refrescarDirectorio(slug);
  return { ok: true, mensaje: publicar ? "Perfil publicado." : "Perfil suspendido." };
}

/**
 * Borrar una solicitud del todo.
 *
 * Rechazar y borrar no son lo mismo y conviene no confundirlos. Rechazar
 * deja constancia de que alguien pidió entrar y de que se decidió que no,
 * que es lo que uno quiere tener a la mano cuando el interesado pregunta.
 * Borrar es para lo que nunca debió existir: una prueba, un duplicado,
 * alguien que se registró dos veces. Por eso solo lo puede hacer el
 * administrador y por eso no queda rastro de la solicitud, aunque sí del
 * borrado en el registro de auditoría.
 */
export async function borrarSolicitud(id: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") {
    return { ok: false, mensaje: "Solo el administrador puede borrar una solicitud." };
  }

  const solicitud = await prisma.solicitudAlta.findUnique({
    where: { id },
    select: { nombre: true, correo: true, cedula: true, estado: true },
  });
  if (!solicitud) return { ok: false, mensaje: "Esa solicitud ya no existe." };

  await prisma.solicitudAlta.delete({ where: { id } });

  // El perfil que se haya publicado a partir de ella no se toca: borrar la
  // solicitud es limpiar la bandeja, no dar de baja a un médico.
  await resolver(id);

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: "solicitud.borrada",
      entidad: "solicitud",
      entidadId: id,
      detalle: `${solicitud.nombre} · ${solicitud.correo} · cédula ${solicitud.cedula}`,
    },
  });

  revalidatePath("/panel/solicitudes");
  revalidatePath("/panel");
  return { ok: true, mensaje: `Se borró la solicitud de ${solicitud.nombre}.` };
}
