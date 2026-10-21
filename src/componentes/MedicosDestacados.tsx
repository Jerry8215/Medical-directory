"use client";

import { useMemo, useState } from "react";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import type { Profesional } from "@/lib/tipos";

/**
 * Los médicos destacados de la portada.
 *
 * Es un escaparate, no un listado: son tres tarjetas grandes y la del
 * perfil verificado es la única que va en color pleno. El resto del sitio
 * sigue usando la tarjeta compacta, que es la que sirve cuando hay veinte
 * resultados y el paciente está comparando.
 *
 * Los filtros son del navegador y no del servidor. Son tres perfiles que
 * ya vinieron con la página, de modo que recargarla para esconder uno
 * sería cobrarle al paciente una vuelta entera al servidor por un trabajo
 * que el navegador hace sin parpadear.
 */

const TODOS = "todos";


export function MedicosDestacados({
  profesionales,
  especialidades,
  ciudades,
}: {
  profesionales: Profesional[];
  /** slug de especialidad -> nombre legible */
  especialidades: Record<string, string>;
  /** slug de ciudad -> nombre legible */
  ciudades: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<string>(TODOS);

  // Solo las especialidades que alguno de estos tres atiende: un filtro
  // que no deja nada en pantalla no es un filtro, es un callejón.
  const pestanas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const p of profesionales) {
      const slug = p.especialidades[0];
      if (slug && especialidades[slug]) vistas.set(slug, especialidades[slug]);
    }
    return [...vistas].map(([slug, nombre]) => ({ slug, nombre }));
  }, [profesionales, especialidades]);

  const visibles = useMemo(
    () =>
      filtro === TODOS
        ? profesionales
        : profesionales.filter((p) => p.especialidades[0] === filtro),
    [profesionales, filtro],
  );


  const hayMuestras = visibles.some((p) => p.ejemplo);

  return (
    <>
      {pestanas.length > 1 ? (
        <div className="destacados-filtros">
          <div className="destacados-pestanas" role="tablist" aria-label="Filtrar por especialidad">
            <button
              type="button"
              role="tab"
              aria-selected={filtro === TODOS}
              className="destacados-pestana"
              data-activa={filtro === TODOS}
              onClick={() => setFiltro(TODOS)}
            >
              Todos
            </button>
            {pestanas.map((e) => (
              <button
                key={e.slug}
                type="button"
                role="tab"
                aria-selected={filtro === e.slug}
                className="destacados-pestana"
                data-activa={filtro === e.slug}
                onClick={() => setFiltro(e.slug)}
              >
                {e.nombre}
              </button>
            ))}
          </div>

          <p className="destacados-cuenta" aria-live="polite">
            {visibles.length === 1
              ? "1 perfil en esta selección"
              : `${visibles.length} perfiles en esta selección`}
          </p>
        </div>
      ) : null}

      <div className="rejilla-medicos">
        {visibles.map((p) => (
          <TarjetaProfesional
            key={p.slug}
            profesional={p}
            especialidad={especialidades[p.especialidades[0]]}
            ciudad={ciudades[p.consultorios[0]?.ciudad ?? ""]}
          />
        ))}
      </div>

      {hayMuestras ? (
        <p className="destacados-pie">
          Los perfiles de muestra se conservan como ejemplos del directorio. La
          insignia azul se reserva para el perfil con cédula verificada.
        </p>
      ) : null}
    </>
  );
}
