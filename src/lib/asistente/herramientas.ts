/**
 * Lo que el asistente puede consultar.
 *
 * Son funciones contra la base, no texto que el modelo invente: si el
 * asistente menciona un médico, un precio o un horario, salió de acá. Es la
 * diferencia entre un asistente útil y uno que manda al paciente a una
 * dirección que no existe.
 */

import { huecos, porDia } from "@/lib/agenda";
import { prisma } from "@/lib/prisma";

export type ProfesionalEncontrado = {
  slug: string;
  nombre: string;
  especialidad: string;
  ciudad: string;
  consultorio: string;
  direccion: string;
  horario: string;
  precio?: number;
  verificado: boolean;
};

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

/**
 * Cómo lo dice el paciente y a qué especialidad corresponde.
 *
 * Nadie escribe «pediatría»: escribe «mi hijo», «el bebé», «niños». Sin esta
 * tabla el asistente contesta que no encontró a nadie teniendo al
 * especialista en el directorio, que es la peor manera de fallar.
 */
const SINONIMOS: Record<string, string> = {
  nino: "pediatria",
  ninos: "pediatria",
  nina: "pediatria",
  hijo: "pediatria",
  hija: "pediatria",
  bebe: "pediatria",
  pediatra: "pediatria",
  vacuna: "pediatria",
  vacunas: "pediatria",
  embarazo: "ginecologia",
  embarazada: "ginecologia",
  parto: "ginecologia",
  prenatal: "ginecologia",
  matriz: "ginecologia",
  ginecologo: "ginecologia",
  ginecologa: "ginecologia",
  papanicolaou: "ginecologia",
  hueso: "traumatologia",
  huesos: "traumatologia",
  fractura: "traumatologia",
  fracturas: "traumatologia",
  rodilla: "traumatologia",
  hombro: "traumatologia",
  esguince: "traumatologia",
  traumatologo: "traumatologia",
  ortopedista: "traumatologia",
  diabetes: "medicina-interna",
  diabetico: "medicina-interna",
  presion: "medicina-interna",
  hipertension: "medicina-interna",
  internista: "medicina-interna",
  chequeo: "medicina-interna",
  cirujano: "cirugia-general",
  cirugia: "cirugia-general",
  operacion: "cirugia-general",
  operar: "cirugia-general",
  vesicula: "cirugia-general",
  hernia: "cirugia-general",
  hernias: "cirugia-general",
  apendice: "cirugia-general",
  apendicitis: "cirugia-general",
  lipoma: "cirugia-general",
};

function sinAcentos(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/** La especialidad que corresponde a lo que escribió el paciente, si alguna. */
export function especialidadDe(texto: string): string | undefined {
  for (const palabra of sinAcentos(texto).split(/[^a-z0-9]+/)) {
    if (SINONIMOS[palabra]) return SINONIMOS[palabra];
  }
  return undefined;
}

/**
 * Los perfiles de muestra se ven mientras se construye el sitio, igual que
 * en el resto del directorio, y se apagan con la misma variable.
 */
function estadosVisibles(): ("PUBLICADO" | "BORRADOR")[] {
  return process.env.MOSTRAR_EJEMPLOS === "no"
    ? ["PUBLICADO"]
    : ["PUBLICADO", "BORRADOR"];
}

function horarioLegible(franjas: { dia: number; desde: string; hasta: string }[]): string {
  if (franjas.length === 0) return "horario por confirmar";
  const dias = [...new Set(franjas.map((f) => f.dia))].sort((a, b) => a - b);
  const nombres = dias.map((d) => DIAS[d]);
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
  return `${lista} de ${franjas[0].desde} a ${franjas[0].hasta}`;
}

/**
 * Buscar especialistas.
 *
 * El paciente escribe su padecimiento más seguido que el nombre de la
 * especialidad, así que la búsqueda mira ambos, además del nombre del
 * profesional.
 */
export async function buscarProfesionales({
  texto,
  ciudad,
  especialidad,
  limite = 5,
}: {
  texto?: string;
  ciudad?: string;
  especialidad?: string;
  limite?: number;
}): Promise<ProfesionalEncontrado[]> {
  const consulta = texto?.trim().toLowerCase();

  const filas = await prisma.profesional.findMany({
    where: {
      estado: { in: estadosVisibles() as never },
      ...(especialidad
        ? { especialidades: { some: { especialidad: { slug: especialidad } } } }
        : {}),
      ...(ciudad ? { consultorios: { some: { ciudad: { slug: ciudad } } } } : {}),
      ...(consulta && !especialidad
        ? {
            OR: [
              { nombre: { contains: consulta, mode: "insensitive" } },
              { semblanza: { contains: consulta, mode: "insensitive" } },
              {
                especialidades: {
                  some: {
                    especialidad: {
                      OR: [
                        { nombre: { contains: consulta, mode: "insensitive" } },
                        {
                          padecimientos: {
                            some: { nombre: { contains: consulta, mode: "insensitive" } },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      especialidades: { include: { especialidad: true } },
      consultorios: { include: { ciudad: true, franjas: true } },
      verificaciones: true,
    },
    take: limite,
  });

  return filas.flatMap((p) => {
    const consultorio = ciudad
      ? p.consultorios.find((c) => c.ciudad.slug === ciudad) ?? p.consultorios[0]
      : p.consultorios[0];
    if (!consultorio) return [];

    return [
      {
        slug: p.slug,
        nombre: p.nombre,
        especialidad: p.especialidades[0]?.especialidad.nombre ?? "",
        ciudad: consultorio.ciudad.nombre,
        consultorio: consultorio.nombre,
        direccion: consultorio.direccion,
        horario: horarioLegible(consultorio.franjas),
        precio: consultorio.precioValoracion ?? undefined,
        verificado: p.verificaciones.some(
          (v) => v.tipo === "CEDULA_PROFESIONAL" && v.estado === "APROBADA",
        ),
      },
    ];
  });
}

/** Los próximos horarios libres de un profesional. */
export async function consultarDisponibilidad(
  slug: string,
  dias = 14,
): Promise<{ consultorio: string; dias: { etiqueta: string; horas: string[] }[] } | null> {
  const profesional = await prisma.profesional.findUnique({
    where: { slug },
    include: { consultorios: { include: { franjas: true } } },
  });
  const consultorio = profesional?.consultorios[0];
  if (!consultorio) return null;

  const desde = new Date(Date.now() - 6 * 60 * 60_000).toISOString().slice(0, 10);

  const tomadas = await prisma.cita.findMany({
    where: {
      consultorioId: consultorio.id,
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: new Date() },
    },
    select: { inicio: true, fin: true },
  });

  const ocupados = tomadas.map((c) => {
    const local = new Date(c.inicio.getTime() - 6 * 60 * 60_000);
    return {
      fecha: local.toISOString().slice(0, 10),
      hora: local.toISOString().slice(11, 16),
      duracionMin: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000),
    };
  });

  const libres = porDia(
    huecos({
      franjas: consultorio.franjas.map((f) => ({
        dia: f.dia,
        desde: f.desde,
        hasta: f.hasta,
      })),
      duracionMin: consultorio.duracionCitaMin,
      ocupados,
      desde,
      dias,
      maximo: 12,
    }),
  );

  return {
    consultorio: consultorio.nombre,
    dias: libres.map((d) => ({ etiqueta: d.etiqueta, horas: d.horas })),
  };
}

/** Ciudades y especialidades vigentes, para que el asistente no las invente. */
export async function catalogoVigente(): Promise<{
  ciudades: { slug: string; nombre: string }[];
  especialidades: { slug: string; nombre: string }[];
}> {
  const [ciudades, especialidades] = await Promise.all([
    prisma.ciudad.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
    prisma.especialidad.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ]);
  return {
    ciudades: ciudades.map((c) => ({ slug: c.slug, nombre: c.nombre })),
    especialidades: especialidades.map((e) => ({ slug: e.slug, nombre: e.nombre })),
  };
}
