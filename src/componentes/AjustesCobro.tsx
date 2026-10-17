"use client";

import { useState, useTransition } from "react";

import { guardarAjustesDeCobro } from "@/lib/ajustes-cobro";
import { pesos } from "@/lib/suscripciones";

/**
 * Los precios y los datos del depósito, en manos del consultorio.
 *
 * Se capturan en pesos enteros y se guardan en centavos: pedirle al
 * consultorio que escriba 19000 para decir ciento noventa pesos sería
 * trasladarle una decisión del programa.
 */
export function AjustesCobro({
  gold,
  premium,
  bancarios,
}: {
  gold: number;
  premium: number;
  bancarios: string;
}) {
  const [g, setG] = useState(String(Math.round(gold / 100)));
  const [p, setP] = useState(String(Math.round(premium / 100)));
  const [banco, setBanco] = useState(bancarios);
  const [aviso, setAviso] = useState("");
  const [trabajando, iniciar] = useTransition();

  const gNum = Number(g);
  const pNum = Number(p);
  const validos = Number.isFinite(gNum) && gNum > 0 && Number.isFinite(pNum) && pNum > 0;

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          const r = await guardarAjustesDeCobro(
            Math.round(gNum * 100),
            Math.round(pNum * 100),
            banco,
          );
          setAviso(r.mensaje);
        });
      }}
    >
      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <div className="rejilla-campos">
        <div className="campo">
          <label htmlFor="precio-gold">Plan Gold, pesos al mes</label>
          <input
            id="precio-gold"
            inputMode="numeric"
            value={g}
            onChange={(e) => setG(e.target.value)}
          />
          <small className="meta">
            Anual: {validos ? pesos(gNum * 100 * 10) : "—"}, que son doce meses al
            precio de diez.
          </small>
        </div>

        <div className="campo">
          <label htmlFor="precio-premium">Plan Premium, pesos al mes</label>
          <input
            id="precio-premium"
            inputMode="numeric"
            value={p}
            onChange={(e) => setP(e.target.value)}
          />
          <small className="meta">
            Anual: {validos ? pesos(pNum * 100 * 10) : "—"}.
          </small>
        </div>
      </div>

      <div className="campo">
        <label htmlFor="datos-bancarios">
          Datos para la transferencia, como los verá el médico
        </label>
        <textarea
          id="datos-bancarios"
          rows={4}
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
          placeholder={"Banco\nTitular de la cuenta\nCLABE"}
        />
        <small className="meta">
          Se le muestran al médico al momento de pagar. Sin esto, no sabe a dónde
          depositar.
        </small>
      </div>

      <button className="boton-lleno" type="submit" disabled={trabajando || !validos}>
        {trabajando ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
