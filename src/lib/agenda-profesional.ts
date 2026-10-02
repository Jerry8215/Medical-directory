"use server";

/**
 * La agenda desde el lado del profesional: confirmar, cancelar y ver quién
 * viene.
 *
 * Cancelar no borra la cita, la marca: el consultorio necesita poder
 * explicar después qué pasó con un paciente que se presentó igual.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

/** La cita es de quien la atiende, del administrador o de la recepción. */
async function puedeTocar(citaId: string): Promise<{ nombre: string } | null> {
  const sesion = await sesionActual();
  if (!sesion) return null;
  if (sesion.rol === "ADMINISTRADOR" || sesion.rol === "RECEPCION") {
    return { nombre: sesion.nombre };
  }

  const cita = await prisma.cita.findUnique({ where: { id: citaId } });
  if (cita && cita.profesionalId === sesion.profesionalId) {
    return { nombre: sesion.nombre };
  }
  return null;
}

export async function confirmarCita(id: string): Promise<Resultado> {
  const quien = await puedeTocar(id);
  if (!quien) return { ok: false, mensaje: "Esa cita no es suya." };

  await prisma.cita.update({ where: { id }, data: { estado: "CONFIRMADA" } });
  await prisma.registroAuditoria.create({
    data: { actor: quien.nombre, accion: "cita.confirmada", entidad: "cita", entidadId: id },
  });

  revalidatePath("/panel/mi-agenda");
  revalidatePath("/panel");
  return { ok: true, mensaje: "Cita confirmada." };
}

export async function cancelarCita(id: string, motivo: string): Promise<Resultado> {
  const quien = await puedeTocar(id);
  if (!quien) return { ok: false, mensaje: "Esa cita no es suya." };

  const cita = await prisma.cita.update({
    where: { id },
    data: { estado: "CANCELADA", motivo: motivo.trim() || null },
    include: { consultorio: true },
  });

  // El horario vuelve a ofrecerse en cuanto se regenere el perfil.
  revalidatePath("/panel/mi-agenda");
  revalidatePath("/panel");

  await prisma.registroAuditoria.create({
    data: {
      actor: quien.nombre,
      accion: "cita.cancelada",
      entidad: "cita",
      entidadId: id,
      detalle: motivo.trim(),
    },
  });

  return {
    ok: true,
    mensaje: `Cita cancelada. El horario vuelve a quedar libre en ${cita.consultorio.nombre}.`,
  };
}

export async function marcarAtendida(id: string): Promise<Resultado> {
  const quien = await puedeTocar(id);
  if (!quien) return { ok: false, mensaje: "Esa cita no es suya." };

  await prisma.cita.update({ where: { id }, data: { estado: "ATENDIDA" } });
  revalidatePath("/panel/mi-agenda");
  return { ok: true, mensaje: "Marcada como atendida." };
}

export async function marcarNoAsistio(id: string): Promise<Resultado> {
  const quien = await puedeTocar(id);
  if (!quien) return { ok: false, mensaje: "Esa cita no es suya." };

  await prisma.cita.update({ where: { id }, data: { estado: "NO_ASISTIO" } });
  await prisma.registroAuditoria.create({
    data: { actor: quien.nombre, accion: "cita.no_asistio", entidad: "cita", entidadId: id },
  });
  revalidatePath("/panel/mi-agenda");
  return { ok: true, mensaje: "Registrada la inasistencia." };
}
