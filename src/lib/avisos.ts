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
import { sitio, urlAbsoluta } from "@/config/sitio";

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
  if (!clave) return false;

  // Mientras el dominio no esté verificado ante el proveedor, se usa su
  // remitente compartido, que solo puede escribirle a la cuenta dueña de la
  // clave. Alcanza para los avisos al consultorio y evita bloquear todo
  // esperando unos registros de DNS.
  const remitente = process.env.CORREO_REMITENTE ?? "onboarding@resend.dev";

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
          `La cita: ${urlAbsoluta(`/cita/${cita.token}`)}`,
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
 * Las novedades del consultorio, por correo.
 *
 * Lo que se ve en el panel se manda también al correo del consultorio, para
 * quien no lo abre todos los días. Si no hay proveedor configurado no se
 * marcan como avisadas: se reintentan después en lugar de perderse, que es
 * justamente lo que el consultorio reportó que pasaba.
 */
export async function avisarNovedades(limite = 30): Promise<{
  avisadas: number;
  pendientes: number;
  motivo?: string;
}> {
  const destino = process.env.CORREO_CONSULTORIO;
  const novedades = await prisma.novedad.findMany({
    where: { avisadaEn: null },
    orderBy: { creadaEn: "asc" },
    take: limite,
  });

  if (novedades.length === 0) return { avisadas: 0, pendientes: 0 };
  if (!destino) {
    return {
      avisadas: 0,
      pendientes: novedades.length,
      motivo: "falta la dirección del consultorio",
    };
  }

  const lineas = novedades.map(
    (n) => `· ${n.titulo}${n.detalle ? `
  ${n.detalle}` : ""}`,
  );

  try {
    const salio = await enviarCorreo({
      para: destino,
      asunto:
        novedades.length === 1
          ? novedades[0].titulo
          : `${novedades.length} novedades en ${sitio.nombre}`,
      cuerpo: [
        novedades.length === 1
          ? "Esto acaba de ocurrir en el directorio:"
          : "Esto ocurrió en el directorio:",
        "",
        ...lineas,
        "",
        `Puede revisarlas en ${urlAbsoluta("/panel")}`,
      ].join("\n"),
    });

    if (!salio) {
      return {
        avisadas: 0,
        pendientes: novedades.length,
        motivo: "falta la llave del proveedor de correo",
      };
    }

    await prisma.novedad.updateMany({
      where: { id: { in: novedades.map((n) => n.id) } },
      data: { avisadaEn: new Date() },
    });
    return { avisadas: novedades.length, pendientes: 0 };
  } catch (error) {
    // El motivo viaja en la respuesta y no solo al registro: la tarea
    // corre sin nadie mirando, y un fallo mudo del correo fue justo lo que
    // dejó al consultorio sin enterarse de las altas.
    console.error("[novedades] no se pudieron avisar", error);
    return {
      avisadas: 0,
      pendientes: novedades.length,
      motivo: String(error).slice(0, 300),
    };
  }
}

/**
 * El día de mañana completo, en hora de Chihuahua.
 *
 * La tarea corre una vez al día, de madrugada temprano, así que la ventana
 * tiene que ser el día entero y no unas horas sueltas: de lo contrario el
 * paciente de las seis de la tarde nunca recibiría su recordatorio.
 */
export function manana(ahora: Date): { desde: Date; hasta: Date } {
  const local = new Date(ahora.getTime() - ZONA);
  const inicio = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() + 1,
  );
  return {
    desde: new Date(inicio + ZONA),
    hasta: new Date(inicio + ZONA + 24 * 60 * 60_000),
  };
}

/**
 * Recordatorios de las citas de mañana.
 *
 * Es lo que más ausencias evita, y por eso corre todos los días aunque no
 * haya nadie en el consultorio. Se marca la cita para no recordar dos veces
 * lo mismo.
 */
export async function recordarCitasDeManana(
  ahora = new Date(),
): Promise<{ recordadas: number }> {
  const { desde, hasta } = manana(ahora);

  const citas = await prisma.cita.findMany({
    where: {
      estado: { in: ["AGENDADA", "CONFIRMADA"] },
      inicio: { gte: desde, lt: hasta },
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

/**
 * Entrega lo pendiente en el momento, sin esperar a la tarea diaria.
 *
 * El plan de alojamiento solo admite una tarea programada por día, así que
 * confiar los avisos únicamente a ella significaría que el consultorio se
 * entera de una solicitud de alta hasta la mañana siguiente, que es
 * exactamente lo que reportó. Por eso el aviso sale junto con el hecho que
 * lo origina y la tarea diaria queda como red de seguridad para lo que
 * haya fallado.
 *
 * Nunca lanza ni se cuelga: si el proveedor de correo no responde, la cita
 * o el alta ya quedaron guardadas y el aviso se reintenta solo.
 */
export async function entregarPendientes(espera = 5000): Promise<void> {
  // El catch va pegado al trabajo y no al race: si el proveedor tarda más
  // que la espera y falla después, el rechazo ya tiene quien lo atienda.
  const trabajo = (async () => {
    await procesarAvisos(10);
    await avisarNovedades(10);
  })().catch((error) => {
    console.error("[avisos] no se pudieron entregar", error);
  });

  let reloj: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    trabajo,
    new Promise((listo) => {
      reloj = setTimeout(listo, espera);
    }),
  ]);
  if (reloj) clearTimeout(reloj);
}
