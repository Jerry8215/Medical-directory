"use client";

import { useState, useTransition } from "react";

import { dejarOpinion } from "@/lib/opiniones";

/**
 * Dejar una opinión.
 *
 * Arranca cerrado para no empujar a opinar a quien entró a buscar médico, y
 * avisa desde el principio que se revisa antes de publicarse: así nadie
 * espera ver su texto al instante.
 */
export function FormularioOpinion({
  slug,
  profesional,
  token,
}: {
  slug: string;
  profesional: string;
  token?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [autor, setAutor] = useState("");
  const [texto, setTexto] = useState("");
  const [calificacion, setCalificacion] = useState(5);
  const [aviso, setAviso] = useState("");
  const [listo, setListo] = useState(false);
  const [trabajando, iniciar] = useTransition();

  if (listo) return <div className="confirmada">{aviso}</div>;

  if (!abierto) {
    return (
      <button type="button" className="boton-suave" onClick={() => setAbierto(true)}>
        Dejar mi opinión
      </button>
    );
  }

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await dejarOpinion({ slug, autor, texto, calificacion, token });
          setAviso(r.mensaje);
          setListo(r.ok);
        });
      }}
      noValidate
    >
      <div className="campo">
        <span className="meta">Su experiencia con {profesional}</span>
        <div className="estrellas-elegir" role="group" aria-label="Calificación">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={n <= calificacion}
              aria-label={`${n} de 5`}
              onClick={() => setCalificacion(n)}
            >
              {n <= calificacion ? "★" : "☆"}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <label htmlFor="autor-opinion">Su nombre</label>
        <input
          id="autor-opinion"
          value={autor}
          onChange={(e) => setAutor(e.target.value)}
          placeholder="Como quiere que aparezca"
        />
      </div>

      <div className="campo">
        <label htmlFor="texto-opinion">Su opinión</label>
        <textarea
          id="texto-opinion"
          rows={4}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Qué tal le atendieron, si le explicaron con claridad, si lo recibieron a tiempo."
        />
        <small className="meta">
          No incluya datos de su diagnóstico ni de otras personas. Se revisa
          antes de publicarse.
        </small>
      </div>

      {aviso && !listo ? <p className="error">{aviso}</p> : null}

      <button className="boton-lleno" type="submit" disabled={trabajando}>
        {trabajando ? "Enviando…" : "Enviar mi opinión"}
      </button>
    </form>
  );
}
