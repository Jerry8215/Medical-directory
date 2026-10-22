"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";
import { agendarCita } from "@/lib/citas";

export type Agenda = {
  slug: string;
  profesional: string;
  consultorioId: string;
  consultorio: string;
  opciones: { fecha: string; hora: string; dia: string; etiqueta: string }[];
};

/**
 * Tomar la cita sin salir de la conversación.
 *
 * El paciente que ya dijo qué le pasa y a quién quiere ver no debería
 * tener que empezar de nuevo en otra pantalla. Acá elige la hora y deja
 * su nombre y su teléfono, nada más.
 *
 * Agenda contra la misma acción que el perfil del médico, no contra una
 * copia: así la comprobación de que el horario sigue libre, el formato
 * del teléfono y el enlace para cancelar son exactamente los mismos. Dos
 * caminos para agendar con dos reglas distintas es la forma segura de
 * terminar con dos pacientes a la misma hora.
 */
export function AgendarEnElChat({ agenda }: { agenda: Agenda }) {
  const [elegida, setElegida] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [resultado, setResultado] = useState<{
    ok: boolean;
    mensaje: string;
    enlace?: string;
  } | null>(null);
  const [guardando, iniciar] = useTransition();
  const formulario = useRef<HTMLFormElement>(null);

  // El chat ya se había desplazado al final cuando llegó la respuesta; al
  // elegir la hora aparece el formulario debajo y, sin esto, el paciente
  // pulsa una hora y no ve pasar nada.
  useEffect(() => {
    if (elegida) formulario.current?.scrollIntoView({ block: "end" });
  }, [elegida]);

  if (resultado?.ok) {
    return (
      <div className="confirmada" style={{ marginTop: 8 }}>
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

  const opcion = agenda.opciones.find((o) => `${o.fecha} ${o.hora}` === elegida);

  // El día se dice una vez y debajo van sus horas: en una ventana de chat
  // «lunes 19 de octubre a las 09:00» seis veces seguidas ocupa toda la
  // conversación y se lee peor que «lunes 19: 09:00 09:30 10:00».
  const dias = agenda.opciones.reduce<{ dia: string; horas: typeof agenda.opciones }[]>(
    (acumulado, o) => {
      const ultimo = acumulado[acumulado.length - 1];
      if (ultimo && ultimo.dia === o.dia) ultimo.horas.push(o);
      else acumulado.push({ dia: o.dia, horas: [o] });
      return acumulado;
    },
    [],
  );

  return (
    <div className="agendar-chat">
      {dias.map((d) => (
        <div key={d.dia} className="dia-ofrecido">
          <span className="dia-rotulo">{d.dia}</span>
          <div className="horas-ofrecidas">
            {d.horas.map((o) => {
              const clave = `${o.fecha} ${o.hora}`;
              return (
                <button
                  key={clave}
                  type="button"
                  className="chip"
                  aria-pressed={clave === elegida}
                  aria-label={o.etiqueta}
                  onClick={() => {
                    setElegida(clave);
                    setResultado(null);
                  }}
                >
                  {o.hora}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {opcion ? (
        <form
          ref={formulario}
          className="formulario"
          style={{ marginTop: 10 }}
          onSubmit={(e) => {
            e.preventDefault();
            iniciar(async () => {
              const r = await intentar(() => agendarCita({
                consultorioId: agenda.consultorioId,
                fecha: opcion.fecha,
                hora: opcion.hora,
                nombre,
                telefono,
              }));
              setResultado({
                ok: r.ok,
                mensaje: r.mensaje,
                enlace: r.ok ? r.enlace : undefined,
              });
              // Si alguien se adelantó, se vuelve a la lista de horas.
              if (!r.ok && r.motivo === "ocupado") setElegida(null);
            });
          }}
          noValidate
        >
          <div className="campo">
            <label htmlFor="chat-nombre">Su nombre</label>
            <input
              id="chat-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="campo">
            <label htmlFor="chat-telefono">Su WhatsApp</label>
            <input
              id="chat-telefono"
              inputMode="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="10 dígitos"
              autoComplete="tel"
            />
          </div>

          <button className="boton-lleno" type="submit" disabled={guardando}>
            {guardando ? "Agendando…" : `Agendar ${opcion.etiqueta}`}
          </button>

          <p className="meta">
            Con {agenda.profesional} en {agenda.consultorio}.
          </p>
        </form>
      ) : null}

      {resultado && !resultado.ok ? (
        <p className="error" style={{ marginTop: 8 }}>
          {resultado.mensaje}
        </p>
      ) : null}
    </div>
  );
}
