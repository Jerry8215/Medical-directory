"use client";

import { useState, useTransition } from "react";

import { Modal } from "@/componentes/Modal";

/**
 * Un botón que pregunta antes de hacer.
 *
 * Borrar un perfil, rechazar una solicitud o desactivar un acceso son
 * cosas que no se deshacen, y hasta ahora ocurrían con un solo clic. Un
 * dedo que resbala en el panel del consultorio borra a un médico que
 * tardó una semana en darse de alta.
 *
 * La pregunta nombra lo que va a pasar en lugar de preguntar «¿está
 * seguro?», que es una pregunta que nadie lee. Y el botón que confirma
 * repite el verbo, para que quien venía en automático se dé cuenta a
 * tiempo de qué está confirmando.
 */
export function BotonConfirmar({
  etiqueta,
  titulo,
  cuerpo,
  confirmar,
  alConfirmar,
  peligro = false,
  className,
  disabled = false,
  icono,
}: {
  etiqueta: React.ReactNode;
  titulo: string;
  cuerpo: string;
  /** El verbo del botón que confirma: «Sí, eliminar». */
  confirmar: string;
  alConfirmar: () => void | Promise<void>;
  peligro?: boolean;
  className?: string;
  disabled?: boolean;
  icono?: React.ReactNode;
}) {
  const [abierta, setAbierta] = useState(false);
  const [trabajando, iniciar] = useTransition();

  return (
    <>
      <button
        type="button"
        className={className ?? `enlace-boton${peligro ? " peligro" : ""}`}
        disabled={disabled || trabajando}
        onClick={() => setAbierta(true)}
      >
        {icono}
        {etiqueta}
      </button>

      <Modal
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        titulo={titulo}
        descripcion={cuerpo}
        pie={
          <>
            <button
              type="button"
              className="enlace-boton callado"
              onClick={() => setAbierta(false)}
              disabled={trabajando}
            >
              Cancelar
            </button>
            <button
              type="button"
              className={`enlace-boton${peligro ? " peligro" : ""}`}
              disabled={trabajando}
              onClick={() =>
                iniciar(async () => {
                  await alConfirmar();
                  setAbierta(false);
                })
              }
            >
              {trabajando ? "Un momento…" : confirmar}
            </button>
          </>
        }
      />
    </>
  );
}
