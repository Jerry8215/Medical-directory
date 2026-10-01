import type { MetadataRoute } from "next";

import { urlAbsoluta } from "@/config/sitio";
import { ciudades, paginasPublicadas, profesionalesPublicados, publicable } from "@/lib/catalogo";

/**
 * Mapa del sitio.
 *
 * Solo entra lo publicado. Una página de catálogo que todavía no reúne el
 * mínimo de profesionales no se anuncia al buscador: ofrecerle páginas
 * flacas es la forma más rápida de que deje de confiar en el dominio.
 *
 * Cada alta nueva aparece acá automáticamente, sin que nadie recuerde
 * actualizar una lista.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const ahora = new Date();

  const inicio = {
    url: urlAbsoluta("/"),
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: 1,
  };

  const porCiudad = ciudades()
    .filter((c) => publicable(c.slug).publicada)
    .map((c) => ({
      url: urlAbsoluta(`/${c.slug}`),
      lastModified: ahora,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

  const porEspecialidad = paginasPublicadas().map(({ ciudad, especialidad }) => ({
    url: urlAbsoluta(`/${ciudad}/${especialidad}`),
    lastModified: ahora,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  const perfiles = profesionalesPublicados().map((p) => ({
    url: urlAbsoluta(`/medico/${p.slug}`),
    lastModified: ahora,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [inicio, ...porCiudad, ...porEspecialidad, ...perfiles];
}
