"use server";

/**
 * El ciclo de una consulta en línea.
 *
 * Seis momentos y un reloj. El paciente describe lo que le ocurre y
 * elige un médico disponible; se cobra; el médico tiene un plazo corto
 * para aceptar; la sala se abre por dos horas; al cerrarse, se le pide
 * su opinión al paciente.
 *
 * Dos cosas no se negocian acá.
 *
 * La barrera clínica va en la entrada, no en el medio. Lo que describe
 * una urgencia no se conversa ni se cobra: se deriva. Conviene notar que
 * la barrera del asistente deriva también lo que «necesita valorar un
 * médico en consulta», y eso es precisamente lo que esta función ofrece,
 * así que aquí solo bloquean los signos de alarma.
 *
 * El dinero no se mueve desde este archivo. La consulta nace SOLICITADA
 * y solo pasa a PAGADA cuando el cobro está confirmado. Mientras el
 * procesador no esté configurado, esa puerta la abre el consultorio a
 * mano, que es la misma costura por la que entrará el cobro con tarjeta
 * el día que haya credenciales.
 */

import { revalidatePath } from "next/cache";

import { sitio, urlAbsoluta } from "@/config/sitio";
import { evaluar } from "@/lib/asistente/seguridad";
import { enviarCorreo } from "@/lib/avisos";
import {
  admiteMensajes,
  cierraLaSalaEn,
  COMISION_POR_CIENTO,
  MINUTOS_DE_SALA,
  MINUTOS_PARA_ACEPTAR,
  puedeAtenderEnLinea,
  reparto,
  situacion,
} from "@/lib/consulta-reglas";
import { anotar, resolver } from "@/lib/novedades";
import { pacienteActual } from "@/lib/paciente-acceso";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { pesos } from "@/lib/suscripciones";

export type Resultado = { ok: true; mensaje: string; token?: string } | {
  ok: false;
  mensaje: string;
  /** `urgencias` cuando la barrera clínica mandó al paciente a otro lado. */
  motivo?: "urgencias" | "datos" | "permiso" | "estado";
};

const LARGO_MAXIMO = 4000;

// ----------------------------------------------------------------------
//  El paciente abre la consulta
// ----------------------------------------------------------------------

export async function abrirConsulta(datos: {
  profesionalSlug: string;
  /** En pocas palabras, para distinguirla en un listado. */
  titulo: string;
  motivo: string;
}): Promise<Resultado> {
  const paciente = await pacienteActual();
  if (!paciente) {
    return { ok: false, motivo: "permiso", mensaje: "Entre con su correo para abrir una consulta." };
  }

  const titulo = datos.titulo.trim();
  if (titulo.length < 4 || titulo.length > 90) {
    return {
      ok: false,
      motivo: "datos",
      mensaje: "Póngale un título corto: «dolor de rodilla al subir escaleras».",
    };
  }

  const motivo = datos.motivo.trim();
  if (motivo.length < 15) {
    return {
      ok: false,
      motivo: "datos",
      mensaje: "Cuéntenos un poco más: con una línea el médico no puede ayudarle.",
    };
  }
  if (motivo.length > LARGO_MAXIMO) {
    return { ok: false, motivo: "datos", mensaje: "El texto es demasiado largo." };
  }

  // La barrera clínica, en la entrada. Solo los signos de alarma
  // bloquean: lo que la barrera del asistente deriva «a consulta» es
  // justamente lo que esta pantalla ofrece.
  const veredicto = evaluar(`${titulo} ${motivo}`);
  if (veredicto.accion === "urgencias") {
    return { ok: false, motivo: "urgencias", mensaje: veredicto.respuesta };
  }

  const profesional = await prisma.profesional.findUnique({
    where: { slug: datos.profesionalSlug },
    select: {
      id: true,
      nombre: true,
      correo: true,
      estado: true,
      enLinea: true,
      precioConsultaLinea: true,
    },
  });

  if (!profesional || !puedeAtenderEnLinea(profesional)) {
    return {
      ok: false,
      motivo: "estado",
      mensaje: "Ese médico no está disponible en línea en este momento. Elija otro o agende una cita presencial.",
    };
  }

  // Una consulta a la vez con el mismo médico: dos salas abiertas en
  // paralelo son dos cobros y una sola conversación.
  const abierta = await prisma.consulta.findFirst({
    where: {
      pacienteId: paciente.id,
      profesionalId: profesional.id,
      estado: { in: ["SOLICITADA", "PAGADA", "ACEPTADA"] },
    },
    select: { token: true },
  });
  if (abierta) {
    return {
      ok: true,
      token: abierta.token,
      mensaje: "Ya tiene una consulta en curso con este médico.",
    };
  }

  const precio = profesional.precioConsultaLinea ?? 0;
  const { plataforma } = reparto(precio, COMISION_POR_CIENTO);

  const consulta = await prisma.consulta.create({
    data: {
      profesionalId: profesional.id,
      pacienteId: paciente.id,
      titulo,
      motivo,
      precio,
      comision: plataforma,
      estado: "SOLICITADA",
    },
    select: { id: true, token: true },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: `paciente:${paciente.id}`,
      accion: "consulta.abierta",
      entidad: "consulta",
      entidadId: consulta.id,
      detalle: `${profesional.nombre} · ${pesos(precio)}`,
    },
  });

  revalidatePath("/panel/consultas");
  return {
    ok: true,
    token: consulta.token,
    mensaje: "Consulta abierta. Falta el pago para que el médico la reciba.",
  };
}

// ----------------------------------------------------------------------
//  El cobro: la costura por la que entrará la tarjeta
// ----------------------------------------------------------------------

/**
 * Dar la consulta por pagada y avisarle al médico.
 *
 * Hoy la abre el consultorio a mano, porque el procesador todavía no
 * está configurado. El día que lo esté, el webhook del cobro llamará a
 * esta misma función y no habrá que tocar nada más: es el mismo patrón
 * que ya usa `acreditar` para las suscripciones, donde el único punto
 * que mueve dinero es uno y no tres.
 */
export async function marcarPagada(
  consultaId: string,
  porQuien: string,
): Promise<Resultado> {
  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: {
      profesional: { select: { nombre: true, correo: true, slug: true } },
      paciente: { select: { nombre: true } },
    },
  });
  if (!consulta) return { ok: false, mensaje: "Esa consulta ya no existe." };
  if (consulta.estado !== "SOLICITADA") {
    return { ok: false, motivo: "estado", mensaje: "Esa consulta ya no está esperando el pago." };
  }

  await prisma.consulta.update({
    where: { id: consultaId },
    data: { estado: "PAGADA" },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: porQuien,
      accion: "consulta.pagada",
      entidad: "consulta",
      entidadId: consultaId,
      detalle: pesos(consulta.precio),
    },
  });

  // El aviso al médico es el producto: si no se entera en minutos, el
  // paciente ya se fue. Hoy sale por correo y por el panel; el aviso al
  // teléfono llega con la aplicación.
  await anotar({
    tipo: "CITA_NUEVA",
    titulo: `${consulta.paciente.nombre ?? "Un paciente"} pide consulta en línea`,
    detalle: `Con ${consulta.profesional.nombre} · tiene ${MINUTOS_PARA_ACEPTAR} minutos para aceptar`,
    enlace: "/panel/consultas",
    profesionalId: consulta.profesionalId,
    referencia: consultaId,
  });

  if (consulta.profesional.correo) {
    await enviarCorreo({
      para: consulta.profesional.correo,
      asunto: `Consulta en línea esperándolo · ${sitio.nombre}`,
      cuerpo: [
        `Doctor(a) ${consulta.profesional.nombre}:`,
        "",
        `${consulta.paciente.nombre ?? "Un paciente"} abrió una consulta en línea y`,
        `ya pagó. Tiene ${MINUTOS_PARA_ACEPTAR} minutos para aceptarla; si no,`,
        "se le devuelve el importe y se le ofrece a otro médico.",
        "",
        `Entre aquí: ${urlAbsoluta("/panel/consultas")}`,
      ].join("\n"),
    }).catch((error) => {
      console.error("[consulta] no se pudo avisar al médico", error);
    });
  }

  revalidatePath("/panel/consultas");
  return { ok: true, mensaje: "Consulta pagada. El médico ya fue avisado." };
}

/** El consultorio abre la sala sin cobro: cortesía o prueba. */
export async function abrirSinCobro(consultaId: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol === "PROFESIONAL") {
    return { ok: false, motivo: "permiso", mensaje: "Solo el equipo del consultorio puede hacer esto." };
  }
  return marcarPagada(consultaId, sesion.nombre);
}

// ----------------------------------------------------------------------
//  El médico acepta
// ----------------------------------------------------------------------

export async function aceptarConsulta(consultaId: string): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, motivo: "permiso", mensaje: "Su sesión expiró." };

  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: { profesional: { select: { nombre: true } }, paciente: true },
  });
  if (!consulta) return { ok: false, mensaje: "Esa consulta ya no existe." };

  const esSuya =
    sesion.profesionalId === consulta.profesionalId ||
    sesion.rol === "ADMINISTRADOR" ||
    sesion.rol === "RECEPCION";
  if (!esSuya) return { ok: false, motivo: "permiso", mensaje: "Esa consulta no es suya." };

  const ahora = new Date();
  const donde = situacion(consulta, ahora);
  if (donde === "sin-respuesta") {
    return {
      ok: false,
      motivo: "estado",
      mensaje: "Se acabó el plazo para aceptarla. El importe se le devuelve al paciente.",
    };
  }
  if (donde !== "esperando-medico") {
    return { ok: false, motivo: "estado", mensaje: "Esa consulta ya no está esperando respuesta." };
  }

  await prisma.$transaction([
    prisma.consulta.update({
      where: { id: consultaId },
      data: { estado: "ACEPTADA", aceptadaEn: ahora, cierraEn: cierraLaSalaEn(ahora) },
    }),
    prisma.mensajeConsulta.create({
      data: {
        consultaId,
        autor: "SISTEMA",
        texto: `${consulta.profesional.nombre} entró a la sala. La consulta queda abierta ${MINUTOS_DE_SALA / 60} horas.`,
      },
    }),
  ]);

  await resolver(consultaId);

  if (consulta.paciente.correo) {
    await enviarCorreo({
      para: consulta.paciente.correo,
      asunto: `${consulta.profesional.nombre} entró a su consulta`,
      cuerpo: [
        `${consulta.paciente.nombre ?? "Hola"}:`,
        "",
        `${consulta.profesional.nombre} aceptó su consulta y ya puede escribirle.`,
        `La sala queda abierta ${MINUTOS_DE_SALA / 60} horas.`,
        "",
        `Entre aquí: ${urlAbsoluta(`/consulta/${consulta.token}`)}`,
      ].join("\n"),
    }).catch(() => {});
  }

  revalidatePath("/panel/consultas");
  return { ok: true, mensaje: "Sala abierta. Ya puede escribirle al paciente." };
}

// ----------------------------------------------------------------------
//  La conversación
// ----------------------------------------------------------------------

export async function escribirEnSala(
  consultaId: string,
  texto: string,
): Promise<Resultado> {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, motivo: "datos", mensaje: "Escriba algo primero." };
  if (limpio.length > LARGO_MAXIMO) {
    return { ok: false, motivo: "datos", mensaje: "El mensaje es demasiado largo." };
  }

  const consulta = await prisma.consulta.findUnique({ where: { id: consultaId } });
  if (!consulta) return { ok: false, mensaje: "Esa consulta ya no existe." };

  const sesion = await sesionActual();
  const paciente = await pacienteActual();

  let autor: "PACIENTE" | "MEDICO";
  if (paciente && paciente.id === consulta.pacienteId) {
    autor = "PACIENTE";
  } else if (
    sesion &&
    (sesion.profesionalId === consulta.profesionalId ||
      sesion.rol === "ADMINISTRADOR" ||
      sesion.rol === "RECEPCION")
  ) {
    autor = "MEDICO";
  } else {
    return { ok: false, motivo: "permiso", mensaje: "Esta sala no es suya." };
  }

  if (!admiteMensajes(consulta)) {
    return {
      ok: false,
      motivo: "estado",
      mensaje: "La sala ya está cerrada. Lo escrito se conserva y puede abrir otra consulta.",
    };
  }

  // La barrera clínica también adentro, pero solo para urgencias: dentro
  // de la sala sí hay un médico atendiendo, así que lo demás le toca a
  // él y no al sistema.
  if (autor === "PACIENTE") {
    const veredicto = evaluar(limpio);
    if (veredicto.accion === "urgencias") {
      await prisma.mensajeConsulta.create({
        data: { consultaId, autor: "SISTEMA", texto: veredicto.respuesta },
      });
    }
  }

  await prisma.mensajeConsulta.create({ data: { consultaId, autor, texto: limpio } });
  revalidatePath(`/consulta/${consulta.token}`);
  revalidatePath("/panel/consultas");
  return { ok: true, mensaje: "" };
}

// ----------------------------------------------------------------------
//  El cierre
// ----------------------------------------------------------------------

export async function cerrarSala(
  consultaId: string,
  motivoCierre = "Cerrada por el médico.",
): Promise<Resultado> {
  const sesion = await sesionActual();
  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: { profesional: { select: { nombre: true, slug: true } }, paciente: true },
  });
  if (!consulta) return { ok: false, mensaje: "Esa consulta ya no existe." };

  const esSuya =
    sesion &&
    (sesion.profesionalId === consulta.profesionalId ||
      sesion.rol === "ADMINISTRADOR" ||
      sesion.rol === "RECEPCION");
  if (!esSuya) return { ok: false, motivo: "permiso", mensaje: "Esa consulta no es suya." };
  if (consulta.estado !== "ACEPTADA") {
    return { ok: false, motivo: "estado", mensaje: "Esa sala no está abierta." };
  }

  await prisma.$transaction([
    prisma.consulta.update({
      where: { id: consultaId },
      data: { estado: "CERRADA", cerradaEn: new Date(), motivoCierre },
    }),
    prisma.mensajeConsulta.create({
      data: { consultaId, autor: "SISTEMA", texto: motivoCierre },
    }),
  ]);

  // Al cerrar se le pide su opinión. Es lo que convierte cada consulta en
  // reputación para el médico, y es la razón por la que las reseñas dejan
  // de ser algo que hay que perseguir.
  if (consulta.paciente.correo) {
    await enviarCorreo({
      para: consulta.paciente.correo,
      asunto: `¿Cómo le fue con ${consulta.profesional.nombre}?`,
      cuerpo: [
        `${consulta.paciente.nombre ?? "Hola"}:`,
        "",
        "Su consulta terminó. Lo que escribieron queda guardado y puede",
        "volver a leerlo cuando quiera desde su enlace.",
        "",
        "Su opinión le sirve al siguiente paciente que esté decidiendo:",
        urlAbsoluta(`/opinar/consulta/${consulta.token}`),
        "",
        sitio.nombre,
      ].join("\n"),
    }).catch(() => {});
  }

  revalidatePath("/panel/consultas");
  return { ok: true, mensaje: "Sala cerrada." };
}
