"use client";

import { useState, useTransition } from "react";

import { CalendarioMes } from "@/componentes/CalendarioMes";
import { porFranja } from "@/lib/calendario";
import { intentar } from "@/lib/intentar";
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
    // Lo reservado se guarda al confirmar: el acuse tiene que decir qué
    // quedó agendado, y después de confirmar los selectores ya no son
    // fuente fiable de nada.
    cuando?: { etiqueta: string; hora: string; consultorio: string; ciudad: string };
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
      <div className="acuse-cita">
        <p className="acuse-titulo">Su cita quedó agendada</p>

        {/* Antes el acuse no decía ni el día ni la hora: el paciente salía
            de la pantalla sin saber qué había reservado. */}
        {resultado.cuando ? (
          <dl className="acuse-datos">
            <div>
              <dt>Cuándo</dt>
              <dd>
                {resultado.cuando.etiqueta} a las {resultado.cuando.hora}
              </dd>
            </div>
            <div>
              <dt>Con</dt>
              <dd>{profesional}</dd>
            </div>
            <div>
              <dt>Dónde</dt>
              <dd>
                {resultado.cuando.consultorio}, {resultado.cuando.ciudad}
              </dd>
            </div>
          </dl>
        ) : null}

        <p className="meta">{resultado.mensaje}</p>

        {resultado.enlace ? (
          <>
            <a href={resultado.enlace} className="boton-lleno">
              Ver, cambiar o cancelar mi cita
            </a>
            <p className="meta" style={{ marginTop: 10 }}>
              Guarde este enlace: es la única forma de cambiarla o
              cancelarla sin llamar.
            </p>
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

      <CalendarioMes
        dias={consultorio.dias}
        elegida={dia.fecha}
        alElegir={(fecha) => {
          setDiaElegido(fecha);
          setHora("");
          setResultado(null);
        }}
      />

      <p className="horas-dia">{dia.etiqueta}</p>

      {porFranja(dia.horas).map((grupo) => (
        <div key={grupo.franja} className="franja-horas">
          <p className="franja-horas-nombre">{grupo.franja}</p>
          <div className="horas" role="group" aria-label={`Horarios de la ${grupo.franja}`}>
            {grupo.horas.map((h) => (
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
        </div>
      ))}

      {hora ? (
        <form
          className="formulario"
          style={{ marginTop: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await intentar(() => agendarCita({
                consultorioId: consultorio.id,
                fecha: dia.fecha,
                hora,
                nombre,
                telefono,
              }));
              setResultado({
                ok: r.ok,
                mensaje: r.mensaje,
                enlace: r.ok ? r.enlace : undefined,
                cuando: r.ok
                  ? {
                      etiqueta: dia.etiqueta,
                      hora,
                      consultorio: consultorio.nombre,
                      ciudad: consultorio.ciudad,
                    }
                  : undefined,
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
