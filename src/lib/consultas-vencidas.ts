/**
 * Cerrar lo que el reloj ya cerró.
 *
 * `situacion()` dice en qué punto está una consulta contando el tiempo,
 * pero eso solo se nota cuando alguien abre la pantalla. Sin esta tarea,
 * una sala que se quedó sin tiempo a las tres de la mañana sigue figurando
 * como abierta hasta que alguien entra a mirarla, y una consulta que nadie
 * aceptó nunca llega al estado que dispara la devolución.
 *
 * Corre con la tarea diaria y es idempotente: lo que ya está cerrado no se
 * vuelve a cerrar.
 *
 * No vive en un archivo de acciones a propósito: cierra consultas y
 * dispara devoluciones, y nada de eso debe colgar de una dirección que el
 * navegador pueda invocar.
 */

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { venceLaEsperaEn } from "@/lib/consulta-reglas";
import { prisma } from "@/lib/prisma";

export async function cerrarConsultasVencidas(ahora = new Date()): Promise<{
  salasCerradas: number;
  sinRespuesta: number;
}> {
  // 1. Las salas a las que se les acabó el tiempo.
  const acabadas = await prisma.consulta.findMany({
    where: { estado: "ACEPTADA", cierraEn: { lte: ahora } },
    include: {
      paciente: { select: { nombre: true, correo: true } },
      profesional: { select: { nombre: true } },
    },
    take: 100,
  });

  for (const c of acabadas) {
    await prisma.$transaction([
      prisma.consulta.update({
        where: { id: c.id },
        data: {
          estado: "CERRADA",
          cerradaEn: ahora,
          motivoCierre: "Se cumplieron las dos horas de la sala.",
        },
      }),
      prisma.mensajeConsulta.create({
        data: {
          consultaId: c.id,
          autor: "SISTEMA",
          texto: "Se cumplieron las dos horas. Lo escrito se conserva.",
        },
      }),
    ]);

    if (c.paciente.correo) {
      await enviarCorreo({
        para: c.paciente.correo,
        asunto: `¿Cómo le fue con ${c.profesional.nombre}?`,
        cuerpo: [
          `${c.paciente.nombre ?? "Hola"}:`,
          "",
          "Su consulta terminó. Lo que escribieron queda guardado y puede",
          "volver a leerlo cuando quiera desde su enlace.",
          "",
          "Su opinión le sirve al siguiente paciente que esté decidiendo:",
          urlAbsoluta(`/opinar/consulta/${c.token}`),
          "",
          sitio.nombre,
        ].join("\n"),
      }).catch(() => {});
    }
  }

  // 2. Las que nadie aceptó dentro del plazo. Es el riesgo principal del
  //    cobro por delante: el paciente pagó y no apareció nadie.
  const esperando = await prisma.consulta.findMany({
    where: { estado: "PAGADA" },
    include: {
      paciente: { select: { nombre: true, correo: true } },
      profesional: { select: { nombre: true } },
    },
    take: 100,
  });

  let sinRespuesta = 0;
  for (const c of esperando) {
    if (venceLaEsperaEn(c.creadaEn) > ahora) continue;

    await prisma.consulta.update({
      where: { id: c.id },
      data: {
        estado: "VENCIDA",
        cerradaEn: ahora,
        motivoCierre: "Nadie aceptó dentro del plazo. Se devuelve el importe.",
      },
    });

    // La devolución en sí la hace el procesador cuando esté conectado.
    // Queda asentada para que no dependa de que alguien la recuerde.
    await prisma.registroAuditoria.create({
      data: {
        actor: "sistema",
        accion: "consulta.por_devolver",
        entidad: "consulta",
        entidadId: c.id,
        detalle: `${c.profesional.nombre} no aceptó · ${c.precio} centavos`,
      },
    });

    if (c.paciente.correo) {
      await enviarCorreo({
        para: c.paciente.correo,
        asunto: "Su consulta no pudo atenderse",
        cuerpo: [
          `${c.paciente.nombre ?? "Hola"}:`,
          "",
          `${c.profesional.nombre} no alcanzó a entrar a su consulta, así que`,
          "se le devuelve el importe completo.",
          "",
          "Si quiere, elija otro médico: lo que escribió se conserva y no",
          "tiene que redactarlo de nuevo.",
          "",
          urlAbsoluta("/medicos"),
          "",
          sitio.nombre,
        ].join("\n"),
      }).catch(() => {});
    }

    sinRespuesta += 1;
  }

  return { salasCerradas: acabadas.length, sinRespuesta };
}
