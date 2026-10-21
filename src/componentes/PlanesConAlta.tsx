"use client";

import { useState } from "react";

import { FormularioAlta } from "@/componentes/FormularioAlta";
import { Modal } from "@/componentes/Modal";

export type Plan = "BASICO" | "GOLD" | "PREMIUM";

export type FichaDePlan = {
  plan: Plan;
  nombre: string;
  precio: string;
  descripcion: string;
  incluye: string[];
  consultorios: string;
};

type Opcion = { slug: string; nombre: string };

/**
 * Elegir plan y registrarse, en un solo paso.
 *
 * El plan va antes del formulario y no después, porque es lo que decide
 * qué lleva el perfil: preguntarlo al final obliga al médico a volver
 * sobre lo que ya escribió. El básico viene elegido de entrada, que es lo
 * que la mayoría va a querer y lo que evita que la pantalla arranque sin
 * nada seleccionado.
 *
 * Un plan de pago abre primero la ventana del cobro. No se cobra ahí —eso
 * ocurre por depósito y lo acredita el consultorio—, pero sí se le dice
 * cuánto es y cómo se paga antes de que llene nada: enterarse del precio
 * después de capturar la cédula es la forma más rápida de perder a
 * alguien que iba en serio.
 */
export function PlanesConAlta({
  fichas,
  especialidades,
  ciudades,
  datosBancarios,
}: {
  fichas: FichaDePlan[];
  especialidades: Opcion[];
  ciudades: Opcion[];
  datosBancarios?: string | null;
}) {
  const [elegido, setElegido] = useState<Plan>("BASICO");
  const [cobrando, setCobrando] = useState<Plan | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [listo, setListo] = useState(false);

  const ficha = fichas.find((f) => f.plan === elegido);

  function tocar(plan: Plan) {
    if (plan === "BASICO") {
      setElegido(plan);
      return;
    }
    setCobrando(plan);
  }

  return (
    <>
      <div className="planes-cabeza">
        <p className="meta">
          {ficha
            ? `Va a registrarse en el plan ${ficha.nombre}, ${ficha.precio.toLowerCase()}.`
            : "Elija un plan para continuar."}
        </p>
        <button
          type="button"
          className="boton-lleno"
          disabled={!ficha}
          onClick={() => setRegistrando(true)}
        >
          Registrarme
        </button>
      </div>

      <div className="planes-rejilla">
        {fichas.map((f) => (
          <article
            key={f.plan}
            className="plan"
            data-plan={f.plan.toLowerCase()}
            data-elegido={elegido === f.plan}
          >
            <div className="plan-tapa">
              <p className="plan-nombre">{f.nombre}</p>
              <p className="plan-precio">{f.precio}</p>
              {elegido === f.plan ? (
                <span className="plan-marca">Elegido</span>
              ) : null}
            </div>

            <div className="plan-cuerpo">
              <p className="meta">{f.descripcion}</p>

              <ul className="lista-limpia" style={{ marginTop: 14 }}>
                {f.incluye.map((linea) => (
                  <li key={linea}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6.2 4.6 8.8 10 3.4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {linea}
                  </li>
                ))}
              </ul>

              <p className="meta" style={{ marginTop: 14 }}>
                {f.consultorios}
              </p>

              <button
                type="button"
                className={elegido === f.plan ? "boton-lleno" : "boton-suave"}
                onClick={() => tocar(f.plan)}
                style={{ marginTop: 16, width: "100%" }}
              >
                {elegido === f.plan ? "Plan elegido" : `Elegir ${f.nombre}`}
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* El cobro de un plan de pago, antes del formulario. */}
      <Modal
        abierta={cobrando !== null}
        alCerrar={() => setCobrando(null)}
        titulo={`Plan ${fichas.find((f) => f.plan === cobrando)?.nombre ?? ""}`}
        descripcion={`${fichas.find((f) => f.plan === cobrando)?.precio ?? ""}, sin permanencia y sin tarjeta guardada.`}
        pie={
          <>
            <button
              type="button"
              className="enlace-boton callado"
              onClick={() => setCobrando(null)}
            >
              Mejor el básico
            </button>
            <button
              type="button"
              className="enlace-boton"
              onClick={() => {
                if (cobrando) setElegido(cobrando);
                setCobrando(null);
                setRegistrando(true);
              }}
            >
              Entendido, continuar
            </button>
          </>
        }
      >
        <p>
          El pago es por depósito o transferencia y lo acredita el consultorio
          a mano. No se le pide tarjeta ni se le cobra nada en esta pantalla.
        </p>
        {datosBancarios ? (
          <div className="nota-umbral" style={{ marginTop: 14, whiteSpace: "pre-line" }}>
            {datosBancarios}
          </div>
        ) : (
          <div className="nota-umbral" style={{ marginTop: 14 }}>
            Al terminar su registro le escribimos al correo que nos deje con
            los datos para el depósito.
          </div>
        )}
        <p className="meta" style={{ marginTop: 14 }}>
          Su perfil se publica en cuanto quede verificada su cédula. Las
          herramientas del plan se activan al acreditarse el pago; mientras
          tanto el perfil funciona como básico, nunca queda oculto.
        </p>
      </Modal>

      {/* El formulario, en ventana: la página de planes no se pierde
          detrás, y al cerrar se vuelve exactamente a donde se estaba. */}
      <Modal
        abierta={registrando}
        alCerrar={() => setRegistrando(false)}
        titulo="Su registro en el directorio"
        descripcion={
          ficha
            ? `Plan ${ficha.nombre} · ${ficha.precio}`
            : undefined
        }
        ancha
      >
        <FormularioAlta
          especialidades={especialidades}
          ciudades={ciudades}
          plan={elegido}
          alTerminar={() => {
            setRegistrando(false);
            setListo(true);
          }}
        />
      </Modal>

      <Modal
        abierta={listo}
        alCerrar={() => setListo(false)}
        titulo="¡Registro exitoso!"
        descripcion="Su solicitud quedó recibida."
        pie={
          <button
            type="button"
            className="enlace-boton"
            onClick={() => setListo(false)}
          >
            Entendido
          </button>
        }
      >
        <p>
          El siguiente paso es la verificación de su cédula contra el Registro
          Nacional de Profesionistas. En cuanto quede aprobada le escribimos al
          correo que nos dejó y su perfil se publica con el distintivo de
          cédula verificada.
        </p>
      </Modal>
    </>
  );
}
