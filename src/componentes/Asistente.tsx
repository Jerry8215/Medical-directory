"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { AgendarEnElChat } from "@/componentes/AgendarEnElChat";
import { Asistente as IconoAsistente } from "@/componentes/Iconos";

type Sugerencia = { slug: string; nombre: string; especialidad: string };
type Agenda = {
  slug: string;
  profesional: string;
  consultorioId: string;
  consultorio: string;
  opciones: { fecha: string; hora: string; dia: string; etiqueta: string }[];
};

type Turno = {
  quien: "paciente" | "asistente";
  texto: string;
  sugerencias?: Sugerencia[];
  agenda?: Agenda;
};

const PRIMERAS = [
  "Busco un cirujano para vesícula",
  "¿Quién atiende niños en Meoqui?",
  "¿Cuánto cuesta la consulta?",
];

/** Recuerda que el paciente ya abrió el asistente, para no volver a
 *  mostrarle la insignia. Sin almacenamiento (modo privado, bloqueado)
 *  la insignia vuelve en cada visita, que es un mal menor. */
const CLAVE_VISTO = "asistente-visto";

function leerVisto(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_VISTO) === "1";
  } catch {
    return false;
  }
}

function guardarVisto() {
  try {
    window.localStorage.setItem(CLAVE_VISTO, "1");
  } catch {
    // Sin almacenamiento no pasa nada: solo vuelve la insignia.
  }
}

const sinSuscripcion = () => () => {};

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
  // En el servidor se da por visto: así la insignia no parpadea al hidratar
  // para quien ya lo abrió, y aparece solo en el cliente para quien no.
  const vistoAntes = useSyncExternalStore(sinSuscripcion, leerVisto, () => true);
  const [vistoAhora, setVistoAhora] = useState(false);
  const conInsignia = !vistoAntes && !vistoAhora;

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
          agenda: datos.agenda,
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
        className="asistente-boton"
        onClick={() => {
          setAbierto((a) => !a);
          if (!abierto) {
            setVistoAhora(true);
            guardarVisto();
          }
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
        aria-label={abierto ? "Cerrar el asistente" : "Abrir el asistente"}
        title={abierto ? "Cerrar el asistente" : "Pregúntele al asistente"}
      >
        {abierto ? null : <span className="asistente-boton-halo" aria-hidden="true" />}
        <span className="asistente-boton-cara">
          {abierto ? (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          ) : (
            <IconoAsistente size={28} />
          )}
        </span>
        {conInsignia && !abierto ? (
          <span className="asistente-boton-insignia" aria-hidden="true">
            1
          </span>
        ) : null}
      </button>

      {/* La tarjeta de al lado: solo con el chat cerrado y, por CSS, solo
          en pantallas anchas. Es un rótulo; el botón ya dice qué hace. */}
      {abierto ? null : (
        <div className="asistente-aviso" aria-hidden="true">
          <div className="asistente-aviso-tarjeta">
            <p className="asistente-aviso-titulo">¿Necesita ayuda?</p>
            <p className="asistente-aviso-sub">Le respondemos al instante</p>
          </div>
        </div>
      )}

      {abierto ? (
        <div className="chat" role="dialog" aria-label="Asistente del directorio">
          <header className="chat-cabeza">
            <span className="chat-avatar">
              <Image src="/icono.png" alt="" width={34} height={34} />
            </span>
            <span className="chat-quien">
              <b>Asistente</b>
              <small>
                <i className="punto-vivo" aria-hidden="true" />
                Le ayudo a encontrar médico y agendar
              </small>
            </span>
            <button
              type="button"
              className="chat-cerrar"
              onClick={() => setAbierto(false)}
              aria-label="Cerrar el asistente"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
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

                {t.agenda ? <AgendarEnElChat agenda={t.agenda} /> : null}
              </div>
            ))}
            {/* Tres puntos en lugar de «Un momento…»: ocupa el lugar que va a
                ocupar la respuesta y no se confunde con una. */}
            {esperando ? (
              <div className="msg bot escribiendo" role="status" aria-label="Escribiendo">
                <i />
                <i />
                <i />
              </div>
            ) : null}
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
            <button
              type="submit"
              className="chat-enviar"
              disabled={esperando || !texto.trim()}
              aria-label="Enviar el mensaje"
            >
              <svg
                width="19"
                height="19"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}
