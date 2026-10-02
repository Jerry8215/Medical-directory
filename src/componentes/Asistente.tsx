"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Sugerencia = { slug: string; nombre: string; especialidad: string };
type Turno = { quien: "paciente" | "asistente"; texto: string; sugerencias?: Sugerencia[] };

const PRIMERAS = [
  "Busco un cirujano para vesícula",
  "¿Quién atiende niños en Meoqui?",
  "¿Cuánto cuesta la consulta?",
];

/**
 * El asistente, visible en todo el sitio.
 *
 * Arranca cerrado y en un botón: el paciente que ya sabe lo que busca no
 * tiene por qué esquivar una ventana de chat, y el que no sabe la encuentra
 * donde la espera.
 */
export function Asistente() {
  const [abierto, setAbierto] = useState(false);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [texto, setTexto] = useState("");
  const [esperando, setEsperando] = useState(false);
  const hilo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hilo.current?.scrollTo({ top: hilo.current.scrollHeight });
  }, [turnos, esperando]);

  async function preguntar(mensaje: string) {
    if (!mensaje.trim() || esperando) return;

    const historial = turnos.map((t) => ({ quien: t.quien, texto: t.texto }));
    setTurnos((t) => [...t, { quien: "paciente", texto: mensaje }]);
    setTexto("");
    setEsperando(true);

    try {
      const r = await fetch("/api/asistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensaje, historial }),
      });
      const datos = await r.json();
      setTurnos((t) => [
        ...t,
        {
          quien: "asistente",
          texto:
            datos.texto ??
            datos.error ??
            "No pude responderle en este momento. Intente de nuevo.",
          sugerencias: datos.sugerencias ?? [],
        },
      ]);
    } catch {
      setTurnos((t) => [
        ...t,
        {
          quien: "asistente",
          texto:
            "Se interrumpió la conexión. Puede buscar al especialista directamente en el directorio.",
        },
      ]);
    } finally {
      setEsperando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="burbuja"
        onClick={() => {
          setAbierto((a) => !a);
          if (!abierto && turnos.length === 0) {
            setTurnos([
              {
                quien: "asistente",
                texto:
                  "Buen día. Puedo ayudarle a encontrar al especialista que necesita y a dejar su cita agendada. ¿Qué le ocurre o a qué especialista busca?",
              },
            ]);
          }
        }}
        aria-expanded={abierto}
      >
        {abierto ? "Cerrar" : "Asistente"}
      </button>

      {abierto ? (
        <div className="chat" role="dialog" aria-label="Asistente del directorio">
          <header>
            Asistente
            <small>Le ayudo a encontrar médico y agendar</small>
          </header>

          <div className="hilo" ref={hilo}>
            {turnos.map((t, i) => (
              <div key={i}>
                <div className={`msg ${t.quien === "paciente" ? "yo" : "bot"}`}>
                  {t.texto}
                </div>
                {t.sugerencias && t.sugerencias.length > 0 ? (
                  <div className="sugerencias-perfiles">
                    {t.sugerencias.map((s) => (
                      <Link key={s.slug} href={`/medico/${s.slug}`} className="chip">
                        {s.nombre}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {esperando ? <div className="msg bot">Un momento…</div> : null}
          </div>

          {turnos.length <= 1 ? (
            <div className="sugerencias">
              {PRIMERAS.map((p) => (
                <button key={p} type="button" onClick={() => preguntar(p)}>
                  {p}
                </button>
              ))}
            </div>
          ) : null}

          <form
            className="chat-entrada"
            onSubmit={(e) => {
              e.preventDefault();
              preguntar(texto);
            }}
          >
            <input
              id="mensaje-asistente"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Escriba su mensaje"
              aria-label="Mensaje para el asistente"
              maxLength={500}
            />
            <button type="submit" disabled={esperando || !texto.trim()}>
              Enviar
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
