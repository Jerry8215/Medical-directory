"use client";

import { useEffect } from "react";

import { AvisoDeError } from "@/componentes/AvisoDeError";

/**
 * Algo falló al armar la página.
 *
 * Casi siempre es pasajero —la base tardó, la red se cortó— y por eso
 * aquí sí se ofrece reintentar: `reset` vuelve a montar la pantalla sin
 * recargar el sitio entero.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Queda en los registros del servidor con su huella, que es por donde
    // se rastrea después sin enseñarle nada de esto al paciente.
    console.error("Fallo en la página:", error.digest ?? error.message);
  }, [error]);

  return (
    <AvisoDeError
      titulo="No pudimos mostrar esta página"
      cuerpo="Fue un problema nuestro, no suyo, y lo más probable es que ya haya pasado."
      reintentar={reset}
    />
  );
}
