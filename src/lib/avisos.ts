/**
 * Envío de avisos.
 *
 * Dos destinatarios distintos y por eso dos textos distintos: al
 * profesional se le avisa que alguien busca consulta con él, y al paciente
 * se le recuerda su cita el día anterior.
 *
 * Mientras no haya proveedor de correo configurado, los avisos quedan en la
 * cola y el panel los muestra como pendientes. Es deliberado: marcarlos
 * como enviados sin haberlos enviado le haría creer al consultorio que el
 * médico ya está enterado.
 */

import { prisma } from "@/lib/prisma";
import { sitio } from "@/config/sitio";

const ZONA = 6 * 60 * 60_000; // Chihuahua, UTC−6 todo el año

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function cuandoLegible(fecha: Date): string {
  const local = new Date(fecha.getTime() - ZONA);
  const hora = `${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes(),
  ).padStart(2, "0")}`;
  return `${DIAS[local.getUTCDay()]} ${local.getUTCDate()} de ${
    MESES[local.getUTCMonth()]
  }, ${hora}`;
}

export type Correo = { para: string; asunto: string; cuerpo: string };

/**
 * Entrega un correo con el proveedor configurado.
 *
 * Devuelve `false` sin lanzar cuando no hay proveedor: el aviso se queda en
 * la cola y se intenta otra vez cuando el consultorio conecte su dominio.
 */
export async function enviarCorreo(correo: Correo): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  const remitente = process.env.CORREO_REMITENTE;
  if (!clave || !remitente) return false;

  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${sitio.nombre} <${remitente}>`,
      to: [correo.para],
      subject: correo.asunto,
      text: correo.cuerpo,
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`correo ${respuesta.status}: ${await respuesta.text()}`);
  }
  return true;
}

/** Procesa la cola de avisos pendientes. Devuelve cuántos salieron. */
export async function procesarAvisos(limite = 50): Promise<{
  enviados: number;
  pendientes: number;
  fallidos: number;
}> {
  const pendientes = await prisma.aviso.findMany({
    where: { estado: "PENDIENTE" },
    take: limite,
    orderBy: { creadoEn: "asc" },
    include: {
      cita: {
        include: {
          paciente: true,
          profesional: true,
          consultorio: { include: { ciudad: true } },
        },
      },
    },
  });

  let enviados = 0;
  let fallidos = 0;
  let sinProveedor = 0;

  for (const aviso of pendientes) {
    const { cita } = aviso;

    // El aviso al panel no se envía a ningún lado: existe para que la
    // bandeja muestre la cita aunque el profesional no tenga contacto.
    if (aviso.canal === "PANEL") {
      await prisma.aviso.update({
        where: { id: aviso.id },
        data: { estado: "ENVIADO", enviadoEn: new Date() },
      });
      enviados += 1;
      continue;
    }

    if (aviso.canal === "WHATSAPP") {
      // Requiere plantilla aprobada por Meta. Se conecta junto con el
      // asistente, en el tercer hito.
      sinProveedor += 1;
      continue;
    }

    try {
      const salio = await enviarCorreo({
        para: aviso.destino,
        asunto: `Nueva cita · ${cita.paciente.nombre ?? "paciente"} · ${cuandoLegible(
          cita.inicio,
        )}`,
        cuerpo: [
          `Doctor(a) ${cita.profesional.nombre}:`,
          "",
          `${cita.paciente.nombre ?? "Un paciente"} solicitó consulta con usted.`,
          "",
          `Cuándo: ${cuandoLegible(cita.inicio)}`,
          `Dónde: ${cita.consultorio.nombre}, ${cita.consultorio.ciudad.nombre}`,
          `Teléfono del paciente: ${cita.paciente.telefono}`,
          cita.motivo ? `Motivo: ${cita.motivo}` : "",
          "",
          `Puede ver y confirmar sus citas en ${sitio.nombre}.`,
        ]
          .filter(Boolean)
          .join("\n"),
      });

      if (!salio) {
        sinProveedor += 1;
        continue;
      }

      await prisma.aviso.update({
        where: { id: aviso.id },
        data: { estado: "ENVIADO", enviadoEn: new Date() },
      });
      enviados += 1;
    } catch (error) {
      fallidos += 1;
      await prisma.aviso.update({
        where: { id: aviso.id },
        data: { estado: "FALLIDO", detalle: String(error).slice(0, 300) },
      });
    }
  }

  return { enviados, pendientes: sinProveedor, fallidos };
}

/**
 * Recordatorios de las citas de mañana.
 *
 * Es lo que más ausencias evita, y por eso corre todos los días aunque no
 * haya nadie en el consultorio. Se marca la cita para no recordar dos veces
 * lo mismo.
 */
export async function recordarCitasDeManana(): Promise<{ recordadas: number }> {
  const ahora = new Date();
  const desde = new Date(ahora.getTime() + 20 * 60 * 60_000);
  const hasta = new Date(ahora.getTime() + 28 * 60 * 60_000);

  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ["AGENDADA", "CONFIRMADA"] },
      inicio: { gte: desde, lte: hasta },
      avisos: { none: { canal: "WHATSAPP", destino: { contains: "paciente" } } },
    },
    include: { paciente: true, consultorio: true },
  });

  for (const cita of citas) {
    await prisma.aviso.create({
      data: {
        citaId: cita.id,
        canal: "WHATSAPP",
        destino: `paciente:${cita.paciente.telefono}`,
      },
    });
  }

  return { recordadas: citas.length };
}
