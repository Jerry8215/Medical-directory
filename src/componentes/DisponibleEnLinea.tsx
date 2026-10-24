"use client";

import { useState, useTransition } from "react";

import { fijarDisponibilidadEnLinea } from "@/lib/disponibilidad-linea";
import { intentar } from "@/lib/intentar";

/**
 * Prenderse y apagarse para la consulta en línea.
 *
 * El interruptor y el precio van juntos: sin precio no se le ofrece al
 * paciente, y mandarlo a otra pantalla a cargarlo es garantizar que se
 * prenda sin él y que la primera consulta llegue con una cifra en cero.
 */
export function DisponibleEnLinea({
  slug,
  enLinea,
  precio,
}: {
  slug: string;
  enLinea: boolean;
  /** En pesos, ya convertido. */
  precio: number;
}) {
  const [prendido, setPrendido] = useState(enLinea);
  const [pesos, setPesos] = useState(precio ? String(precio) : "");
  const [aviso, setAviso] = useState("");
  const [trabajando, iniciar] = useTransition();

  function guardar(nuevoEstado: boolean) {
    iniciar(async () => {
      const r = await intentar(() =>
        fijarDisponibilidadEnLinea(slug, nuevoEstado, Number(pesos)),
      );
      setAviso(r.mensaje);
      if (r.ok) setPrendido(nuevoEstado);
    });
  }

  return (
    <div className="ficha formulario">
      <h2>Consulta en línea</h2>
      <p className="meta">
        Cuando está prendido, un paciente puede abrirle una consulta escrita
        y usted tiene veinte minutos para aceptarla. Si no alcanza, se le
        devuelve el importe y se le ofrece a otro médico. Apáguese cuando
        esté operando o fuera de alcance.
      </p>

      <div className="campo" style={{ marginTop: 14, maxWidth: 240 }}>
        <label htmlFor="precio-linea">Lo que cobra por consulta</label>
        <input
          id="precio-linea"
          inputMode="decimal"
          value={pesos}
          onChange={(e) => setPesos(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="500"
        />
        <small className="meta">
          En pesos. El directorio retiene el diez por ciento y el resto es
          suyo.
        </small>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="acciones" style={{ marginTop: 12 }}>
        <em className={`pastilla ${prendido ? "pastilla-bien" : "pastilla-espera"}`}>
          {prendido ? "Disponible ahora" : "No disponible"}
        </em>
        <button
          type="button"
          className={prendido ? "boton-suave" : "boton-lleno"}
          disabled={trabajando}
          onClick={() => guardar(!prendido)}
        >
          {trabajando
            ? "Un momento…"
            : prendido
              ? "Apagarme"
              : "Prenderme para consultas"}
        </button>
      </div>
    </div>
  );
}
