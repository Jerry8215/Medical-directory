"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Flecha } from "@/componentes/Ilustraciones";

/**
 * Lo que ve el paciente cuando algo sale mal.
 *
 * Sin una pantalla propia, el sitio caía en la del armazón: fondo negro y
 * un «This page could not be found» en inglés. A un paciente que buscaba
 * a su médico eso le dice que el sitio está roto, y a un médico que lo
 * está conociendo le dice que no se puede confiar en él.
 *
 * Por eso no se pide disculpas ni se explica la causa: se le dice qué
 * hacer. Y se regresa solo a donde estaba, porque casi siempre el enlace
 * que falló era el raro y la página anterior funcionaba bien. La cuenta
 * regresiva va a la vista para que nadie sienta que el sitio lo arrastra
 * sin avisar, y el botón está ahí para quien no quiera esperarla.
 */

const ESPERA = 8;

export function AvisoDeError({
  titulo,
  cuerpo,
  reintentar,
}: {
  titulo: string;
  cuerpo: string;
  /** Solo los fallos pasajeros se pueden reintentar; un 404 no. */
  reintentar?: () => void;
}) {
  const router = useRouter();
  const [restan, setRestan] = useState(ESPERA);

  // A dónde se vuelve se decide al momento de volver y no antes: así la
  // pantalla no necesita saber en el primer dibujo si hay historial, que
  // es algo que el servidor no puede contestar.
  const volver = useCallback(() => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  useEffect(() => {
    const reloj = setInterval(() => setRestan((r) => r - 1), 1000);
    return () => clearInterval(reloj);
  }, []);

  useEffect(() => {
    if (restan <= 0) volver();
  }, [restan, volver]);

  return (
    <main className="envoltura pantalla-error">
      <div className="error-caja">
        <span className="error-marca" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.6v5" />
            <path d="M12 16.2h.01" />
          </svg>
        </span>

        <h1>{titulo}</h1>
        <p className="error-cuerpo">{cuerpo}</p>
        <p className="error-espera">Espere un momento o inténtelo de nuevo más tarde.</p>

        <div className="error-acciones">
          <button type="button" className="boton-lleno" onClick={volver}>
            Volver
            <Flecha size={16} />
          </button>

          {reintentar ? (
            <button type="button" className="boton-suave" onClick={reintentar}>
              Reintentar
            </button>
          ) : (
            <Link href="/delicias" className="boton-suave">
              Ver el directorio
            </Link>
          )}
        </div>

        <p className="error-cuenta" aria-live="polite">
          {restan > 0
            ? `Regresamos solos en ${restan} ${restan === 1 ? "segundo" : "segundos"}.`
            : "Regresando…"}
        </p>
      </div>
    </main>
  );
}
