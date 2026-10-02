"use client";

import { useState, useTransition } from "react";

import { agendarCita } from "@/lib/citas";

type Dia = { fecha: string; etiqueta: string; horas: string[] };

/**
 * Elegir día, hora y dejar la cita puesta.
 *
 * Los huecos llegan calculados del servidor, así que el paciente nunca ve
 * un horario inventado por el navegador, y al confirmar se vuelve a
 * verificar contra la agenda: entre que lo eligió y lo confirmó, alguien
 * más pudo haberlo tomado.
 */
export function Reserva({
  dias,
  consultorioId,
  consultorio,
  profesional,
}: {
  dias: Dia[];
  consultorioId: string;
  consultorio: string;
  profesional: string;
}) {
  const [diaElegido, setDiaElegido] = useState(dias[0]?.fecha ?? "");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    enlace?: string;
  } | null>(null);
  const [guardando, iniciar] = useTransition();

  if (dias.length === 0) {
    return (
      <div className="nota-umbral">
        Este consultorio todavía no tiene horarios cargados. En cuanto el
        profesional los registre, aparecerán acá con disponibilidad real.
      </div>
    );
  }

  const dia = dias.find((d) => d.fecha === diaElegido) ?? dias[0];

  if (resultado?.ok) {
    return (
      <div className="confirmada">
        {resultado.mensaje}
        {resultado.enlace ? (
          <>
            {" "}
            <a href={resultado.enlace}>
              Guarde este enlace para cambiar o cancelar su cita.
            </a>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div>
      <div className="dias" role="group" aria-label="Días disponibles">
        {dias.map((d) => {
          const [, , numero] = d.fecha.split("-");
          const nombreDia = d.etiqueta.split(" ")[0].slice(0, 3);
          return (
            <button
              key={d.fecha}
              type="button"
              className="dia"
              aria-pressed={d.fecha === dia.fecha}
              onClick={() => {
                setDiaElegido(d.fecha);
                setHora("");
                setResultado(null);
              }}
            >
              <small>{nombreDia}</small>
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
              setResultado(null);
            }}
          >
            {h}
          </button>
        ))}
      </div>

      {hora ? (
        <form
          className="formulario"
          style={{ marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await agendarCita({
                consultorioId,
                fecha: dia.fecha,
                hora,
                nombre,
                telefono,
              });
              setResultado({
                ok: r.ok,
                mensaje: r.mensaje,
                enlace: r.ok ? r.enlace : undefined,
              });
              if (!r.ok && r.motivo === "ocupado") setHora("");
            });
          }}
          noValidate
        >
          <div className="campo">
            <label htmlFor="nombre-paciente">Su nombre</label>
            <input
              id="nombre-paciente"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="campo">
            <label htmlFor="telefono-paciente">Su WhatsApp</label>
            <input
              id="telefono-paciente"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="10 dígitos"
              autoComplete="tel"
            />
          </div>

          <button className="boton-lleno" type="submit" disabled={guardando}>
            {guardando
              ? "Agendando…"
              : `Agendar ${dia.etiqueta} a las ${hora}`}
          </button>
        </form>
      ) : (
        <button className="boton-lleno" type="button" disabled>
          Elija un horario
        </button>
      )}

      {resultado && !resultado.ok ? (
        <p className="error" style={{ marginTop: 10 }}>
          {resultado.mensaje}
        </p>
      ) : null}

      <p className="meta" style={{ marginTop: 10, textAlign: "center" }}>
        Con {profesional} en {consultorio}. Recibirá la confirmación y el
        recordatorio por WhatsApp.
      </p>
    </div>
  );
}
