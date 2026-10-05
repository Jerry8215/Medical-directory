"use client";

import { useState, useTransition } from "react";

import { eliminarOpinion, publicarOpinion } from "@/lib/opiniones";

export function FilaOpinion({
  id,
  autor,
  texto,
  calificacion,
  profesional,
  cuando,
  publicada,
  deUnaCita,
}: {
  id: string;
  autor: string;
  texto: string;
  calificacion: number;
  profesional: string;
  cuando: string;
  publicada: boolean;
  deUnaCita: boolean;
}) {
  const [aviso, setAviso] = useState("");
  const [oculta, setOculta] = useState(false);
  const [trabajando, iniciar] = useTransition();

  if (oculta) return null;

  return (
    <div className="solicitud">
      <div className="solicitud-datos">
        <div>
          <b>{autor}</b>
          <p className="meta">
            {profesional} · {cuando}
          </p>
          <p style={{ color: "var(--estrella)", fontWeight: 600 }}>
            {"★".repeat(calificacion)}
            {"☆".repeat(5 - calificacion)}
          </p>
          <em className={`pastilla ${deUnaCita ? "pastilla-bien" : "pastilla-espera"}`}>
            {deUnaCita ? "Paciente con cita" : "Sin cita registrada"}
          </em>
        </div>
        <div>
          <p style={{ fontSize: "0.93rem" }}>«{texto}»</p>
        </div>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="acciones">
        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await publicarOpinion(id, !publicada);
              setAviso(r.mensaje);
            })
          }
        >
          {publicada ? "Ocultar" : "Publicar"}
        </button>
        <button
          type="button"
          className="boton-suave"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await eliminarOpinion(id);
              setAviso(r.mensaje);
              setOculta(r.ok);
            })
          }
        >
          Eliminar
        </button>
      </div>
    </div>
  );
}
