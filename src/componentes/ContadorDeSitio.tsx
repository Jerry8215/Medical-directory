"use client";

import { useEffect } from "react";

/**
 * Avisa que alguien entró al sitio, una vez por sesión.
 *
 * La marca vive en `sessionStorage` y no en una cookie a propósito: no
 * identifica a nadie, no viaja al servidor y se borra al cerrar la
 * pestaña. Lo único que hace es evitar que la misma persona cuente seis
 * veces por recorrer seis páginas.
 *
 * Si el navegador no deja guardar nada —ventana privada, datos
 * bloqueados— se cuenta la visita igual. Preferible un número algo alto
 * que una pantalla de administración en blanco.
 */
const MARCA = "visita-contada";

export function ContadorDeSitio() {
  useEffect(() => {
    let yaContada = false;
    try {
      yaContada = sessionStorage.getItem(MARCA) === "si";
      sessionStorage.setItem(MARCA, "si");
    } catch {
      // Sin almacenamiento: se cuenta y ya.
    }
    if (yaContada) return;

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/visita", new Blob([], { type: "text/plain" }));
        return;
      }
      void fetch("/api/visita", { method: "POST", keepalive: true });
    } catch {
      // Sin métrica, pero con sitio funcionando.
    }
  }, []);

  return null;
}
