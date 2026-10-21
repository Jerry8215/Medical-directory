"use client";

import { useState } from "react";

export type SeccionDelPanel = {
  id: string;
  titulo: string;
  /** Cuántas cosas hay dentro, si el número dice algo útil de un vistazo. */
  cuenta?: number;
  contenido: React.ReactNode;
};

/**
 * El tablero, por pestañas.
 *
 * Era una tira vertical larguísima: ciudades, páginas por especialidad,
 * profesionales, citas y solicitudes, una debajo de otra. Para llegar a
 * las solicitudes había que pasar por encima de todo lo demás, y quien
 * entraba a ver una cosa concreta acababa recorriendo la página entera.
 *
 * La tira de pestañas se queda fija al bajar, de modo que cambiar de
 * sección no obliga a volver arriba. El panel de cada una conserva su
 * propio contenido montado: cambiar de pestaña no vuelve a pedirle nada
 * al servidor, porque todo llegó con la página.
 */
export function PestanasPanel({ secciones }: { secciones: SeccionDelPanel[] }) {
  const [activa, setActiva] = useState(secciones[0]?.id ?? "");

  if (secciones.length === 0) return null;

  return (
    <div className="pestanas-panel">
      <div className="pestanas-tira" role="tablist" aria-label="Secciones del tablero">
        {secciones.map((s) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            id={`pestana-${s.id}`}
            aria-selected={activa === s.id}
            aria-controls={`panel-${s.id}`}
            className="pestana"
            data-activa={activa === s.id}
            onClick={() => setActiva(s.id)}
          >
            {s.titulo}
            {typeof s.cuenta === "number" && s.cuenta > 0 ? (
              <span className="pestana-cuenta">{s.cuenta}</span>
            ) : null}
          </button>
        ))}
      </div>

      {secciones.map((s) => (
        <div
          key={s.id}
          role="tabpanel"
          id={`panel-${s.id}`}
          aria-labelledby={`pestana-${s.id}`}
          hidden={activa !== s.id}
        >
          {s.contenido}
        </div>
      ))}
    </div>
  );
}
