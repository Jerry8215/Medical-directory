"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";
import { fijarClaveConToken } from "@/lib/recuperar-acciones";

/**
 * Elegir la contraseña nueva desde el enlace del correo.
 *
 * Se pide dos veces porque el campo va oculto y un dedo de más en una
 * contraseña que nadie ve vuelve a dejar fuera a quien acaba de entrar,
 * que es exactamente el problema que esta pantalla viene a resolver.
 */
export function FijarClaveNueva({ token }: { token: string }) {
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [guardando, iniciar] = useTransition();

  if (listo) {
    return (
      <div className="ficha formulario">
        <div className="confirmada">
          Listo. Ya puede entrar con su contraseña nueva.
        </div>
        <Link
          href="/panel/acceso"
          className="boton-lleno"
          style={{ marginTop: 14, display: "inline-block" }}
        >
          Entrar al panel
        </Link>
      </div>
    );
  }

  return (
    <form
      className="ficha formulario"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        if (clave.trim() !== repetida.trim()) {
          setError("Las dos contraseñas no coinciden.");
          return;
        }
        iniciar(async () => {
          const r = await intentar(() => fijarClaveConToken(token, clave));
          if (r.ok) setListo(true);
          else setError(r.mensaje);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="clave-nueva">Contraseña nueva</label>
        <input
          id="clave-nueva"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="new-password"
          autoFocus
        />
        <small className="meta">Al menos diez caracteres.</small>
      </div>

      <div className="campo">
        <label htmlFor="clave-repetida">Escríbala otra vez</label>
        <input
          id="clave-repetida"
          type="password"
          value={repetida}
          onChange={(e) => setRepetida(e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="boton-lleno" type="submit" disabled={guardando}>
        {guardando ? "Guardando…" : "Guardar mi contraseña"}
      </button>
    </form>
  );
}
