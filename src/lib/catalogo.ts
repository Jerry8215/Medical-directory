/**
 * Acceso a los catálogos y regla de publicación.
 *
 * Todo lo que las páginas necesitan saber pasa por acá, y desde la conexión
 * de la base lo lee de PostgreSQL. Las formas que devuelve son las mismas
 * que antes salían de la semilla, de modo que las páginas no se enteraron
 * del cambio.
 *
 * La regla que gobierna el sitio está en `publicable`: una página de
 * catálogo existe para el buscador solo cuando reúne un mínimo de
 * profesionales. Hasta entonces responde, pero pide no ser indexada, que es
 * justo lo contrario de lo que hacen los directorios llenos de páginas
 * vacías.
 */

import { sitio } from "@/config/sitio";
import { prisma } from "@/lib/prisma";
import type {
  Ciudad,
  Credencial,
  Especialidad,
  Profesional,
} from "@/lib/tipos";

export type { Ciudad, Consultorio, Credencial, Especialidad, Profesional } from "@/lib/tipos";
export { cedulaVerificada, consejoVigente } from "@/lib/tipos";

const DIAS = [
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
  "domingo",
];

/**
 * Los perfiles de muestra se guardan como borrador. Se muestran mientras se
 * construye el sitio y se apagan con una variable el día de la publicación.
 */
function estadosVisibles(): ("PUBLICADO" | "BORRADOR")[] {
  return process.env.MOSTRAR_EJEMPLOS === "no"
    ? ["PUBLICADO"]
    : ["PUBLICADO", "BORRADOR"];
}

/** «Lunes, miércoles y viernes de 09:00 a 14:00», a partir de las franjas. */
function horarioLegible(
  franjas: { dia: number; desde: string; hasta: string }[],
): string {
  if (franjas.length === 0) return "Horario por confirmar";

  const dias = [...new Set(franjas.map((f) => f.dia))].sort((a, b) => a - b);
  const nombres = dias.map((d) => DIAS[d]);
  const lista =
    nombres.length === 1
      ? nombres[0]
      : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;

  const { desde, hasta } = franjas[0];
  return `${lista[0].toUpperCase()}${lista.slice(1)} de ${desde} a ${hasta}`;
}

type ProfesionalConTodo = {
  slug: string;
  nombre: string;
  semblanza: string | null;
  convenios: string | null;
  estado: string;
  calificacion: number | null;
  numeroOpiniones: number;
  especialidades: { especialidad: { slug: string } }[];
  consultorios: {
    id: string;
    nombre: string;
    direccion: string;
    precioValoracion: number | null;
    duracionCitaMin: number;
    ciudad: { slug: string };
    franjas: { dia: number; desde: string; hasta: string }[];
  }[];
  verificaciones: { tipo: string; numero: string | null; vigenteHasta: Date | null }[];
};

const INCLUIR = {
  especialidades: { include: { especialidad: true } },
  consultorios: { include: { ciudad: true, franjas: true } },
  verificaciones: true,
} as const;

function aProfesional(p: ProfesionalConTodo, padecimientosPorEspecialidad: Map<string, string[]>): Profesional {
  const especialidades = p.especialidades.map((e) => e.especialidad.slug);
  return {
    slug: p.slug,
    nombre: p.nombre,
    semblanza: p.semblanza ?? "",
    especialidades,
    // Sin tabla propia todavía: un perfil atiende los padecimientos de sus
    // especialidades. Cuando el panel permita afinarlo, cambia solo esto.
    padecimientos: especialidades.flatMap(
      (slug) => padecimientosPorEspecialidad.get(slug) ?? [],
    ),
    consultorios: p.consultorios.map((c) => ({
      id: c.id,
      ciudad: c.ciudad.slug,
      nombre: c.nombre,
      direccion: c.direccion,
      franjas: c.franjas.map((f) => ({ dia: f.dia, desde: f.desde, hasta: f.hasta })),
      duracionCitaMin: c.duracionCitaMin,
      horario: horarioLegible(c.franjas),
      precioValoracion: c.precioValoracion ?? undefined,
    })),
    credenciales: p.verificaciones.map((v) => ({
      tipo: v.tipo as Credencial["tipo"],
      numero: v.numero ?? undefined,
      vigenteHasta: v.vigenteHasta?.toISOString(),
    })),
    convenios: p.convenios ?? undefined,
    calificacion: p.calificacion ?? undefined,
    opiniones: p.numeroOpiniones,
    ejemplo: p.estado !== "PUBLICADO",
  };
}

async function mapaDePadecimientos(): Promise<Map<string, string[]>> {
  const especialidades = await prisma.especialidad.findMany({
    include: { padecimientos: true },
  });
  return new Map(
    especialidades.map((e) => [e.slug, e.padecimientos.map((p) => p.slug)]),
  );
}

// ----------------------------------------------------------------------
//  Catálogos
// ----------------------------------------------------------------------

export async function ciudades(): Promise<Ciudad[]> {
  const filas = await prisma.ciudad.findMany({
    where: { activa: true },
    orderBy: { orden: "asc" },
  });
  return filas.map((c) => ({
    slug: c.slug,
    nombre: c.nombre,
    estado: c.estado,
    descripcion: c.descripcion ?? "",
    umbralMinimo: c.umbralMinimo ?? undefined,
  }));
}

export async function ciudad(slug: string): Promise<Ciudad | undefined> {
  return (await ciudades()).find((c) => c.slug === slug);
}

export async function especialidades(): Promise<Especialidad[]> {
  const filas = await prisma.especialidad.findMany({
    where: { activa: true },
    orderBy: { orden: "asc" },
    include: { padecimientos: { where: { activo: true } } },
  });
  return filas.map((e) => ({
    slug: e.slug,
    nombre: e.nombre,
    descripcion: e.descripcion ?? "",
    padecimientos: e.padecimientos.map((p) => ({ slug: p.slug, nombre: p.nombre })),
  }));
}

export async function especialidad(slug: string): Promise<Especialidad | undefined> {
  return (await especialidades()).find((e) => e.slug === slug);
}

export async function padecimientos(): Promise<
  { slug: string; nombre: string; especialidad: Especialidad }[]
> {
  const lista = await especialidades();
  return lista.flatMap((e) => e.padecimientos.map((p) => ({ ...p, especialidad: e })));
}

export async function padecimiento(slug: string) {
  return (await padecimientos()).find((p) => p.slug === slug);
}

// ----------------------------------------------------------------------
//  Profesionales
// ----------------------------------------------------------------------

export async function profesional(slug: string): Promise<Profesional | undefined> {
  const fila = await prisma.profesional.findUnique({
    where: { slug },
    include: INCLUIR,
  });
  if (!fila || !estadosVisibles().includes(fila.estado as "PUBLICADO")) return undefined;
  return aProfesional(fila as ProfesionalConTodo, await mapaDePadecimientos());
}

export async function profesionalesEn(
  ciudadSlug: string,
  especialidadSlug?: string,
): Promise<Profesional[]> {
  const filas = await prisma.profesional.findMany({
    where: {
      estado: { in: estadosVisibles() as never },
      consultorios: { some: { ciudad: { slug: ciudadSlug }, activo: true } },
      ...(especialidadSlug
        ? { especialidades: { some: { especialidad: { slug: especialidadSlug } } } }
        : {}),
    },
    include: INCLUIR,
    orderBy: { nombre: "asc" },
  });
  const mapa = await mapaDePadecimientos();
  return filas.map((f) => aProfesional(f as ProfesionalConTodo, mapa));
}

export async function profesionalesPublicados(): Promise<Profesional[]> {
  const filas = await prisma.profesional.findMany({
    where: { estado: { in: estadosVisibles() as never } },
    include: INCLUIR,
    orderBy: { nombre: "asc" },
  });
  const mapa = await mapaDePadecimientos();
  return filas.map((f) => aProfesional(f as ProfesionalConTodo, mapa));
}

export async function profesionalesPorPadecimiento(
  ciudadSlug: string,
  padecimientoSlug: string,
): Promise<Profesional[]> {
  const todos = await profesionalesEn(ciudadSlug);
  return todos.filter((p) => p.padecimientos.includes(padecimientoSlug));
}

// ----------------------------------------------------------------------
//  Regla de publicación
// ----------------------------------------------------------------------

export async function umbral(ciudadSlug?: string): Promise<number> {
  if (ciudadSlug) {
    const c = await ciudad(ciudadSlug);
    if (c?.umbralMinimo) return c.umbralMinimo;
  }
  const ajuste = await prisma.ajuste.findUnique({ where: { clave: "umbral_publicacion" } });
  const guardado = ajuste ? Number(ajuste.valor) : NaN;
  return Number.isFinite(guardado) ? guardado : sitio.umbralPublicacion;
}

export async function publicable(
  ciudadSlug: string,
  especialidadSlug?: string,
): Promise<{ publicada: boolean; cuantos: number; faltan: number; minimo: number }> {
  const cuantos = (await profesionalesEn(ciudadSlug, especialidadSlug)).length;
  const minimo = await umbral(ciudadSlug);
  return {
    publicada: cuantos >= minimo,
    cuantos,
    faltan: Math.max(0, minimo - cuantos),
    minimo,
  };
}

export async function paginasPublicadas(): Promise<
  { ciudad: string; especialidad: string }[]
> {
  const [listaCiudades, listaEspecialidades] = await Promise.all([
    ciudades(),
    especialidades(),
  ]);
  const paginas: { ciudad: string; especialidad: string }[] = [];
  for (const c of listaCiudades) {
    for (const e of listaEspecialidades) {
      if ((await publicable(c.slug, e.slug)).publicada) {
        paginas.push({ ciudad: c.slug, especialidad: e.slug });
      }
    }
  }
  return paginas;
}

// ----------------------------------------------------------------------
//  Ayudas para las fichas
// ----------------------------------------------------------------------

export async function especialidadesDe(p: Profesional): Promise<Especialidad[]> {
  const lista = await especialidades();
  return lista.filter((e) => p.especialidades.includes(e.slug));
}
