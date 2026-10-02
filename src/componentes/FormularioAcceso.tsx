"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { entrar } from "@/lib/acceso";

export function FormularioAcceso() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [entrando, iniciar] = useTransition();

  return (
    <form
      className="ficha formulario"
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        iniciar(async () => {
          const r = await entrar(correo, clave);
          if (r.ok) router.replace("/panel");
          else setError(r.mensaje);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="correo">Correo</label>
        <input
          id="correo"
          type="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          autoComplete="username"
        />
      </div>

      <div className="campo">
        <label htmlFor="clave">Contraseña</label>
        <input
          id="clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="current-password"
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="boton-lleno" type="submit" disabled={entrando}>
        {entrando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
