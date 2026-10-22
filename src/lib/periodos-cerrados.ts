"use server";

/**
 * Vacaciones, congresos y ausencias.
 *
 * Cerrar un periodo no borra nada: las citas que ya estaban agendadas
 * siguen ahí y el médico decide qué hace con ellas. Lo único que cambia
 * es que esos días dejan de ofrecerse a pacientes nuevos. Borrarlas
 * automáticamente sería decidir por él sobre gente que ya tenía su cita.
 */

import { revalidatePath } from "next/cache";

import { diasDelPeriodo } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado =
  | { ok: true; mensaje: string }
  | { ok: false; mensaje: string };

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Quien puede cerrar días: el propio médico o el equipo. */
async function permiso(profesionalId: string): Promise<{ nombre: string } | null> {
  const s = await sesionActual();
  if (!s) return null;
  if (s.rol === "ADMINISTRADOR" || s.rol === "RECEPCION") return { nombre: s.nombre };
  return s.profesionalId === profesionalId ? { nombre: s.nombre } : null;
}

export async function cerrarPeriodo(
  profesionalId: string,
  desde: string,
  hasta: string,
  motivo: string,
): Promise<Resultado> {
  const quien = await permiso(profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para cerrar esta agenda." };

  if (!FECHA.test(desde) || !FECHA.test(hasta)) {
    return { ok: false, mensaje: "Elija las dos fechas del periodo." };
  }
  if (hasta < desde) {
    return { ok: false, mensaje: "La fecha final no puede ser anterior a la inicial." };
  }
  if (diasDelPeriodo(desde, hasta).length > 180) {
    return { ok: false, mensaje: "Un periodo cerrado no puede pasar de seis meses." };
  }

  // Las citas ya agendadas se avisan, no se borran: es el médico quien
  // decide si las reprograma o las atiende de todos modos.
  const comprometidas = await prisma.cita.count({
    where: {
      profesionalId,
      estado: { in: ["AGENDADA", "CONFIRMADA"] },
      inicio: { gte: new Date(`${desde}T00:00:00Z`), lt: new Date(`${hasta}T23:59:59Z`) },
    },
  });

  // Cerrar dos veces el mismo tramo no es una decisión nueva, es un doble
  // clic. La lista se llenaba de filas idénticas que había que reabrir una
  // por una.
  const repetido = await prisma.periodoCerrado.findFirst({
    where: { profesionalId, desde, hasta },
    select: { id: true },
  });
  if (repetido) {
    return { ok: true, mensaje: "Esos días ya estaban cerrados." };
  }

  await prisma.periodoCerrado.create({
    data: { profesionalId, desde, hasta, motivo: motivo.trim() || null },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "agenda.cerrada",
      entidad: "profesional",
      entidadId: profesionalId,
      detalle: `Del ${desde} al ${hasta}${motivo.trim() ? ` · ${motivo.trim()}` : ""}`,
    },
  });

  revalidatePath("/panel/mi-agenda");

  return {
    ok: true,
    mensaje:
      comprometidas > 0
        ? `Periodo cerrado. Ojo: ya hay ${comprometidas} cita(s) agendada(s) en esas fechas y no se cancelaron solas.`
        : "Periodo cerrado. Esos días dejan de ofrecerse a pacientes nuevos.",
  };
}

export async function abrirPeriodo(id: string): Promise<Resultado> {
  const periodo = await prisma.periodoCerrado.findUnique({ where: { id } });
  if (!periodo) return { ok: false, mensaje: "Ese periodo ya no existe." };

  const quien = await permiso(periodo.profesionalId);
  if (!quien) return { ok: false, mensaje: "No tiene permiso para cambiar esta agenda." };

  await prisma.periodoCerrado.delete({ where: { id } });
  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "agenda.reabierta",
      entidad: "profesional",
      entidadId: periodo.profesionalId,
      detalle: `Del ${periodo.desde} al ${periodo.hasta}`,
    },
  });

  revalidatePath("/panel/mi-agenda");
  return { ok: true, mensaje: "Periodo reabierto. Esos días vuelven a ofrecerse." };
}
