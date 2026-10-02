"use client";

import { useState, useTransition } from "react";

import { cambiarMiClave } from "@/lib/usuarios-admin";

/**
 * Cambiar la propia contraseña.
 *
 * Se pide la actual aunque ya haya sesión: una sesión abierta en un equipo
 * ajeno no debería poder quedarse con la cuenta.
 */
export function FormularioClave() {
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [repetida, setRepetida] = useState("");
  const [aviso, setAviso] = useState("");
  const [listo, setListo] = useState(false);
  const [trabajando, iniciar] = useTransition();

  if (listo) {
    return <div className="confirmada">Contraseña cambiada. Úsela la próxima vez que entre.</div>;
  }

  return (
    <form
      className="ficha formulario"
      onSubmit={(e) => {
        e.preventDefault();
        if (nueva !== repetida) {
          setAviso("Las dos contraseñas nuevas no coinciden.");
          return;
        }
        iniciar(async () => {
          const r = await cambiarMiClave(actual, nueva);
          setAviso(r.mensaje);
          setListo(r.ok);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="actual">Contraseña actual</label>
        <input
          id="actual"
          type="password"
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      <div className="campo">
        <label htmlFor="nueva">Contraseña nueva</label>
        <input
          id="nueva"
          type="password"
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          autoComplete="new-password"
        />
        <small className="meta">Al menos diez caracteres.</small>
      </div>

      <div className="campo">
        <label htmlFor="repetida">Repítala</label>
        <input
          id="repetida"
          type="password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {aviso ? <p className="error">{aviso}</p> : null}

      <button className="boton-lleno" type="submit" disabled={trabajando}>
        {trabajando ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}
