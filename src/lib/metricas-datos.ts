/**
 * Las consultas que alimentan las métricas del perfil.
 *
 * Separadas del cálculo a propósito: lo que decide si un número es bueno
 * o malo se prueba sin base de datos, y acá solo se va por los datos.
 */

import {
  compararVistas,
  EN_CERO,
  inicioDeMes,
  sumar,
  type Comparacion,
  type Conteo,
} from "@/lib/metricas";
import { prisma } from "@/lib/prisma";

export type Panorama = {
  mes: Conteo;
  comparacion: Comparacion;
  /** Vistas por día del mes, para la gráfica. */
  porDia: { dia: string; vistas: number }[];
  especialidad: string | null;
};

/**
 * Lo que le pasó al perfil en el mes en curso, y cómo se compara.
 *
 * El promedio se calcula sobre los demás médicos de su misma especialidad
 * que están publicados. Compararse contra perfiles en borrador o
 * suspendidos daría un promedio que no existe para ningún paciente.
 */
export async function panoramaDelMes(
  profesionalId: string,
  ahora: Date = new Date(),
): Promise<Panorama> {
  const desde = inicioDeMes(ahora);

  const [filas, citas, suya] = await Promise.all([
    prisma.metricaDiaria.findMany({
      where: { profesionalId, dia: { gte: desde } },
      orderBy: { dia: "asc" },
      select: { dia: true, vistas: true, telefono: true, whatsapp: true },
    }),
    prisma.cita.count({ where: { profesionalId, creadaEn: { gte: desde } } }),
    prisma.profesionalEspecialidad.findFirst({
      where: { profesionalId },
      select: { especialidad: { select: { id: true, nombre: true } } },
    }),
  ]);

  const mes = sumar(filas, citas);

  if (!suya) {
    return {
      mes,
      comparacion: compararVistas(mes.vistas, null, 0),
      porDia: filas.map((f) => ({ dia: f.dia.toISOString().slice(0, 10), vistas: f.vistas })),
      especialidad: null,
    };
  }

  const colegas = await prisma.profesionalEspecialidad.findMany({
    where: {
      especialidadId: suya.especialidad.id,
      profesional: { estado: "PUBLICADO" },
    },
    select: { profesionalId: true },
  });

  const ids = colegas.map((c) => c.profesionalId);
  let promedio: number | null = null;

  if (ids.length >= 2) {
    const porColega = await prisma.metricaDiaria.groupBy({
      by: ["profesionalId"],
      where: { profesionalId: { in: ids }, dia: { gte: desde } },
      _sum: { vistas: true },
    });
    // Un colega sin ningún renglón este mes tuvo cero visitas, y cuenta:
    // dejarlo fuera subiría el promedio y haría ver peor a todos.
    const total = porColega.reduce((a, c) => a + (c._sum.vistas ?? 0), 0);
    promedio = total / ids.length;
  }

  return {
    mes,
    comparacion: compararVistas(mes.vistas, promedio, ids.length),
    porDia: filas.map((f) => ({ dia: f.dia.toISOString().slice(0, 10), vistas: f.vistas })),
    especialidad: suya.especialidad.nombre,
  };
}

/** Panorama en blanco, para un perfil que todavía no tiene nada. */
export function panoramaVacio(): Panorama {
  return {
    mes: EN_CERO,
    comparacion: compararVistas(0, null, 0),
    porDia: [],
    especialidad: null,
  };
}
