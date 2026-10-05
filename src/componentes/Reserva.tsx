"use client";

import { useState, useTransition } from "react";

import { agendarCita } from "@/lib/citas";

type Dia = { fecha: string; etiqueta: string; horas: string[] };

export type ConsultorioReservable = {
  id: string;
  nombre: string;
  ciudad: string;
  horario: string;
  dias: Dia[];
};

/**
 * Elegir consultorio, día y hora.
 *
 * Un médico que atiende en dos ciudades tiene dos agendas distintas, y
 * ofrecer solo la del primero obliga al paciente de la otra ciudad a
 * llamar. Por eso el consultorio se elige primero y los horarios cambian
 * con él.
 *
 * Al confirmar se vuelve a verificar contra la agenda: entre que el
 * paciente eligió y confirmó, alguien más pudo haber tomado ese horario.
 */
export function Reserva({
  consultorios,
  profesional,
}: {
  consultorios: ConsultorioReservable[];
  profesional: string;
}) {
  const [consultorioId, setConsultorioId] = useState(consultorios[0]?.id ?? "");
  const [diaElegido, setDiaElegido] = useState(consultorios[0]?.dias[0]?.fecha ?? "");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    enlace?: string;
  } | null>(null);
  const [guardando, iniciar] = useTransition();

  const consultorio =
    consultorios.find((c) => c.id === consultorioId) ?? consultorios[0];

  if (!consultorio || consultorio.dias.length === 0) {
    return (
      <div className="nota-umbral">
        {consultorios.length > 1
          ? "Ese consultorio todavía no tiene horarios cargados. Pruebe con el otro o escriba al médico."
          : "Este consultorio todavía no tiene horarios cargados. En cuanto el profesional los registre, aparecerán acá con disponibilidad real."}
      </div>
    );
  }

  const dia =
    consultorio.dias.find((d) => d.fecha === diaElegido) ?? consultorio.dias[0];

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
      {consultorios.length > 1 ? (
        <div className="campo" style={{ marginBottom: 6 }}>
          <label htmlFor="consultorio-cita">Consultorio</label>
          <select
            id="consultorio-cita"
            value={consultorio.id}
            onChange={(e) => {
              const nuevo = consultorios.find((c) => c.id === e.target.value);
              setConsultorioId(e.target.value);
              setDiaElegido(nuevo?.dias[0]?.fecha ?? "");
              setHora("");
              setResultado(null);
            }}
          >
            {consultorios.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre} · {c.ciudad}
              </option>
            ))}
          </select>
          <small className="meta">{consultorio.horario}</small>
        </div>
      ) : null}

      <div className="dias" role="group" aria-label="Días disponibles">
        {consultorio.dias.map((d) => {
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
                consultorioId: consultorio.id,
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
            {guardando ? "Agendando…" : `Agendar ${dia.etiqueta} a las ${hora}`}
          </button>
        </form>
      ) : (
        <button className="boton-lleno" type="button" disabled style={{ width: "100%" }}>
          Elija un horario
        </button>
      )}

      {resultado && !resultado.ok ? (
        <p className="error" style={{ marginTop: 10 }}>
          {resultado.mensaje}
        </p>
      ) : null}

      <p className="meta" style={{ marginTop: 10, textAlign: "center" }}>
        Con {profesional} en {consultorio.nombre}. Recibirá la confirmación y el
        recordatorio por WhatsApp.
      </p>
    </div>
  );
}
