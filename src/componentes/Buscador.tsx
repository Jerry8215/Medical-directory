"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import type { Profesional } from "@/lib/tipos";

/** La dirección no cambia sin recargar, así que no hay a qué suscribirse. */
const SIN_SUSCRIPCION = () => () => {};

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
  // Lo que el paciente escribió en la portada llega en «?q=». Lo lee el
  // navegador y no el servidor a propósito: en cuanto la página de ciudad
  // mira la dirección completa deja de poder guardarse en caché y vuelve a
  // consultar la base de datos en cada visita, que es justo lo que agotó la
  // cuota de cómputo.
  //
  // La dirección es un dato de afuera de React, así que se lee como tal. En
  // el servidor no existe y devuelve vacío, de modo que el primer dibujo
  // coincide con el del navegador y la hidratación no se rompe.
  const deLaDireccion = useSyncExternalStore(
    SIN_SUSCRIPCION,
    () => new URLSearchParams(window.location.search).get("q") ?? "",
    () => "",
  );

  // Mientras el paciente no escriba, manda lo que traía la dirección.
  const [escrito, setEscrito] = useState<string | null>(null);
  const consulta = escrito ?? deLaDireccion;

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
          onChange={(e) => setEscrito(e.target.value)}
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
