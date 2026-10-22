"use client";

import { useState, useTransition } from "react";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";
import { reportarComprobante, solicitarSuscripcion } from "@/lib/cobros";
import { intentar } from "@/lib/intentar";
import {
  contratarConTarjeta,
  darDeBajaSuscripcion,
} from "@/lib/suscripcion-acciones";

export type Plan = "BASICO" | "GOLD" | "PREMIUM";

export type FichaDePlan = {
  plan: Plan;
  nombre: string;
  descripcion: string;
  incluye: string[];
  mensual: string;
  anual: string;
};

export type PagoEnCurso = {
  id: string;
  plan: string;
  importe: string;
  meses: number;
  estado: string;
  referencia: string | null;
  /** Por dónde se está pagando: la tarjeta no se reporta a mano. */
  medio: "TRANSFERENCIA" | "TARJETA" | "CORTESIA";
};

/**
 * Cómo mejora su plan un médico, sin tener que llamar al consultorio.
 *
 * Hasta ahora el plan solo se elegía al registrarse y solo lo movía el
 * administrador. Un médico en básico que quería su fotografía y su
 * WhatsApp no tenía por dónde: la única vía era pedirlo por teléfono, y
 * una venta que depende de que el cliente llame es una venta que casi
 * nunca ocurre.
 *
 * Se puede pagar de dos maneras y las dos conviven a propósito. El
 * depósito no depende de ningún proveedor y es el que queda si el cobro
 * con tarjeta no está configurado; la tarjeta no depende de que alguien
 * revise, que es lo que hace que un depósito del viernes se acredite el
 * lunes. El médico elige, y en ninguno de los dos casos cambia su plan
 * hasta que el dinero entró de verdad.
 */
export function MiPlan({
  profesionalId,
  planActual,
  vence,
  fichas,
  pago,
  datosBancarios,
  hayTarjeta,
  suscripcion,
}: {
  profesionalId: string;
  planActual: Plan;
  vence: string | null;
  fichas: FichaDePlan[];
  pago: PagoEnCurso | null;
  datosBancarios: string | null;
  /** Si el procesador está configurado. Sin esto, solo queda el depósito. */
  hayTarjeta: boolean;
  /** Lo último que dijo el procesador de su cobro automático. */
  suscripcion: string | null;
}) {
  const [elegido, setElegido] = useState<Plan>(
    planActual === "BASICO" ? "GOLD" : planActual,
  );
  const [periodicidad, setPeriodicidad] = useState<"MENSUAL" | "ANUAL">("MENSUAL");
  const [referencia, setReferencia] = useState(pago?.referencia ?? "");
  const [aviso, setAviso] = useState("");
  const [enCurso, setEnCurso] = useState<PagoEnCurso | null>(pago);
  const [trabajando, iniciar] = useTransition();

  const ficha = fichas.find((f) => f.plan === elegido);

  return (
    <div>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="ficha formulario" style={{ marginBottom: 18 }}>
        <h2>Su plan hoy</h2>
        <p className="plan-hoy">
          {fichas.find((f) => f.plan === planActual)?.nombre ?? planActual}
        </p>
        <p className="meta">
          {planActual === "BASICO"
            ? "Su perfil aparece en el directorio con su cédula verificada. Eso no caduca y no se cobra."
            : vence
              ? `Activo hasta el ${vence}. Al vencer, el perfil vuelve al básico sin desaparecer.`
              : "Activo, sin fecha de vencimiento."}
        </p>
      </div>

      {suscripcion === "authorized" ? (
        <div className="ficha formulario" style={{ marginBottom: 18 }}>
          <h2>Cobro automático</h2>
          <p className="meta">
            Su tarjeta se cobra sola al terminar cada periodo. Puede darlo de
            baja cuando quiera: no se le devuelve lo pagado ni pierde el
            plan, simplemente deja de renovarse.
          </p>
          <div style={{ marginTop: 12 }}>
            <BotonConfirmar
              className="boton-suave"
              etiqueta="Dar de baja el cobro automático"
              disabled={trabajando}
              titulo="¿Dejar de cobrar su tarjeta?"
              cuerpo="Su plan sigue activo hasta la fecha que ya pagó. Al vencer, el perfil vuelve al básico y nunca deja de aparecer en el directorio."
              confirmar="Sí, dar de baja"
              alConfirmar={async () => {
                const r = await intentar(() => darDeBajaSuscripcion(profesionalId));
                setAviso(r.mensaje);
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Lo que ya está en marcha manda: ofrecerle contratar otra cosa
          mientras tiene un depósito sin reportar solo lo confunde. */}
      {enCurso ? (
        <div className="ficha formulario">
          <h2>Tiene un pago en curso</h2>
          <p className="meta">
            Plan {enCurso.plan} · {enCurso.importe} ·{" "}
            {enCurso.meses === 1 ? "un mes" : `${enCurso.meses} meses`}
          </p>

          {enCurso.medio === "TARJETA" ? (
            <div className="nota-umbral" style={{ marginTop: 12 }}>
              Falta que autorice el cobro en la página del procesador. Si
              cerró esa ventana sin terminar, vuelva a elegir el plan y lo
              llevamos otra vez; no se le cobró nada.
            </div>
          ) : enCurso.estado === "PENDIENTE" ? (
            <>
              {datosBancarios ? (
                <div className="nota-umbral" style={{ whiteSpace: "pre-line", marginTop: 12 }}>
                  {datosBancarios}
                </div>
              ) : (
                <div className="nota-umbral" style={{ marginTop: 12 }}>
                  Pida los datos para el depósito al consultorio.
                </div>
              )}

              <div className="campo" style={{ marginTop: 14 }}>
                <label htmlFor="referencia">
                  Referencia o folio de su depósito
                </label>
                <input
                  id="referencia"
                  value={referencia}
                  onChange={(e) => setReferencia(e.target.value)}
                  placeholder="Como aparece en su comprobante"
                />
              </div>

              <button
                type="button"
                className="boton-lleno"
                disabled={trabajando}
                onClick={() =>
                  iniciar(async () => {
                    const r = await intentar(() => reportarComprobante(enCurso.id, referencia));
                    setAviso(r.mensaje);
                    if (r.ok) {
                      setEnCurso({ ...enCurso, estado: "EN_REVISION", referencia });
                    }
                  })
                }
              >
                Ya deposité, reportar
              </button>
            </>
          ) : (
            <div className="nota-umbral" style={{ marginTop: 12 }}>
              Su comprobante está en revisión. En cuanto el consultorio
              confirme el depósito, las herramientas del plan se activan
              solas y su perfil no deja de aparecer mientras tanto.
            </div>
          )}
        </div>
      ) : (
        <div className="ficha formulario">
          <h2>Mejorar mi plan</h2>
          <p className="meta">
            {hayTarjeta
              ? "Con tarjeta se activa solo en cuanto el pago entra. Por depósito lo confirma el consultorio, normalmente el mismo día hábil."
              : "El pago es por depósito y lo confirma el consultorio. Aquí no se le pide tarjeta ni se le cobra nada."}
          </p>

          <div className="planes-rejilla" style={{ marginTop: 16 }}>
            {fichas
              .filter((f) => f.plan !== "BASICO")
              .map((f) => (
                <article
                  key={f.plan}
                  className="plan"
                  data-plan={f.plan.toLowerCase()}
                  data-elegido={elegido === f.plan}
                >
                  <div className="plan-tapa">
                    <p className="plan-nombre">{f.nombre}</p>
                    <p className="plan-precio">
                      {periodicidad === "ANUAL" ? f.anual : f.mensual}
                    </p>
                    {elegido === f.plan ? (
                      <span className="plan-marca">Elegido</span>
                    ) : null}
                  </div>
                  <div className="plan-cuerpo">
                    <p className="meta">{f.descripcion}</p>
                    <ul className="lista-limpia" style={{ marginTop: 12 }}>
                      {f.incluye.map((l) => (
                        <li key={l}>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path d="M2 6.2 4.6 8.8 10 3.4" stroke="currentColor" strokeWidth="2"
                              strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          {l}
                        </li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className={elegido === f.plan ? "boton-lleno" : "boton-suave"}
                      style={{ marginTop: 14, width: "100%" }}
                      onClick={() => setElegido(f.plan)}
                    >
                      {elegido === f.plan ? "Plan elegido" : `Elegir ${f.nombre}`}
                    </button>
                  </div>
                </article>
              ))}
          </div>

          <div className="campo" style={{ marginTop: 18 }}>
            <label htmlFor="periodicidad">Cada cuánto</label>
            <select
              id="periodicidad"
              value={periodicidad}
              onChange={(e) =>
                setPeriodicidad(e.target.value === "ANUAL" ? "ANUAL" : "MENSUAL")
              }
            >
              <option value="MENSUAL">Mensual</option>
              <option value="ANUAL">Anual, se pagan diez meses y se llevan doce</option>
            </select>
          </div>

          <div className="pagar-botones">
            {hayTarjeta ? (
              <button
                type="button"
                className="boton-lleno"
                disabled={trabajando || !ficha}
                onClick={() =>
                  iniciar(async () => {
                    const r = await intentar(() =>
                      contratarConTarjeta(profesionalId, elegido, periodicidad),
                    );
                    setAviso(r.mensaje);
                    // El procesador cobra en su propia página: es lo que
                    // hace que la tarjeta nunca pase por este servidor.
                    if (r.ok && r.irA) window.location.href = r.irA;
                  })
                }
              >
                {trabajando ? "Un momento…" : "Pagar con tarjeta"}
              </button>
            ) : null}

            <button
              type="button"
              className={hayTarjeta ? "boton-suave" : "boton-lleno"}
              disabled={trabajando || !ficha}
              onClick={() =>
                iniciar(async () => {
                  const r = await intentar(() => solicitarSuscripcion(
                    profesionalId,
                    elegido,
                    periodicidad,
                  ));
                  setAviso(r.mensaje);
                  if (r.ok && r.pagoId && ficha) {
                    setEnCurso({
                      id: r.pagoId,
                      plan: ficha.nombre,
                      importe: periodicidad === "ANUAL" ? ficha.anual : ficha.mensual,
                      meses: periodicidad === "ANUAL" ? 12 : 1,
                      estado: "PENDIENTE",
                      referencia: null,
                      medio: "TRANSFERENCIA",
                    });
                  }
                })
              }
            >
              {hayTarjeta ? "Pagar por depósito" : "Contratar este plan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
