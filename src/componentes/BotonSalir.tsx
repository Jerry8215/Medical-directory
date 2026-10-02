"use client";

import { useTransition } from "react";

import { salir } from "@/lib/acceso";

export function BotonSalir() {
  const [saliendo, iniciar] = useTransition();

  return (
    <button
      type="button"
      className="enlace-boton"
      disabled={saliendo}
      onClick={() => iniciar(async () => void (await salir()))}
    >
      {saliendo ? "Saliendo…" : "Salir"}
    </button>
  );
}
