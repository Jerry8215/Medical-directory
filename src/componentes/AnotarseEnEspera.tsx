"use client";

import { useState, useTransition } from "react";

import { anotarseEnEspera } from "@/lib/espera";

/**
 * Anotarse para que avisen cuando se libere un horario.
 *
 * Aparece cuando el médico no tiene huecos: es el único momento en que
 * sirve, y ofrecerlo siempre competiría con agendar, que es lo que de
 * verdad quiere el paciente. Arranca cerrado para que no parezca que no
 * hay más remedio que apuntarse.
 */
export function AnotarseEnEspera({
  slug,
  profesional,
}: {
  slug: string;
  profesional: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [nota, setNota] = useState("");
  const [resultado, setResultado] = useState<{ ok: boolean; mensaje: string } | null>(null);
  const [trabajando, iniciar] = useTransition();

  if (resultado?.ok) {
    return <div className="confirmada">{resultado.mensaje}</div>;
  }

  if (!abierto) {
    return (
      <button type="button" className="boton-suave" onClick={() => setAbierto(true)}>
        Avisarme si se libera un horario
      </button>
    );
  }

  return (
    <form
      className="formulario"
      onSubmit={(e) => {
        e.preventDefault();
        iniciar(async () => {
          setResultado(await anotarseEnEspera({ slug, nombre, telefono, nota }));
        });
      }}
      noValidate
    >
      <p className="meta">
        Le avisamos en cuanto alguien cancele con {profesional}. No se aparta el
        horario: queda para quien agende primero.
      </p>

      <div className="campo">
        <label htmlFor="espera-nombre">Su nombre</label>
        <input
          id="espera-nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoComplete="name"
        />
      </div>

      <div className="campo">
        <label htmlFor="espera-telefono">Su WhatsApp</label>
        <input
          id="espera-telefono"
          inputMode="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="10 dígitos"
          autoComplete="tel"
        />
      </div>

      <div className="campo">
        <label htmlFor="espera-nota">Si le sirven solo ciertos días, dígalo aquí</label>
        <input
          id="espera-nota"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Por ejemplo: solo por la tarde"
        />
      </div>

      <button className="boton-lleno" type="submit" disabled={trabajando}>
        {trabajando ? "Anotando…" : "Anotarme en la lista"}
      </button>

      {resultado && !resultado.ok ? (
        <p className="error" style={{ marginTop: 10 }}>
          {resultado.mensaje}
        </p>
      ) : null}
    </form>
  );
}
