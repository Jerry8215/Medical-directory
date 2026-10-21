"use server";

/**
 * Apartar una hora suelta.
 *
 * El consultorio describió el caso con precisión: le agendan por teléfono
 * o por WhatsApp y necesita apartar ese hueco en el momento, antes de que
 * el sitio se lo ofrezca a otro paciente y termine con dos personas a la
 * misma hora. Cerrar el día entero no servía, porque el resto de la tarde
 * sigue libre.
 *
 * Una hora apartada cuenta exactamente igual que una cita: la lee
 * `ocupadosDe`, de modo que desaparece de lo que ve el paciente, del
 * asistente de WhatsApp y de la comprobación que corre al reservar. No
 * hay una segunda regla que mantener en pie.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Quien puede apartar: el propio médico o el equipo del consultorio. */
async function permiso(consultorioId: string): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  if (s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION") return { nombre: s.nombre };

  const suyo = await prisma.consultorio.findUnique({
    where: { id: consultorioId },
    select: { profesionalId: true },
  });
  return suyo && suyo.profesionalId === s.profesionalId ? { nombre: s.nombre } : null;
}

export async function apartarHora(
  consultorioId: string,
  fecha: string,
  hora: string,
  motivo: string,
): Promise<Resultado> {
  const quien = await permiso(consultorioId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso sobre esta agenda." };

  if (!FECHA.test(fecha)) return { ok: false, mensaje: "Elija el día." };
  if (!HORA.test(hora)) return { ok: false, mensaje: "Elija la hora." };

  const limpio = motivo.trim().slice(0, 140);

  try {
    await prisma.horaCerrada.create({
      data: {
        consultorioId,
        fecha,
        hora,
        motivo: limpio || null,
        creadaPor: quien.nombre,
      },
    });
  } catch {
    // Apartar dos veces el mismo hueco no es un error del médico, es un
    // doble clic: la restricción única lo vuelve inofensivo y aquí se
    // responde como si hubiera funcionado, porque para él funcionó.
    return { ok: true, mensaje: "Esa hora ya estaba apartada." };
  }

  await registrar(quien.nombre, "agenda.hora.apartada", `${fecha} ${hora}`);
  refrescar();
  return { ok: true, mensaje: `Apartada la hora de las ${hora}.` };
}

export async function liberarHora(id: string): Promise<Resultado> {
  const apartada = await prisma.horaCerrada.findUnique({
    where: { id },
    select: { consultorioId: true, fecha: true, hora: true },
  });
  if (!apartada) return { ok: false, mensaje: "Esa hora ya no está apartada." };

  const quien = await permiso(apartada.consultorioId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso sobre esta agenda." };

  await prisma.horaCerrada.delete({ where: { id } });
  await registrar(
    quien.nombre,
    "agenda.hora.liberada",
    `${apartada.fecha} ${apartada.hora}`,
  );
  refrescar();
  return { ok: true, mensaje: `La hora de las ${apartada.hora} vuelve a ofrecerse.` };
}

async function registrar(actor: string, accion: string, detalle: string) {
  await prisma.registroAuditoria.create({ data: { actor, accion, detalle } });
}

function refrescar() {
  revalidatePath("/panel/mi-agenda");
  // La ficha del médico se sirve guardada: sin esto, el hueco apartado
  // seguiría ofreciéndose hasta media hora después, que es justo el rato
  // en el que llamaría el segundo paciente.
  revalidatePath("/medico/[slug]", "page");
}
