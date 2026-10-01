/**
 * Acceso a los catálogos y regla de publicación.
 *
 * Todo lo que las páginas necesitan saber pasa por acá. Hoy lee de la
 * semilla; cuando la base esté montada, este archivo es el único que cambia
 * —las páginas no se enteran— porque devuelve las mismas formas.
 *
 * La regla que gobierna el sitio está en `publicable`: una página de
 * catálogo existe para el buscador solo cuando reúne un mínimo de
 * profesionales. Hasta entonces responde, pero pide no ser indexada, que es
 * justo lo contrario de lo que hacen los directorios llenos de páginas
 * vacías.
 */

import { sitio } from "@/config/sitio";
import {
  CIUDADES,
  ESPECIALIDADES,
  PROFESIONALES,
  type Ciudad,
  type Especialidad,
  type Profesional,
} from "@/datos/semilla";

export type { Ciudad, Especialidad, Profesional };

export function ciudades(): Ciudad[] {
  return CIUDADES;
}

export function ciudad(slug: string): Ciudad | undefined {
  return CIUDADES.find((c) => c.slug === slug);
}

export function especialidades(): Especialidad[] {
  return ESPECIALIDADES;
}

export function especialidad(slug: string): Especialidad | undefined {
  return ESPECIALIDADES.find((e) => e.slug === slug);
}

export function profesional(slug: string): Profesional | undefined {
  return PROFESIONALES.find((p) => p.slug === slug);
}

/** Profesionales publicados que atienden esa especialidad en esa ciudad. */
export function profesionalesEn(
  ciudadSlug: string,
  especialidadSlug?: string,
): Profesional[] {
  return PROFESIONALES.filter((p) => {
    const atiendeAhi = p.consultorios.some((c) => c.ciudad === ciudadSlug);
    const esDeLaEspecialidad =
      !especialidadSlug || p.especialidades.includes(especialidadSlug);
    return atiendeAhi && esDeLaEspecialidad;
  });
}

export function umbral(ciudadSlug?: string, especialidadSlug?: string): number {
  const c = ciudadSlug ? ciudad(ciudadSlug) : undefined;
  return c?.umbralMinimo ?? sitio.umbralPublicacion;
  void especialidadSlug;
}

/**
 * ¿La página ya se puede ofrecer al buscador?
 *
 * Se decide por el número de profesionales publicados, no por que la
 * especialidad exista. Una ciudad con un solo cirujano tiene una página que
 * funciona para quien llega por un enlace, pero que no compite en Google ni
 * arrastra al resto del sitio.
 */
export function publicable(
  ciudadSlug: string,
  especialidadSlug?: string,
): { publicada: boolean; cuantos: number; faltan: number; minimo: number } {
  const cuantos = profesionalesEn(ciudadSlug, especialidadSlug).length;
  const minimo = umbral(ciudadSlug, especialidadSlug);
  return {
    publicada: cuantos >= minimo,
    cuantos,
    faltan: Math.max(0, minimo - cuantos),
    minimo,
  };
}

/** Ciudades donde el profesional tiene consultorio, con su nombre legible. */
export function ciudadesDe(p: Profesional): Ciudad[] {
  const slugs = new Set(p.consultorios.map((c) => c.ciudad));
  return CIUDADES.filter((c) => slugs.has(c.slug));
}

export function especialidadesDe(p: Profesional): Especialidad[] {
  return ESPECIALIDADES.filter((e) => p.especialidades.includes(e.slug));
}

export function tieneConsejoVigente(p: Profesional): boolean {
  const consejo = p.credenciales.find((c) => c.tipo === "CONSEJO_ESPECIALIDAD");
  if (!consejo?.vigenteHasta) return false;
  return new Date(consejo.vigenteHasta) > new Date();
}

export function cedulaVerificada(p: Profesional): boolean {
  return p.credenciales.some(
    (c) => c.tipo === "CEDULA_PROFESIONAL" && Boolean(c.numero),
  );
}

/** Todas las combinaciones ciudad + especialidad que hoy se publican. */
export function paginasPublicadas(): { ciudad: string; especialidad: string }[] {
  const paginas: { ciudad: string; especialidad: string }[] = [];
  for (const c of CIUDADES) {
    for (const e of ESPECIALIDADES) {
      if (publicable(c.slug, e.slug).publicada) {
        paginas.push({ ciudad: c.slug, especialidad: e.slug });
      }
    }
  }
  return paginas;
}

export function profesionalesPublicados(): Profesional[] {
  return PROFESIONALES;
}
