"use client";

import { useState, useTransition } from "react";

import { abrirPeriodo, cerrarPeriodo } from "@/lib/periodos-cerrados";

export type PeriodoFila = {
  id: string;
  desde: string;
  hasta: string;
  motivo: string | null;
  pasado: boolean;
};

/**
 * Vacaciones y ausencias.
 *
 * El médico piensa en un rango —«del 20 al 28»— y no en días sueltos, así
 * que se captura así. Cerrar no cancela las citas que ya estaban: eso lo
 * decide él, y el mensaje se lo dice cuando ocurre.
 */
export function PeriodosCerrados({
  profesionalId,
  periodos,
}: {
  profesionalId: string;
  periodos: PeriodoFila[];
}) {
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [aviso, setAviso] = useState("");
  const [quitados, setQuitados] = useState<string[]>([]);
  const [nuevos, setNuevos] = useState<PeriodoFila[]>([]);
  const [trabajando, iniciar] = useTransition();

  const visibles = [...periodos, ...nuevos].filter((p) => !quitados.includes(p.id));

  return (
    <div>
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <form
        className="formulario"
        onSubmit={(e) => {
          e.preventDefault();
          iniciar(async () => {
            const r = await cerrarPeriodo(profesionalId, desde, hasta || desde, motivo);
            setAviso(r.mensaje);
            if (r.ok) {
              setNuevos((n) => [
                ...n,
                {
                  id: `nuevo-${Date.now()}`,
                  desde,
                  hasta: hasta || desde,
                  motivo: motivo.trim() || null,
                  pasado: false,
                },
              ]);
              setDesde("");
              setHasta("");
              setMotivo("");
            }
          });
        }}
      >
        <div className="rejilla-campos">
          <div className="campo">
            <label htmlFor="cierre-desde">Del día</label>
            <input
              id="cierre-desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
            />
          </div>
          <div className="campo">
            <label htmlFor="cierre-hasta">Al día</label>
            <input
              id="cierre-hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
            <small className="meta">Si es un solo día, puede dejarlo vacío.</small>
          </div>
        </div>

        <div className="campo">
          <label htmlFor="cierre-motivo">Motivo, si quiere anotarlo</label>
          <input
            id="cierre-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Vacaciones, congreso, guardia"
          />
        </div>

        <button className="boton-lleno" type="submit" disabled={trabajando || !desde}>
          {trabajando ? "Cerrando…" : "Cerrar esos días"}
        </button>
      </form>

      <div className="tabla" style={{ marginTop: 18 }}>
        <div className="tabla-fila tabla-cabeza">
          <span>Desde</span>
          <span>Hasta</span>
          <span>Motivo</span>
          <span>Acción</span>
        </div>
        {visibles.map((p) => (
          <div className="tabla-fila" key={p.id}>
            <span>{p.desde}</span>
            <span>{p.hasta}</span>
            <span className="meta">{p.motivo ?? "—"}</span>
            <span>
              <button
                type="button"
                className="enlace-boton"
                disabled={trabajando || p.id.startsWith("nuevo-")}
                onClick={() =>
                  iniciar(async () => {
                    const r = await abrirPeriodo(p.id);
                    setAviso(r.mensaje);
                    if (r.ok) setQuitados((q) => [...q, p.id]);
                  })
                }
              >
                Reabrir
              </button>
            </span>
          </div>
        ))}
        {visibles.length === 0 ? (
          <div className="tabla-fila">
            <span style={{ gridColumn: "1 / -1" }} className="meta">
              No hay días cerrados. Su agenda se ofrece completa.
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
