"use server";

/**
 * Lista de espera: el horario que se libera no se queda vacío.
 *
 * Cuando un paciente cancela, su hueco vuelve al directorio y ahí se
 * queda hasta que alguien lo encuentre por casualidad. Con la lista, se
 * le ofrece primero a quien ya estaba esperando a ese médico.
 *
 * Dos reglas que definen el comportamiento. No se reserva el horario al
 * avisar: se le dice que quedó libre y gana quien agende, porque apartar
 * una hora para alguien que puede no contestar en todo el día vuelve a
 * dejar al médico con el hueco. Y se avisa por orden de llegada, que es
 * la única forma defendible de repartir algo escaso.
 */

import { revalidatePath } from "next/cache";

import { enviarCorreo } from "@/lib/avisos";
import { anotar, resolver } from "@/lib/novedades";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { telefonoMexicano } from "@/lib/validacion";
import { sitio, urlAbsoluta } from "@/config/sitio";

export type Resultado =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

/** Cuántas horas se le respeta el turno a quien ya fue avisado. */
const HORAS_DE_CORTESIA = 12;

/**
 * Anotarse en la lista. Lo puede hacer el paciente desde el perfil, sin
 * crear cuenta: basta su teléfono, que es con lo que se le avisa.
 */
export async function anotarseEnEspera(datos: {
  slug: string;
  nombre: string;
  telefono: string;
  nota?: string;
}): Promise<Resultado> {
  const tel = telefonoMexicano(datos.telefono);
  if (!tel.ok) return { ok: false, mensaje: tel.motivo };

  const profesional = await prisma.profesional.findUnique({
    where: { slug: datos.slug },
    select: { id: true, nombre: true },
  });
  if (!profesional) return { ok: false, mensaje: "Ese médico ya no está disponible." };

  const paciente = await prisma.paciente.upsert({
    where: { telefono: tel.valor },
    create: { telefono: tel.valor, nombre: datos.nombre.trim() || null },
    update: datos.nombre.trim() ? { nombre: datos.nombre.trim() } : {},
  });

  // Anotarse dos veces con el mismo médico no adelanta el turno.
  const yaEstaba = await prisma.enEspera.findFirst({
    where: { profesionalId: profesional.id, pacienteId: paciente.id, cerradoEn: null },
    select: { id: true },
  });
  if (yaEstaba) {
    return { ok: true, mensaje: "Ya está en la lista. Le avisamos en cuanto se libere un horario." };
  }

  const espera = await prisma.enEspera.create({
    data: {
      profesionalId: profesional.id,
      pacienteId: paciente.id,
      nota: datos.nota?.trim() || null,
    },
  });

  await anotar({
    tipo: "CITA_NUEVA",
    titulo: `${datos.nombre.trim() || "Un paciente"} se anotó en la lista de espera`,
    detalle: `Espera consulta con ${profesional.nombre} · tel. ${tel.valor}`,
    enlace: "/panel/mi-agenda",
    profesionalId: profesional.id,
    // Para que el aviso se apague al sacarlo de la lista.
    referencia: espera.id,
  });

  revalidatePath("/panel/mi-agenda");
  return {
    ok: true,
    mensaje: "Quedó anotado. Le avisamos en cuanto se libere un horario con ese médico.",
  };
}

/**
 * Avisar al siguiente de la lista que se liberó un horario.
 *
 * Se llama al cancelarse una cita. Devuelve a quién se le avisó, o nada
 * si no había nadie esperando: un hueco sin lista no es un problema, es
 * simplemente un hueco.
 */
export async function ofrecerHueco(
  profesionalId: string,
  cuando: Date,
): Promise<{ avisado: string | null }> {
  const limite = new Date(Date.now() - HORAS_DE_CORTESIA * 3_600_000);

  const siguiente = await prisma.enEspera.findFirst({
    where: {
      profesionalId,
      cerradoEn: null,
      // Quien ya fue avisado hace poco conserva su turno: ofrecerle dos
      // huecos seguidos a la misma persona deja al resto sin ninguno.
      OR: [{ avisadoEn: null }, { avisadoEn: { lt: limite } }],
    },
    orderBy: { creadoEn: "asc" },
    include: {
      paciente: { select: { nombre: true, correo: true, bajaEn: true } },
      profesional: { select: { nombre: true, slug: true } },
    },
  });

  if (!siguiente || siguiente.paciente.bajaEn) return { avisado: null };

  await prisma.enEspera.update({
    where: { id: siguiente.id },
    data: { avisadoEn: new Date() },
  });

  if (siguiente.paciente.correo) {
    await enviarCorreo({
      para: siguiente.paciente.correo,
      asunto: `Se liberó un horario con ${siguiente.profesional.nombre}`,
      cuerpo: [
        `${siguiente.paciente.nombre ?? "Hola"}:`,
        "",
        `Se desocupó un horario con ${siguiente.profesional.nombre}:`,
        `${cuando.toLocaleDateString("es-MX")} a las ${cuando.toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        })}.`,
        "",
        "No se lo apartamos: queda para quien agende primero, así que si le",
        "sirve conviene tomarlo ahora.",
        "",
        `Agendar: ${urlAbsoluta(`/medico/${siguiente.profesional.slug}`)}`,
        "",
        `${sitio.nombre}`,
      ].join("\n"),
    }).catch(() => {
      // Sin correo sale el aviso al consultorio igual, abajo.
    });
  }

  await anotar({
    tipo: "CITA_CANCELADA",
    titulo: `Se liberó un horario con ${siguiente.profesional.nombre}`,
    detalle: `Avisado: ${siguiente.paciente.nombre ?? "paciente"} de la lista de espera.`,
    enlace: "/panel/mi-agenda",
    profesionalId,
    referencia: siguiente.id,
  });

  return { avisado: siguiente.paciente.nombre ?? "un paciente en espera" };
}

/** Sacar a alguien de la lista: ya se atendió o ya no le interesa. */
export async function cerrarEspera(id: string): Promise<Resultado> {
  const sesion = await sesionActual();
  const espera = await prisma.enEspera.findUnique({ where: { id } });
  if (!espera) return { ok: false, mensaje: "Ese registro ya no existe." };

  const esEquipo = sesion?.rol === "ADMINISTRADOR" || sesion?.rol === "RECEPCION";
  if (!esEquipo && sesion?.profesionalId !== espera.profesionalId) {
    return { ok: false, mensaje: "No tiene permiso sobre esta lista." };
  }

  await prisma.enEspera.update({ where: { id }, data: { cerradoEn: new Date() } });
  await resolver(id);
  revalidatePath("/panel/mi-agenda");
  return { ok: true, mensaje: "Salió de la lista de espera." };
}
