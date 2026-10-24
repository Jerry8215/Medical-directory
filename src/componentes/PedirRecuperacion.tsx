"use client";

import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";
import { pedirRecuperacion } from "@/lib/recuperar-acciones";

/**
 * Pedir el enlace para recuperar la contraseña.
 *
 * El acuse es el mismo exista o no la cuenta, así que al enviarse se
 * reemplaza el formulario entero: dejarlo en pantalla invita a probar
 * otra dirección para ver si cambia el mensaje, y no cambia.
 */
export function PedirRecuperacion() {
  const [correo, setCorreo] = useState("");
  const [acuse, setAcuse] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  if (acuse) {
    return (
      <div className="ficha formulario">
        <div className="confirmada">{acuse}</div>
        <p className="meta" style={{ marginTop: 12 }}>
          ¿No le llegó? Espere un par de minutos y vuelva a pedirlo desde
          esta misma página. Si usa Gmail, revise también «Promociones».
        </p>
      </div>
    );
  }

  return (
    <form
      className="ficha formulario"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        iniciar(async () => {
          const r = await intentar(() => pedirRecuperacion(correo));
          if (r.ok) setAcuse(r.mensaje);
          else setError(r.mensaje);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="correo-recuperar">Su correo</label>
        <input
          id="correo-recuperar"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="El mismo con el que entra al panel"
          autoComplete="username"
          autoFocus
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="boton-lleno" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Enviarme el enlace"}
      </button>
    </form>
  );
}
