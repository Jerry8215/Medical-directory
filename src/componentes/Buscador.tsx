"use client";

import { useMemo, useState } from "react";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import type { Profesional } from "@/datos/semilla";

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
  ciudad,
}: {
  profesionales: Profesional[];
  /** slug de padecimiento → nombre legible, para poder buscar por texto */
  etiquetas: Record<string, string>;
  ciudad: string;
}) {
  const [consulta, setConsulta] = useState("");

  const encontrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return profesionales;
    return profesionales.filter((p) => {
      const padecimientos = p.padecimientos
        .map((slug) => etiquetas[slug] ?? slug)
        .join(" ");
      const texto = `${p.nombre} ${p.semblanza} ${padecimientos}`.toLowerCase();
      return texto.includes(q);
    });
  }, [consulta, profesionales, etiquetas]);

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
            <TarjetaProfesional key={p.slug} profesional={p} />
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
