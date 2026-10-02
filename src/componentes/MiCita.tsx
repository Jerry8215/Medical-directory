"use client";

import { useState, useTransition } from "react";

import { cancelarPorToken, reprogramarPorToken } from "@/lib/cita-paciente";

type Dia = { fecha: string; etiqueta: string; horas: string[] };

/**
 * Lo que puede hacer un paciente con su cita.
 *
 * Reprogramar aparece antes que cancelar a propósito: mover la hora
 * conserva al paciente, cancelar lo pierde, y la mayoría de las veces el
 * problema es la hora y no el médico.
 */
export function MiCita({
  token,
  cuando,
  profesional,
  consultorio,
  direccion,
  estado,
  dias,
}: {
  token: string;
  cuando: string;
  profesional: string;
  consultorio: string;
  direccion: string;
  estado: string;
  dias: Dia[];
}) {
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(
    null,
  );
  const [moviendo, setMoviendo] = useState(false);
  const [diaElegido, setDiaElegido] = useState(dias[0]?.fecha ?? "");
  const [hora, setHora] = useState("");
  const [cancelando, setCancelando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [trabajando, iniciar] = useTransition();

  const dia = dias.find((d) => d.fecha === diaElegido) ?? dias[0];
  const cerrada = estado === "CANCELADA" || estado === "ATENDIDA";

  if (resultado?.ok) {
    return <div className="confirmada">{resultado.mensaje}</div>;
  }

  return (
    <div className="ficha">
      <h2>Su cita</h2>
      <p className="num" style={{ fontSize: "1.15rem", fontWeight: 600 }}>
        {cuando}
      </p>
      <p className="meta">
        {profesional} · {consultorio}
      </p>
      <p className="meta">{direccion}</p>

      {cerrada ? (
        <div className="nota-umbral" style={{ marginTop: 14 }}>
          Esta cita está {estado.toLowerCase()}. Si necesita otra, puede
          agendarla desde el perfil del médico.
        </div>
      ) : (
        <>
          {resultado && !resultado.ok ? (
            <p className="error" style={{ marginTop: 12 }}>
              {resultado.mensaje}
            </p>
          ) : null}

          {moviendo ? (
            <div style={{ marginTop: 14 }}>
              <p className="meta">Elija el horario nuevo</p>
              <div className="dias" role="group" aria-label="Días disponibles">
                {dias.map((d) => {
                  const [, , numero] = d.fecha.split("-");
                  return (
                    <button
                      key={d.fecha}
                      type="button"
                      className="dia"
                      aria-pressed={d.fecha === dia?.fecha}
                      onClick={() => {
                        setDiaElegido(d.fecha);
                        setHora("");
                      }}
                    >
                      <small>{d.etiqueta.split(" ")[0].slice(0, 3)}</small>
                      <b className="num">{Number(numero)}</b>
                    </button>
                  );
                })}
              </div>
              <div className="horas" role="group" aria-label="Horarios disponibles">
                {dia?.horas.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className="hora num"
                    aria-pressed={h === hora}
                    onClick={() => setHora(h)}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {cancelando ? (
            <div className="campo" style={{ marginTop: 14 }}>
              <label htmlFor="motivo-cancelacion">
                ¿Nos dice por qué? (opcional)
              </label>
              <input
                id="motivo-cancelacion"
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
              />
            </div>
          ) : null}

          <div className="acciones">
            {moviendo ? (
              <button
                type="button"
                className="boton-lleno boton-corto"
                disabled={trabajando || !hora}
                onClick={() =>
                  iniciar(async () => {
                    const r = await reprogramarPorToken(token, dia.fecha, hora);
                    setResultado(r.ok ? { ok: true, mensaje: r.mensaje } : { ok: false, mensaje: r.mensaje });
                    if (!r.ok) setHora("");
                  })
                }
              >
                {hora ? `Mover a las ${hora}` : "Elija un horario"}
              </button>
            ) : (
              <button
                type="button"
                className="boton-lleno boton-corto"
                onClick={() => setMoviendo(true)}
                disabled={dias.length === 0}
              >
                Cambiar de horario
              </button>
            )}

            <button
              type="button"
              className="boton-suave"
              disabled={trabajando}
              onClick={() => {
                if (!cancelando) {
                  setCancelando(true);
                  return;
                }
                iniciar(async () => {
                  const r = await cancelarPorToken(token, motivo);
                  setResultado({ ok: r.ok, mensaje: r.mensaje });
                  setCancelando(false);
                });
              }}
            >
              {cancelando ? "Confirmar cancelación" : "Cancelar la cita"}
            </button>
          </div>

          <p className="meta" style={{ marginTop: 12 }}>
            Avisar con tiempo le deja el lugar a otro paciente y le facilita el
            trabajo al consultorio.
          </p>
        </>
      )}
    </div>
  );
}
