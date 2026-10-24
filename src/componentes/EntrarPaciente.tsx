"use client";

import { useState, useTransition } from "react";

import { TelefonoConLada } from "@/componentes/TelefonoConLada";
import { intentar } from "@/lib/intentar";
import { pedirEntrada } from "@/lib/paciente-acceso";

/**
 * Darse de alta y entrar, en la misma pantalla.
 *
 * No hay un formulario de registro y otro de acceso, porque para el
 * paciente no son dos cosas: escribe sus datos y quiere entrar. Tampoco
 * hay contraseña. Esto compite con mandar un WhatsApp, no con llenar un
 * formulario, y cada campo de más es gente que no termina.
 */
export function EntrarPaciente({ volverA }: { volverA?: string }) {
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acuse, setAcuse] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  if (acuse) {
    return (
      <div className="ficha formulario">
        <div className="confirmada">{acuse}</div>
        <p className="meta" style={{ marginTop: 12 }}>
          Abra el correo desde este mismo teléfono o computadora. Si no
          aparece en unos minutos, revise «no deseados» y vuelva a pedirlo.
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
          const r = await intentar(() => pedirEntrada({ nombre, correo, telefono }));
          if (r.ok) setAcuse(r.mensaje);
          else setError(r.mensaje);
        });
      }}
      noValidate
    >
      <div className="campo">
        <label htmlFor="pac-nombre">Su nombre</label>
        <input
          id="pac-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
          autoFocus
        />
      </div>

      <div className="campo">
        <label htmlFor="pac-correo">Su correo</label>
        <input
          id="pac-correo"
          type="email"
          inputMode="email"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          placeholder="Ahí le llega el enlace para entrar"
          autoComplete="email"
        />
      </div>

      <div className="campo">
        <label htmlFor="pac-telefono">Su WhatsApp</label>
        <TelefonoConLada
          id="pac-telefono"
          valor={telefono}
          alCambiar={(e164) => setTelefono(e164)}
        />
      </div>

      {error ? <p className="error">{error}</p> : null}

      <button className="boton-lleno" type="submit" disabled={enviando}>
        {enviando ? "Enviando…" : "Entrar"}
      </button>

      <p className="meta" style={{ marginTop: 12 }}>
        Sin contraseña. Con su correo y su WhatsApp le generamos un enlace
        nuevo cada vez que lo necesite.
      </p>

      {volverA ? <input type="hidden" value={volverA} readOnly /> : null}
    </form>
  );
}
