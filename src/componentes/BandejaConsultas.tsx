"use client";

import { useState, useTransition } from "react";

import { SalaConsulta, type Mensaje } from "@/componentes/SalaConsulta";
import { aceptarConsulta, abrirSinCobro, cerrarSala } from "@/lib/consultas";
import { intentar } from "@/lib/intentar";

export type ConsultaEnBandeja = {
  id: string;
  paciente: string;
  telefono: string;
  motivo: string;
  cuando: string;
  precio: string;
  situacion: string;
  minutosRestantes: number;
  mensajes: Mensaje[];
};

/**
 * Las consultas en línea, del lado del médico.
 *
 * Lo que manda es el plazo: una consulta cobrada que nadie acepta en
 * veinte minutos se devuelve, así que las que esperan van arriba y con
 * su reloj a la vista. Abrir una no cambia de pantalla: el médico que
 * está atendiendo necesita ver la siguiente sin perder la que tiene
 * delante.
 */
export function BandejaConsultas({
  consultas,
  puedeAbrirSinCobro,
}: {
  consultas: ConsultaEnBandeja[];
  /** El equipo del consultorio puede abrir una sala sin cobro. */
  puedeAbrirSinCobro: boolean;
}) {
  const [abierta, setAbierta] = useState<string | null>(
    consultas.find((c) => c.situacion === "abierta" || c.situacion === "por-cerrar")?.id ??
      null,
  );
  const [aviso, setAviso] = useState("");
  const [trabajando, iniciar] = useTransition();

  if (consultas.length === 0) {
    return (
      <div className="nota-umbral">
        No hay consultas en línea. Aparecerán aquí en cuanto un paciente abra
        una, y le avisaremos por correo para que no tenga que estar mirando
        esta pantalla.
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {consultas.map((c) => {
        const esperando = c.situacion === "esperando-medico";
        const porPagar = c.situacion === "por-pagar";
        const enSala = c.situacion === "abierta" || c.situacion === "por-cerrar";

        return (
          <article key={c.id} className="ficha" style={{ padding: 16 }}>
            <div className="consulta-cabeza">
              <div>
                <b>{c.paciente}</b>
                <p className="meta">
                  {c.cuando} · {c.telefono} · {c.precio}
                </p>
              </div>
              <em
                className={`pastilla ${
                  enSala ? "pastilla-bien" : esperando ? "pastilla-aviso" : "pastilla-espera"
                }`}
              >
                {esperando
                  ? `Acepte en ${c.minutosRestantes} min`
                  : porPagar
                    ? "Falta el pago"
                    : enSala
                      ? `Quedan ${c.minutosRestantes} min`
                      : "Terminada"}
              </em>
            </div>

            <p style={{ whiteSpace: "pre-line", marginTop: 10 }}>{c.motivo}</p>

            <div className="acciones" style={{ marginTop: 12 }}>
              {esperando ? (
                <button
                  type="button"
                  className="boton-lleno"
                  disabled={trabajando}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await intentar(() => aceptarConsulta(c.id));
                      setAviso(r.mensaje);
                      if (r.ok) setAbierta(c.id);
                    })
                  }
                >
                  Aceptar y abrir la sala
                </button>
              ) : null}

              {porPagar && puedeAbrirSinCobro ? (
                <button
                  type="button"
                  className="boton-suave"
                  disabled={trabajando}
                  onClick={() =>
                    iniciar(async () => {
                      const r = await intentar(() => abrirSinCobro(c.id));
                      setAviso(r.mensaje);
                    })
                  }
                >
                  Darla por pagada
                </button>
              ) : null}

              {enSala ? (
                <>
                  <button
                    type="button"
                    className="boton-suave"
                    onClick={() => setAbierta(abierta === c.id ? null : c.id)}
                  >
                    {abierta === c.id ? "Ocultar la sala" : "Abrir la sala"}
                  </button>
                  <button
                    type="button"
                    className="boton-texto"
                    disabled={trabajando}
                    onClick={() =>
                      iniciar(async () => {
                        const r = await intentar(() => cerrarSala(c.id));
                        setAviso(r.mensaje);
                      })
                    }
                  >
                    Terminar la consulta
                  </button>
                </>
              ) : null}
            </div>

            {abierta === c.id ? (
              <div style={{ marginTop: 12 }}>
                <SalaConsulta
                  consultaId={c.id}
                  quienSoy="MEDICO"
                  abierta={enSala}
                  minutosRestantes={c.minutosRestantes}
                  avisoDeCierre={c.situacion === "por-cerrar"}
                  mensajes={c.mensajes}
                />
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
