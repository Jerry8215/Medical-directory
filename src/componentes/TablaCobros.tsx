"use client";

import { useState, useTransition } from "react";

import { BotonConfirmar } from "@/componentes/BotonConfirmar";
import { acreditarPago, rechazarPago } from "@/lib/cobros";

export type FilaPago = {
  id: string;
  medico: string;
  plan: string;
  importe: string;
  medio: string;
  estado: string;
  referencia: string | null;
  folio: string | null;
  cuando: string;
  vigencia: string | null;
};

/**
 * La caja del directorio.
 *
 * Lo que está esperando aprobación va primero y con su botón a la vista,
 * porque es lo único de esta pantalla que detiene a alguien: mientras ese
 * pago no se acredite, el médico depositó y no tiene su plan.
 */
export function TablaCobros({ pagos }: { pagos: FilaPago[] }) {
  const [aviso, setAviso] = useState("");
  const [rechazando, setRechazando] = useState("");
  const [motivo, setMotivo] = useState("");
  const [resueltos, setResueltos] = useState<string[]>([]);
  const [trabajando, iniciar] = useTransition();

  const visibles = pagos.filter((p) => !resueltos.includes(p.id));
  const porRevisar = visibles.filter((p) => p.estado === "EN_REVISION");
  const resto = visibles.filter((p) => p.estado !== "EN_REVISION");

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>, id: string) {
    iniciar(async () => {
      const r = await accion();
      setAviso(r.mensaje);
      if (r.ok) setResueltos((x) => [...x, id]);
      setRechazando("");
      setMotivo("");
    });
  }

  return (
    <div>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="seccion-cabeza">
        <h2>Esperando aprobación</h2>
        <span>{porRevisar.length}</span>
      </div>

      {porRevisar.length === 0 ? (
        <div className="nota-umbral">
          No hay depósitos por revisar. Cuando un médico reporte su referencia,
          aparece acá.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {porRevisar.map((p) => (
            <div className="cobro" key={p.id}>
              <div style={{ minWidth: 0 }}>
                <b>{p.medico}</b>
                <p className="meta">
                  {p.plan} · {p.importe} · {p.medio.toLowerCase()}
                </p>
                <p className="meta">
                  Referencia: {p.referencia ?? "sin referencia"} · {p.cuando}
                </p>
              </div>

              <div className="cobro-acciones">
                {rechazando === p.id ? (
                  <>
                    <input
                      className="campo-motivo"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="¿Por qué se rechaza?"
                      aria-label="Motivo del rechazo"
                    />
                    <BotonConfirmar
                      etiqueta="Confirmar rechazo"
                      peligro
                      disabled={trabajando}
                      titulo={`¿Rechazar el pago de ${p.medico}?`}
                      cuerpo="El cobro queda marcado como rechazado y el médico ve el motivo. Si fue un error, tendrá que volver a registrar el pago desde cero."
                      confirmar="Sí, rechazar el pago"
                      alConfirmar={() => ejecutar(() => rechazarPago(p.id, motivo), p.id)}
                    />
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="boton-lleno"
                      disabled={trabajando}
                      onClick={() => ejecutar(() => acreditarPago(p.id), p.id)}
                    >
                      Acreditar
                    </button>
                    <button
                      type="button"
                      className="enlace-boton peligro"
                      disabled={trabajando}
                      onClick={() => setRechazando(p.id)}
                    >
                      Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="seccion-cabeza" style={{ marginTop: 26 }}>
        <h2>Historial</h2>
        <span>{resto.length}</span>
      </div>

      <div className="tabla">
        <div className="tabla-fila tabla-cabeza">
          <span>Médico</span>
          <span>Concepto</span>
          <span>Estado</span>
          <span>Vigencia</span>
        </div>
        {resto.map((p) => (
          <div className="tabla-fila" key={p.id}>
            <span>
              {p.medico}
              <br />
              <em className="meta">{p.folio ?? p.cuando}</em>
            </span>
            <span>
              {p.plan}
              <br />
              <em className="meta">{p.importe}</em>
            </span>
            <span>
              <em className={`pastilla ${etiqueta(p.estado)}`}>{nombre(p.estado)}</em>
            </span>
            <span className="meta">{p.vigencia ?? "—"}</span>
          </div>
        ))}
        {resto.length === 0 ? (
          <div className="tabla-fila">
            <span style={{ gridColumn: "1 / -1" }} className="meta">
              Todavía no hay cobros registrados.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function nombre(estado: string): string {
  if (estado === "ACREDITADO") return "Acreditado";
  if (estado === "RECHAZADO") return "Rechazado";
  if (estado === "EN_REVISION") return "Por revisar";
  return "Esperando depósito";
}

function etiqueta(estado: string): string {
  if (estado === "ACREDITADO") return "pastilla-bien";
  if (estado === "RECHAZADO") return "pastilla-mal";
  return "pastilla-espera";
}
