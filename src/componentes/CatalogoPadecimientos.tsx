"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

/**
 * El catálogo de padecimientos de la portada.
 *
 * Antes era una fila por especialidad con todos sus padecimientos a la
 * vista. Funcionaba con cuatro, pero el directorio crece por ahí: cada vez
 * que un médico agrega un padecimiento, la fila de su especialidad se
 * alarga y empuja la página entera. Con veinte por especialidad la
 * sección ocuparía más que el resto de la portada junta.
 *
 * En pestañas el alto deja de depender del catálogo. Se ve una
 * especialidad a la vez, el panel reserva su espacio para que el pie no
 * salte al cambiar de pestaña, y en pantallas angostas la tira de
 * pestañas se desplaza de lado en vez de apilarse.
 */

export type EntradaPadecimiento = {
  slug: string;
  nombre: string;
  cuantos: number;
  especialidad: string;
};

export type EntradaEspecialidad = {
  slug: string;
  nombre: string;
};

export function CatalogoPadecimientos({
  especialidades,
  padecimientos,
  ciudad,
}: {
  especialidades: EntradaEspecialidad[];
  padecimientos: EntradaPadecimiento[];
  /** Ciudad a la que llevan los enlaces. */
  ciudad: string;
}) {
  // Una especialidad sin padecimientos cargados no merece pestaña: sería
  // una pestaña que al abrirse no dice nada.
  const pestanas = useMemo(
    () =>
      especialidades.filter((e) =>
        padecimientos.some((p) => p.especialidad === e.slug),
      ),
    [especialidades, padecimientos],
  );

  const [activa, setActiva] = useState(() => pestanas[0]?.slug ?? "");

  const visibles = useMemo(
    () => padecimientos.filter((p) => p.especialidad === activa),
    [padecimientos, activa],
  );

  if (pestanas.length === 0) return null;

  return (
    <div className="catalogo">
      <div className="catalogo-pestanas" role="tablist" aria-label="Especialidades">
        {pestanas.map((e) => (
          <button
            key={e.slug}
            type="button"
            role="tab"
            id={`pestana-${e.slug}`}
            aria-selected={activa === e.slug}
            aria-controls={`panel-${e.slug}`}
            className="catalogo-pestana"
            data-activa={activa === e.slug}
            onClick={() => setActiva(e.slug)}
          >
            {e.nombre}
          </button>
        ))}
      </div>

      <div
        className="catalogo-panel"
        role="tabpanel"
        id={`panel-${activa}`}
        aria-labelledby={`pestana-${activa}`}
      >
        <div className="chips">
          {visibles.map((p) =>
            p.cuantos > 0 ? (
              <Link
                key={p.slug}
                href={`/${ciudad}/padecimiento/${p.slug}`}
                className="chip"
              >
                {p.nombre}
              </Link>
            ) : (
              // Sin nadie que lo atienda todavía, el enlace llevaría a una
              // página vacía: se nombra, pero no se promete.
              <span key={p.slug} className="chip chip-apagado">
                {p.nombre}
              </span>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
