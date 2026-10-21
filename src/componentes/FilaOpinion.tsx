"use client";

import { useState, useTransition } from "react";

import { BotonIcono } from "@/componentes/BotonIcono";
import { Ojo, OjoCerrado, Papelera } from "@/componentes/Iconos";
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

      <div className="acciones acciones-tabla">
        <BotonIcono
          tono={publicada ? "neutro" : "exito"}
          etiqueta={
            publicada ? `Ocultar la opinión de ${autor}` : `Publicar la opinión de ${autor}`
          }
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await publicarOpinion(id, !publicada);
              setAviso(r.mensaje);
            })
          }
        >
          {publicada ? <OjoCerrado /> : <Ojo />}
        </BotonIcono>
        <BotonIcono
          tono="peligro"
          etiqueta={`Eliminar la opinión de ${autor}`}
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await eliminarOpinion(id);
              setAviso(r.mensaje);
              setOculta(r.ok);
            })
          }
        >
          <Papelera />
        </BotonIcono>
      </div>
    </div>
  );
}
