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
import {
  DIAS_DE_AVISO,
  DIAS_DE_AVISO_TARJETA,
  diasRestantes,
  pesos,
} from "@/lib/suscripciones";
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
      // Gmail agrupa en una sola conversación los correos que comparten
      // asunto y remitente. Con cinco altas seguidas, los cinco avisos
      // caían apilados dentro de un hilo ya leído: el médico no veía
      // llegar nada y daba por perdida su contraseña. Esta cabecera le
      // dice al cliente de correo que cada uno es cosa aparte.
      headers: {
        "X-Entity-Ref-ID": `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 10)}`,
      },
    }),
  });

  if (!respuesta.ok) {
    throw new Error(`correo ${respuesta.status}: ${await respuesta.text()}`);
  }
  return true;
}

/**
 * El destino de un aviso dirigido al paciente lleva este prefijo.
 *
 * El mismo aviso puede ir a un correo o a un WhatsApp, y quien lo entrega
 * necesita saber a quién le está escribiendo para redactarlo: no es lo
 * mismo avisarle al médico que le agendaron una consulta que avisarle al
 * paciente que la suya quedó hecha.
 */
export const A_PACIENTE = "paciente:";

/** Marca el aviso de la víspera, para no mandarlo dos veces. */
export const RECORDATORIO = "Recordatorio";

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

    // El aviso al paciente lleva el prefijo en el destino. Hasta ahora el
    // paciente no recibía absolutamente nada: la confirmación y el
    // recordatorio salían por WhatsApp, que no está conectado, así que el
    // sitio prometía dos mensajes que nunca llegaban.
    const paraPaciente = aviso.destino.startsWith(A_PACIENTE);
    const destino = paraPaciente
      ? aviso.destino.slice(A_PACIENTE.length)
      : aviso.destino;

    if (!destino.includes("@")) {
      // Un teléfono en un aviso de correo: se queda esperando a que haya
      // por dónde mandarlo, en lugar de darse por enviado.
      sinProveedor += 1;
      continue;
    }

    try {
      const esRecordatorio = aviso.detalle === RECORDATORIO;
      const salio = await enviarCorreo({
        para: destino,
        asunto: !paraPaciente
          ? `Nueva cita · ${cita.paciente.nombre ?? "paciente"} · ${cuandoLegible(
              cita.inicio,
            )}`
          : esRecordatorio
            ? `Recordatorio: su cita de mañana con ${cita.profesional.nombre}`
            : `Su cita con ${cita.profesional.nombre} · ${cuandoLegible(cita.inicio)}`,
        cuerpo: (paraPaciente
          ? [
              `${cita.paciente.nombre ?? "Hola"}:`,
              "",
              esRecordatorio
                ? `Le recordamos su consulta de mañana con ${cita.profesional.nombre}.`
                : `Su consulta con ${cita.profesional.nombre} quedó agendada.`,
              "",
              `Cuándo: ${cuandoLegible(cita.inicio)}`,
              `Dónde: ${cita.consultorio.nombre}, ${cita.consultorio.ciudad.nombre}`,
              `Dirección: ${cita.consultorio.direccion}`,
              "",
              "Si no puede asistir, cancélela desde aquí y el horario queda",
              "libre para otro paciente. Desde ese mismo enlace puede cambiar",
              "su hora sin llamar al consultorio:",
              urlAbsoluta(`/cita/${cita.token}`),
              "",
              sitio.nombre,
            ]
          : [
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
            ])
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
      avisos: { none: { detalle: RECORDATORIO } },
      // Quien ejerció su derecho de oposición deja de recibir avisos. El
      // campo existía desde el principio y nadie lo leía, así que darse de
      // baja no servía de nada.
      paciente: { bajaEn: null },
    },
    include: { paciente: true, consultorio: true },
  });

  for (const cita of citas) {
    // Por correo si dejó uno; si no, queda encolado para WhatsApp, que es
    // lo único que le llegaría y todavía no está conectado.
    const porCorreo = Boolean(cita.paciente.correo);
    await prisma.aviso.create({
      data: {
        citaId: cita.id,
        canal: porCorreo ? "CORREO" : "WHATSAPP",
        destino: `${A_PACIENTE}${porCorreo ? cita.paciente.correo : cita.paciente.telefono}`,
        detalle: RECORDATORIO,
      },
    });
  }

  return { recordadas: citas.length };
}

/**
 * Avisa al médico que su plan está por vencer, y el día que venció.
 *
 * Corre con la tarea diaria, así que tiene que poder repetirse sin
 * molestar dos veces por lo mismo: cada aviso queda asentado en la
 * auditoría con la fecha de vencimiento que lo motivó, y antes de mandar
 * nada se comprueba que ese asiento no exista. Si el consultorio corre la
 * tarea a mano tres veces el mismo día, el médico recibe un solo correo.
 *
 * Vencer no suspende el perfil. El profesional sigue publicado y solo
 * pierde las herramientas del plan, de modo que el aviso informa y no
 * amenaza.
 */
export async function avisarVencimientos(): Promise<{
  avisados: number;
  pendientes: number;
}> {
  const ahora = new Date();
  const limite = new Date(ahora.getTime() + DIAS_DE_AVISO * 86_400_000);

  const porVencer = await prisma.profesional.findMany({
    where: {
      plan: { not: "BASICO" },
      planHasta: { not: null, lte: limite },
    },
    select: {
      id: true,
      nombre: true,
      correo: true,
      plan: true,
      planHasta: true,
      suscripcionEstado: true,
    },
  });

  let avisados = 0;
  let pendientes = 0;

  for (const p of porVencer) {
    if (!p.planHasta) continue;
    const dias = diasRestantes(p.planHasta, ahora) ?? 0;
    const momento = dias < 0 ? "vencido" : "por-vencer";
    const marca = `${p.id}:${momento}:${p.planHasta.toISOString().slice(0, 10)}`;

    // A quien paga con tarjeta no se le pide que renueve: se le avisa que
    // se le va a cobrar, y más cerca de la fecha, para que el aviso llegue
    // cuando todavía puede darlo de baja si ya no lo quiere.
    const conTarjeta = p.suscripcionEstado === "authorized";
    if (conTarjeta && momento === "por-vencer" && dias > DIAS_DE_AVISO_TARJETA) {
      continue;
    }

    const yaAvisado = await prisma.registroAuditoria.findFirst({
      where: { accion: "plan.aviso", entidadId: marca },
      select: { id: true },
    });
    if (yaAvisado) continue;

    if (!p.correo) {
      pendientes += 1;
      continue;
    }

    const cuando = p.planHasta.toLocaleDateString("es-MX");

    // Lo que se le va a cobrar es lo último que se le cobró: es lo que
    // autorizó, y anunciarle una cifra distinta de la que verá en su
    // estado de cuenta sería peor que no anunciar ninguna.
    const ultimoCobro = conTarjeta
      ? await prisma.pago.findFirst({
          where: { profesionalId: p.id, medio: "TARJETA", estado: "ACREDITADO" },
          orderBy: { creadoEn: "desc" },
          select: { importe: true },
        })
      : null;

    const texto = conTarjeta
      ? momento === "vencido"
        ? [
            `Doctor(a) ${p.nombre}:`,
            "",
            `No pudimos cobrar la renovación de su plan ${p.plan}, que venció el ${cuando}.`,
            "",
            "Su perfil sigue publicado y los pacientes lo siguen encontrando: lo que se",
            "pausó son las herramientas del plan. Revise su tarjeta o pague por depósito",
            "desde su panel.",
            "",
            `Su plan: ${urlAbsoluta("/panel/mi-plan")}`,
          ]
        : [
            `Doctor(a) ${p.nombre}:`,
            "",
            `Su plan ${p.plan} se renueva el ${cuando}, en ${dias} día(s), y se cobrará`,
            `a la tarjeta que autorizó${ultimoCobro ? `: ${pesos(ultimoCobro.importe)}` : ""}.`,
            "",
            "No tiene que hacer nada. Si prefiere que no se renueve, dé de baja el cobro",
            "automático antes de esa fecha: conserva el plan hasta el último día pagado.",
            "",
            `Su plan: ${urlAbsoluta("/panel/mi-plan")}`,
          ]
      : momento === "vencido"
        ? [
            `Doctor(a) ${p.nombre}:`,
            "",
            `Su plan ${p.plan} venció el ${cuando}.`,
            "",
            "Su perfil sigue publicado y los pacientes lo siguen encontrando: lo que se",
            "pausó son las herramientas del plan. Puede renovarlo cuando guste desde su panel.",
            "",
            `Renovar: ${urlAbsoluta("/panel")}`,
          ]
        : [
            `Doctor(a) ${p.nombre}:`,
            "",
            `Su plan ${p.plan} vence el ${cuando}, en ${dias} día(s).`,
            "",
            "Si lo renueva antes de esa fecha no pierde los días que le quedan: el nuevo",
            "periodo se suma al final del actual.",
            "",
            `Renovar: ${urlAbsoluta("/panel")}`,
          ];

    try {
      const salio = await enviarCorreo({
        para: p.correo,
        asunto:
          momento === "vencido"
            ? conTarjeta
              ? `No se pudo renovar su plan ${p.plan}`
              : `Su plan ${p.plan} venció`
            : conTarjeta
              ? `Su plan ${p.plan} se renueva en ${dias} día(s)`
              : `Su plan ${p.plan} vence en ${dias} día(s)`,
        cuerpo: texto.join("\n"),
      });
      if (!salio) {
        pendientes += 1;
        continue;
      }
    } catch (error) {
      console.error("[vencimientos] no se pudo avisar", error);
      pendientes += 1;
      continue;
    }

    await prisma.registroAuditoria.create({
      data: {
        actor: "sistema",
        accion: "plan.aviso",
        entidad: "profesional",
        entidadId: marca,
        detalle: `${conTarjeta ? "Tarjeta" : "Depósito"} · ${
          momento === "vencido" ? "vencimiento" : `aviso previo, ${dias} día(s)`
        }`,
      },
    });
    avisados += 1;
  }

  return { avisados, pendientes };
}

/**
 * Le pide su opinión a quien se atendió ayer.
 *
 * Es lo que hace crecer al directorio: una ficha sin opiniones pesa poco
 * para el paciente que compara y para Google, que ordena los resultados
 * locales en buena medida por eso. Pedirla a mano no escala y pedírsela a
 * cualquiera la vuelve sospechosa; pedírsela sola a quien sí tuvo cita es
 * lo que la hace creíble.
 *
 * Tres cuidados. Se pide una sola vez por cita, y queda asentado para que
 * correr la tarea dos veces no mande dos correos. No se le pide a quien
 * ejerció su derecho de oposición. Y no se le pide a quien no se presentó:
 * invitar a opinar a alguien que faltó a su cita es pedir una mala reseña.
 */
export async function pedirOpiniones(limite = 40): Promise<{
  pedidas: number;
  pendientes: number;
}> {
  const ahora = new Date();
  const { desde, hasta } = ayer(ahora);

  const citas = await prisma.cita.findMany({
    where: {
      inicio: { gte: desde, lt: hasta },
      estado: { in: ["ATENDIDA", "CONFIRMADA"] },
      paciente: { bajaEn: null },
    },
    take: limite,
    include: {
      paciente: { select: { nombre: true, correo: true } },
      profesional: { select: { nombre: true } },
    },
  });

  let pedidas = 0;
  let pendientes = 0;

  for (const cita of citas) {
    const yaPedida = await prisma.registroAuditoria.findFirst({
      where: { accion: "opinion.solicitada", entidadId: cita.id },
      select: { id: true },
    });
    if (yaPedida) continue;

    const yaOpino = await prisma.opinion.findUnique({ where: { citaId: cita.id } });
    if (yaOpino) continue;

    if (!cita.paciente.correo) {
      pendientes += 1;
      continue;
    }

    try {
      const salio = await enviarCorreo({
        para: cita.paciente.correo,
        asunto: `¿Cómo le fue con ${cita.profesional.nombre}?`,
        cuerpo: [
          `${cita.paciente.nombre ?? "Hola"}:`,
          "",
          `Ayer tuvo su consulta con ${cita.profesional.nombre}. Si tiene un`,
          "minuto, su opinión le sirve al siguiente paciente que esté decidiendo.",
          "",
          `Dejar su opinión: ${urlAbsoluta(`/opinar/${cita.token}`)}`,
          "",
          "Se publica después de una revisión. Si prefiere no recibir estos",
          "mensajes, respóndanos y lo damos de baja.",
        ].join("\n"),
      });
      if (!salio) {
        pendientes += 1;
        continue;
      }
    } catch (error) {
      console.error("[opiniones] no se pudo pedir", error);
      pendientes += 1;
      continue;
    }

    await prisma.registroAuditoria.create({
      data: {
        actor: "sistema",
        accion: "opinion.solicitada",
        entidad: "cita",
        entidadId: cita.id,
        detalle: `Se le pidió su opinión sobre ${cita.profesional.nombre}.`,
      },
    });
    pedidas += 1;
  }

  return { pedidas, pendientes };
}

/** El día de ayer completo, en hora de Chihuahua. */
export function ayer(ahora: Date): { desde: Date; hasta: Date } {
  const local = new Date(ahora.getTime() - ZONA);
  const inicio = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - 1,
  );
  return {
    desde: new Date(inicio + ZONA),
    hasta: new Date(inicio + ZONA + 24 * 60 * 60_000),
  };
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
