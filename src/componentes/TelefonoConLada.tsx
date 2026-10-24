"use client";

import { useState } from "react";

import { bandera, MEXICO, normalizarTelefono, PAISES, separar } from "@/lib/telefono";

/**
 * Un teléfono con su país.
 *
 * El campo pedía diez dígitos y nada más, porque al principio todo el
 * mundo era de Delicias. Con la consulta en línea abierta a cualquier
 * región eso se vuelve un muro: quien escribe un número bueno de Bogotá
 * o de Madrid lee que revise su teléfono.
 *
 * La bandera va delante porque es lo que se reconoce de un vistazo, sin
 * leer. El valor que sale hacia afuera es siempre E.164 —`+` y dígitos—,
 * de modo que quien use este componente no tiene que saber nada de
 * ladas: recibe un número que sirve igual en México que en España.
 */
export function TelefonoConLada({
  id,
  valor,
  alCambiar,
  requerido = false,
}: {
  id: string;
  /** En E.164. Puede venir vacío. */
  valor: string;
  alCambiar: (e164: string, valido: boolean) => void;
  requerido?: boolean;
}) {
  const inicial = valor ? separar(valor) : { pais: MEXICO, nacional: "" };
  const [iso, setIso] = useState(inicial.pais.iso);
  const [nacional, setNacional] = useState(inicial.nacional);

  const pais = PAISES.find((p) => p.iso === iso) ?? MEXICO;

  function avisar(nuevoIso: string, nuevoNacional: string) {
    const elPais = PAISES.find((p) => p.iso === nuevoIso) ?? MEXICO;
    const r = normalizarTelefono(elPais.lada, nuevoNacional);
    alCambiar(r.ok ? r.valor : "", r.ok);
  }

  return (
    <div className="telefono-lada">
      <label htmlFor={`${id}-pais`} className="oculto-visual">
        País de su teléfono
      </label>
      <select
        id={`${id}-pais`}
        value={iso}
        onChange={(e) => {
          setIso(e.target.value);
          avisar(e.target.value, nacional);
        }}
      >
        {PAISES.map((p) => (
          <option key={p.iso} value={p.iso}>
            {bandera(p.iso)} +{p.lada} · {p.nombre}
          </option>
        ))}
      </select>

      <span className="telefono-lada-marca" aria-hidden="true">
        {bandera(pais.iso)} +{pais.lada}
      </span>

      <input
        id={id}
        inputMode="tel"
        autoComplete="tel-national"
        required={requerido}
        value={nacional}
        onChange={(e) => {
          // Se deja escribir con espacios y guiones: corregirle los dedos
          // a alguien mientras teclea su propio número es molesto y no
          // hace falta, porque al salir se normaliza igual.
          const limpio = e.target.value.replace(/[^\d\s().-]/g, "");
          setNacional(limpio);
          avisar(iso, limpio);
        }}
        placeholder={pais.iso === "MX" ? "10 dígitos" : "Su número sin la lada"}
      />
    </div>
  );
}
