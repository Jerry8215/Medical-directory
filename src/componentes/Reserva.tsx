"use client";

import { useState } from "react";

type Dia = { fecha: string; etiqueta: string; horas: string[] };

/**
 * Elegir día y hora.
 *
 * Los huecos llegan calculados del servidor, de modo que el paciente nunca
 * ve un horario inventado por el navegador. Confirmar todavía no guarda
 * nada: la cita se escribe en la agenda en el segundo hito, y hasta
 * entonces conviene que se vea exactamente así para poder revisarlo.
 */
export function Reserva({
  dias,
  consultorio,
  profesional,
}: {
  dias: Dia[];
  consultorio: string;
  profesional: string;
}) {
  const [diaElegido, setDiaElegido] = useState(dias[0]?.fecha ?? "");
  const [hora, setHora] = useState("");
  const [confirmada, setConfirmada] = useState(false);

  if (dias.length === 0) {
    return (
      <div className="nota-umbral">
        Este consultorio todavía no tiene horarios cargados. En cuanto el
        profesional los registre, aparecerán acá con disponibilidad real.
      </div>
    );
  }

  const dia = dias.find((d) => d.fecha === diaElegido) ?? dias[0];

  return (
    <div>
      <div className="dias" role="group" aria-label="Días disponibles">
        {dias.map((d) => {
          const [, , numero] = d.fecha.split("-");
          const nombre = d.etiqueta.split(" ")[0].slice(0, 3);
          return (
            <button
              key={d.fecha}
              type="button"
              className="dia"
              aria-pressed={d.fecha === dia.fecha}
              onClick={() => {
                setDiaElegido(d.fecha);
                setHora("");
                setConfirmada(false);
              }}
            >
              <small>{nombre}</small>
              <b className="num">{Number(numero)}</b>
            </button>
          );
        })}
      </div>

      <div className="horas" role="group" aria-label="Horarios disponibles">
        {dia.horas.map((h) => (
          <button
            key={h}
            type="button"
            className="hora num"
            aria-pressed={h === hora}
            onClick={() => {
              setHora(h);
              setConfirmada(false);
            }}
          >
            {h}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="boton-lleno"
        disabled={!hora}
        onClick={() => setConfirmada(true)}
      >
        {hora ? `Agendar ${dia.etiqueta} a las ${hora}` : "Elija un horario"}
      </button>

      {confirmada ? (
        <div className="confirmada">
          Cita apartada con {profesional}, {dia.etiqueta} a las {hora}, en{" "}
          {consultorio}. En la versión final, acá se confirma al instante y le
          llega el recordatorio por WhatsApp un día antes.
        </div>
      ) : null}
    </div>
  );
}
