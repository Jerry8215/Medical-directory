"use client";

import { useEffect, useMemo, useState } from "react";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import type { Profesional } from "@/lib/tipos";

/**
 * Búsqueda dentro de una ciudad.
 *
 * Filtra sobre lo que ya llegó con la página, así que responde sin esperar
 * al servidor. La gente escribe su padecimiento —«vesícula», «hernia»— más
 * seguido que el nombre de la especialidad, de modo que la coincidencia
 * incluye los padecimientos de cada perfil.
 */
export function Buscador({
  profesionales,
  etiquetas,
  especialidades,
  ciudad,
}: {
  profesionales: Profesional[];
  /** slug de padecimiento -> nombre legible, para poder buscar por texto */
  etiquetas: Record<string, string>;
  /** slug de especialidad -> nombre legible */
  especialidades: Record<string, string>;
  ciudad: string;
}) {
  const [consulta, setConsulta] = useState("");

  // Lo que el paciente escribió en la portada llega en «?q=». Lo lee el
  // navegador y no el servidor a propósito: en cuanto la página de ciudad
  // mira la dirección completa deja de poder guardarse en caché y vuelve a
  // consultar la base de datos en cada visita, que es justo lo que agotó la
  // cuota de cómputo. El primer dibujo es idéntico en servidor y navegador,
  // así que la hidratación no se rompe, y el filtrado es instantáneo porque
  // la lista ya venía con la página.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setConsulta(q);
  }, []);

  const encontrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return profesionales;
    return profesionales.filter((p) => {
      const padecimientos = p.padecimientos
        .map((slug) => etiquetas[slug] ?? slug)
        .join(" ");
      const especialidad = p.especialidades
        .map((slug) => especialidades[slug] ?? slug)
        .join(" ");
      const texto =
        `${p.nombre} ${p.semblanza} ${especialidad} ${padecimientos}`.toLowerCase();
      return texto.includes(q);
    });
  }, [consulta, profesionales, etiquetas, especialidades]);

  return (
    <div>
      <label className="buscador">
        <span className="sr-only">Buscar en {ciudad}</span>
        <input
          id="buscador"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Padecimiento, especialidad o nombre"
          aria-label={`Buscar especialistas en ${ciudad}`}
        />
      </label>

      {encontrados.length > 0 ? (
        <div className="rejilla" style={{ marginTop: 18 }}>
          {encontrados.map((p) => (
            <TarjetaProfesional
              key={p.slug}
              profesional={p}
              especialidad={especialidades[p.especialidades[0]]}
              ciudad={ciudad}
            />
          ))}
        </div>
      ) : (
        <div className="nota-umbral" style={{ marginTop: 18 }}>
          No hay especialistas que coincidan con «{consulta}» en {ciudad}. Pruebe
          con el nombre del padecimiento, por ejemplo vesícula o hernia.
        </div>
      )}
    </div>
  );
}
