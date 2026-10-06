"use client";

import { useEffect, useState } from "react";

/**
 * Las fotografías de la portada, una tras otra.
 *
 * La portada es lo primero que ve el paciente y una sola fotografía fija la
 * vuelve un cartel. Van en cruce lento, con un acercamiento apenas
 * perceptible, porque lo que tiene que leerse es el buscador y no la
 * imagen: si el movimiento llama la atención, estorba.
 *
 * Tres cuidados que no se ven pero se notan. Solo la primera se carga de
 * entrada y las demás se van pidiendo justo antes de tocarles turno, así
 * que la portada abre con una imagen y no con doce. El reloj se detiene
 * cuando la pestaña queda en segundo plano, para no gastar batería
 * animando algo que nadie mira. Y a quien pidió en su sistema menos
 * movimiento se le deja una sola fotografía quieta.
 */

const DURACION = 6500;

export function PortadaCarrusel({
  imagenes,
  descripcion,
}: {
  imagenes: string[];
  descripcion: string;
}) {
  const [actual, setActual] = useState(0);
  const [quieto, setQuieto] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
    const aplicar = () => setQuieto(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  useEffect(() => {
    const aplicar = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", aplicar);
    return () => document.removeEventListener("visibilitychange", aplicar);
  }, []);

  useEffect(() => {
    if (quieto || !visible || imagenes.length < 2) return;
    const reloj = setTimeout(
      () => setActual((i) => (i + 1) % imagenes.length),
      DURACION,
    );
    return () => clearTimeout(reloj);
  }, [actual, quieto, visible, imagenes.length]);

  // La siguiente se pide mientras todavía se ve la actual: así el cruce
  // nunca encuentra la imagen a medio descargar.
  useEffect(() => {
    if (quieto || imagenes.length < 2) return;
    const siguiente = new Image();
    siguiente.src = imagenes[(actual + 1) % imagenes.length];
  }, [actual, quieto, imagenes]);

  const lista = quieto ? imagenes.slice(0, 1) : imagenes;

  return (
    <>
      {/* Las fotografías son decoración: lo que dicen ya está en el título,
          así que se ocultan del lector de pantalla y se deja una sola
          descripción. */}
      <div className="portada-fondo" aria-hidden="true">
        {lista.map((fuente, i) => (
          <img
            key={fuente}
            src={fuente}
            alt=""
            className={`portada-capa${i === actual ? " portada-capa-activa" : ""}`}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
          />
        ))}
      </div>

      <span className="sr-only">{descripcion}</span>

      {lista.length > 1 ? (
        <div className="portada-puntos">
          {lista.map((fuente, i) => (
            <button
              key={fuente}
              type="button"
              className={`portada-punto${i === actual ? " portada-punto-activo" : ""}`}
              aria-label={`Ver la fotografía ${i + 1} de ${lista.length}`}
              aria-current={i === actual ? "true" : undefined}
              onClick={() => setActual(i)}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}
