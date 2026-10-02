/**
 * Lo que el panel necesita saber de la operación: lo que entró por el sitio
 * y todavía espera a una persona.
 */

import { prisma } from "@/lib/prisma";

export async function solicitudesPendientes() {
  return prisma.solicitudAlta.findMany({
    where: { estado: { in: ["RECIBIDA", "EN_VERIFICACION"] } },
    orderBy: { creadaEn: "desc" },
    take: 20,
  });
}

export async function proximasCitas() {
  return prisma.cita.findMany({
    where: {
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: new Date() },
    },
    orderBy: { inicio: "asc" },
    take: 15,
    include: {
      paciente: true,
      profesional: { select: { nombre: true, slug: true } },
      consultorio: { select: { nombre: true } },
      avisos: { select: { canal: true, estado: true } },
    },
  });
}

/** Hora del consultorio, que es la que entiende quien lee el panel. */
export function enHoraLocal(fecha: Date): string {
  const local = new Date(fecha.getTime() - 6 * 60 * 60_000);
  const dias = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  return `${dias[local.getUTCDay()]} ${local.getUTCDate()}/${
    local.getUTCMonth() + 1
  } · ${String(local.getUTCHours()).padStart(2, "0")}:${String(
    local.getUTCMinutes(),
  ).padStart(2, "0")}`;
}
