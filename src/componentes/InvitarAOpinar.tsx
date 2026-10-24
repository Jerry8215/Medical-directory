"use client";

import { useState, useTransition } from "react";

import { intentar } from "@/lib/intentar";
import { invitarAOpinar } from "@/lib/invitar-opinion";

/**
 * Pedirle su reseña a un paciente que no agendó por el sitio.
 *
 * Atar la opinión al enlace de la cita dejó fuera a la mayoría: quien
 * agendó por teléfono, por WhatsApp o llegó al mostrador no tiene
 * enlace. Esto genera uno a nombre de un paciente concreto, sirve una
 * sola vez y queda registrado quién lo emitió.
 */
export function InvitarAOpinar({
  profesionalId,
  profesional,
}: {
  profesionalId: string;
  profesional: string;
}) {
  const [paciente, setPaciente] = useState("");
  const [contacto, setContacto] = useState("");
  const [atendidoEn, setAtendidoEn] = useState("");
  const [aviso, setAviso] = useState("");
  const [enlace, setEnlace] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [trabajando, iniciar] = useTransition();

  return (
    <div className="ficha formulario">
      <h2>Pedir una reseña</h2>
      <p className="meta">
        Para el paciente que se atendió con {profesional} pero agendó por
        teléfono, por WhatsApp o en el mostrador. Se genera un enlace a su
        nombre que sirve una sola vez. Al revisarla se verá que la invitó el
        consultorio, y no que la respalda una cita del sitio.
      </p>

      <div className="campo" style={{ marginTop: 14 }}>
        <label htmlFor="invitado-nombre">Nombre del paciente</label>
        <input
          id="invitado-nombre"
          value={paciente}
          onChange={(e) => setPaciente(e.target.value)}
          placeholder="Como lo tiene anotado"
          autoComplete="off"
        />
      </div>

      <div className="campo">
        <label htmlFor="invitado-contacto">Su correo o su WhatsApp (opcional)</label>
        <input
          id="invitado-contacto"
          value={contacto}
          onChange={(e) => setContacto(e.target.value)}
          placeholder="Si pone un correo, se lo mandamos nosotros"
          autoComplete="off"
        />
      </div>

      <div className="campo">
        <label htmlFor="invitado-fecha">¿Qué día se atendió? (opcional)</label>
        <input
          id="invitado-fecha"
          type="date"
          value={atendidoEn}
          onChange={(e) => setAtendidoEn(e.target.value)}
        />
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      {enlace ? (
        <div className="credencial-nueva" style={{ marginTop: 12 }}>
          <p className="rotulo">El enlace del paciente</p>
          <p>
            <code style={{ wordBreak: "break-all" }}>{enlace}</code>
          </p>
          <button
            type="button"
            className="boton-suave"
            onClick={() => {
              navigator.clipboard?.writeText(enlace).then(
                () => setCopiado(true),
                () => setCopiado(false),
              );
            }}
          >
            {copiado ? "Copiado" : "Copiar el enlace"}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="boton-lleno"
        style={{ marginTop: 14 }}
        disabled={trabajando || !paciente.trim()}
        onClick={() =>
          iniciar(async () => {
            setCopiado(false);
            const r = await intentar(() =>
              invitarAOpinar({ profesionalId, paciente, contacto, atendidoEn }),
            );
            setAviso(r.mensaje);
            if (r.ok && "enlace" in r) {
              setEnlace(r.enlace);
              setPaciente("");
              setContacto("");
              setAtendidoEn("");
            }
          })
        }
      >
        {trabajando ? "Generando…" : "Generar la invitación"}
      </button>
    </div>
  );
}
