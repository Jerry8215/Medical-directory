"use client";

import { useState, useTransition } from "react";

import {
  aprobarSolicitud,
  marcarEnVerificacion,
  rechazarSolicitud,
} from "@/lib/verificacion";

/**
 * Una solicitud en el panel, con lo que hace falta para resolverla sin
 * salir de la pantalla: el dato de la cédula, el enlace al registro oficial
 * para cotejarla y las dos decisiones posibles.
 */
export function FilaSolicitud({
  id,
  nombre,
  correo,
  telefono,
  especialidad,
  ciudad,
  cedula,
  consejo,
  consultorio,
  estado,
}: {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  especialidad: string;
  ciudad: string;
  cedula: string;
  consejo?: string | null;
  consultorio?: string | null;
  estado: string;
}) {
  const [aviso, setAviso] = useState("");
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [trabajando, iniciar] = useTransition();

  return (
    <div className="solicitud">
      <div className="solicitud-datos">
        <div>
          <b>{nombre}</b>
          <p className="meta">
            {especialidad} · {ciudad}
          </p>
          <p className="meta num">
            {correo} · {telefono}
          </p>
          {consultorio ? <p className="meta">{consultorio}</p> : null}
        </div>

        <div>
          <p className="meta">Cédula profesional</p>
          <b className="num">{cedula}</b>
          <p style={{ marginTop: 6 }}>
            <a
              href="https://www.cedulaprofesional.sep.gob.mx/cedula/presidencia/indexAvanzada.action"
              target="_blank"
              rel="noreferrer"
              className="enlace-acento"
            >
              Cotejar en el registro de la SEP
            </a>
          </p>
          {consejo ? (
            <p className="meta">Consejo declarado: {consejo}</p>
          ) : (
            <p className="meta">Sin consejo de especialidad declarado</p>
          )}
        </div>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {rechazando ? (
        <div className="campo" style={{ marginTop: 10 }}>
          <label htmlFor={`motivo-${id}`}>Motivo del rechazo</label>
          <input
            id={`motivo-${id}`}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="La cédula no corresponde al nombre, por ejemplo"
          />
        </div>
      ) : null}

      <div className="acciones">
        <button
          type="button"
          className="boton-lleno boton-corto"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const r = await aprobarSolicitud(id);
              setAviso(r.mensaje);
            })
          }
        >
          Cédula comprobada · publicar
        </button>

        {estado === "RECIBIDA" ? (
          <button
            type="button"
            className="boton-suave"
            disabled={trabajando}
            onClick={() =>
              iniciar(async () => {
                const r = await marcarEnVerificacion(id);
                setAviso(r.mensaje);
              })
            }
          >
            En verificación
          </button>
        ) : null}

        <button
          type="button"
          className="boton-suave"
          disabled={trabajando}
          onClick={() => {
            if (!rechazando) {
              setRechazando(true);
              return;
            }
            iniciar(async () => {
              const r = await rechazarSolicitud(id, motivo);
              setAviso(r.mensaje);
              setRechazando(false);
            });
          }}
        >
          {rechazando ? "Confirmar rechazo" : "Rechazar"}
        </button>
      </div>
    </div>
  );
}
