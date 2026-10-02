"use client";

import { useState, useTransition } from "react";

import {
  cancelarCita,
  confirmarCita,
  marcarAtendida,
  marcarNoAsistio,
} from "@/lib/agenda-profesional";

/**
 * Una cita en la agenda del profesional.
 *
 * Las acciones cambian según el momento: antes de la consulta se confirma o
 * se cancela; después, lo que importa es si el paciente llegó. Mostrar las
 * cuatro siempre obligaría a leer cuál aplica.
 */
export function FilaCita({
  id,
  cuando,
  paciente,
  telefono,
  consultorio,
  estado,
  pasada,
}: {
  id: string;
  cuando: string;
  paciente: string;
  telefono: string;
  consultorio: string;
  estado: string;
  pasada: boolean;
}) {
  const [aviso, setAviso] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [trabajando, iniciar] = useTransition();

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>) {
    iniciar(async () => {
      const r = await accion();
      setAviso(r.mensaje);
    });
  }

  const cancelada = estado === "CANCELADA";

  return (
    <div className="solicitud">
      <div className="solicitud-datos">
        <div>
          <b className="num">{cuando}</b>
          <p className="meta">{consultorio}</p>
          <em className={`pastilla ${cancelada ? "pastilla-espera" : "pastilla-bien"}`}>
            {estado.toLowerCase().replace("_", " ")}
          </em>
        </div>
        <div>
          <b>{paciente}</b>
          <p className="meta num">{telefono}</p>
        </div>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {cancelando ? (
        <div className="campo" style={{ marginTop: 10 }}>
          <label htmlFor={`motivo-${id}`}>
            Motivo, para el consultorio
          </label>
          <input
            id={`motivo-${id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </div>
      ) : null}

      <div className="acciones">
        {!pasada && estado === "AGENDADA" ? (
          <button
            type="button"
            className="boton-lleno boton-corto"
            disabled={trabajando}
            onClick={() => ejecutar(() => confirmarCita(id))}
          >
            Confirmar
          </button>
        ) : null}

        {pasada && (estado === "AGENDADA" || estado === "CONFIRMADA") ? (
          <>
            <button
              type="button"
              className="boton-lleno boton-corto"
              disabled={trabajando}
              onClick={() => ejecutar(() => marcarAtendida(id))}
            >
              Atendida
            </button>
            <button
              type="button"
              className="boton-suave"
              disabled={trabajando}
              onClick={() => ejecutar(() => marcarNoAsistio(id))}
            >
              No asistió
            </button>
          </>
        ) : null}

        {!cancelada && estado !== "ATENDIDA" ? (
          <button
            type="button"
            className="boton-suave"
            disabled={trabajando}
            onClick={() => {
              if (!cancelando) {
                setCancelando(true);
                return;
              }
              ejecutar(() => cancelarCita(id, motivo));
              setCancelando(false);
            }}
          >
            {cancelando ? "Confirmar cancelación" : "Cancelar"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
