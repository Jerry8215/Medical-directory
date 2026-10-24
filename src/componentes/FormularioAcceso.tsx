"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";
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
          const r = await intentar(() => entrar(correo, clave));
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

      {/* Hasta ahora, quien olvidaba su contraseña no tenía adónde ir: la
          única salida era que el administrador se la reemitiera, y si el
          que la olvidaba era el administrador no quedaba nadie dentro. */}
      <p className="meta" style={{ marginTop: 14, textAlign: "center" }}>
        <Link href="/panel/recuperar" className="enlace-acento">
          Olvidé mi contraseña
        </Link>
      </p>
    </form>
  );
}
