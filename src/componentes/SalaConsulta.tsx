"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { escribirEnSala } from "@/lib/consultas";
import { intentar } from "@/lib/intentar";

export type Mensaje = {
  id: string;
  autor: "PACIENTE" | "MEDICO" | "SISTEMA";
  texto: string;
  cuando: string;
};

/**
 * La sala de una consulta.
 *
 * Los mensajes se dibujan en el servidor y la sala se refresca sola cada
 * pocos segundos. No es tan vivo como un canal abierto, pero no depende
 * de que el servidor sostenga una conexión por cada paciente, y en una
 * conversación escrita entre dos personas que piensan lo que responden,
 * seis segundos no se notan.
 *
 * El cuadro de escribir desaparece cuando la sala cierra, en lugar de
 * aceptar un mensaje y rechazarlo al enviarlo: eso es hacer escribir a
 * alguien para nada.
 */
export function SalaConsulta({
  consultaId,
  mensajes,
  abierta,
  quienSoy,
  minutosRestantes,
  avisoDeCierre,
}: {
  consultaId: string;
  mensajes: Mensaje[];
  abierta: boolean;
  quienSoy: "PACIENTE" | "MEDICO";
  minutosRestantes: number;
  avisoDeCierre: boolean;
}) {
  const router = useRouter();
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();
  const fondo = useRef<HTMLDivElement>(null);

  // Mientras la sala esté abierta, se vuelve a pedir sola. Al cerrarse,
  // deja de hacerlo: no tiene sentido seguir preguntando por algo que ya
  // no va a cambiar.
  useEffect(() => {
    if (!abierta) return;
    const reloj = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(reloj);
  }, [abierta, router]);

  useEffect(() => {
    fondo.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length]);

  return (
    <div className="sala">
      <div className="sala-mensajes">
        {mensajes.length === 0 ? (
          <p className="meta" style={{ textAlign: "center", padding: "18px 0" }}>
            Todavía no hay mensajes.
          </p>
        ) : null}

        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`sala-mensaje ${
              m.autor === "SISTEMA"
                ? "sala-sistema"
                : m.autor === quienSoy
                  ? "sala-mio"
                  : "sala-suyo"
            }`}
          >
            <p>{m.texto}</p>
            <small>{m.cuando}</small>
          </div>
        ))}
        <div ref={fondo} />
      </div>

      {abierta ? (
        <form
          className="sala-escribir"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            const lo = texto;
            iniciar(async () => {
              const r = await intentar(() => escribirEnSala(consultaId, lo));
              if (r.ok) {
                setTexto("");
                router.refresh();
              } else {
                setError(r.mensaje);
              }
            });
          }}
        >
          {avisoDeCierre ? (
            <p className="sala-aviso">
              Quedan {minutosRestantes} minuto{minutosRestantes === 1 ? "" : "s"}.
              Al cerrarse, lo escrito se conserva.
            </p>
          ) : null}

          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={
              quienSoy === "PACIENTE"
                ? "Escriba aquí lo que quiere preguntarle"
                : "Escriba su respuesta"
            }
            rows={3}
            maxLength={4000}
            onKeyDown={(e) => {
              // Enter envía, Mayúsculas+Enter hace salto de línea: es lo
              // que la gente ya tiene en los dedos de tanto WhatsApp.
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />

          {error ? <p className="error">{error}</p> : null}

          <button className="boton-lleno" type="submit" disabled={enviando || !texto.trim()}>
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </form>
      ) : (
        <div className="nota-umbral" style={{ margin: 14 }}>
          Esta sala está cerrada. Lo que se escribió se conserva y puede
          volver a leerlo cuando quiera.
        </div>
      )}
    </div>
  );
}
