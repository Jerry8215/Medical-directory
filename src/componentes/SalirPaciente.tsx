"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { salirComoPaciente } from "@/lib/paciente-acceso";

/**
 * Cerrar la sesión del paciente.
 *
 * La sesión dura un mes, lo que está bien en el teléfono propio y está
 * mal en el de un familiar o en una computadora prestada. Sin esta
 * puerta, quien entró desde un equipo ajeno deja sus consultas abiertas
 * para quien lo use después.
 */
export function SalirPaciente() {
  const router = useRouter();
  const [saliendo, iniciar] = useTransition();

  return (
    <button
      type="button"
      className="boton-texto"
      disabled={saliendo}
      onClick={() =>
        iniciar(async () => {
          await salirComoPaciente();
          router.replace("/");
        })
      }
    >
      {saliendo ? "Saliendo…" : "Salir"}
    </button>
  );
}
