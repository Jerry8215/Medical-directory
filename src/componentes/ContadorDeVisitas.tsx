"use client";

import { useEffect } from "react";

/**
 * Cuenta la visita al perfil y los clics a los botones de contacto.
 *
 * Los clics se detectan escuchando en el documento y no envolviendo cada
 * botón: así la página del perfil se mantiene como está, con sus enlaces
 * normales, y basta con marcarlos con `data-metrica`. Un enlace que se
 * abre en WhatsApp o en el teléfono no espera respuesta, de modo que el
 * aviso sale con `sendBeacon`, que el navegador entrega aunque la página
 * se esté yendo.
 *
 * Si falla, falla en silencio: perder una métrica no puede costarle al
 * paciente el acceso al teléfono de su médico.
 */
export function ContadorDeVisitas({ slug }: { slug: string }) {
  useEffect(() => {
    const avisar = (tipo: "vista" | "telefono" | "whatsapp") => {
      const cuerpo = JSON.stringify({ slug, tipo });
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(
            "/api/metricas",
            new Blob([cuerpo], { type: "application/json" }),
          );
          return;
        }
        void fetch("/api/metricas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: cuerpo,
          keepalive: true,
        });
      } catch {
        // Sin métrica, pero con perfil funcionando.
      }
    };

    avisar("vista");

    const alHacerClic = (e: MouseEvent) => {
      const destino = (e.target as HTMLElement | null)?.closest?.("[data-metrica]");
      if (!destino) return;
      const tipo = destino.getAttribute("data-metrica");
      if (tipo === "telefono" || tipo === "whatsapp") avisar(tipo);
    };

    document.addEventListener("click", alHacerClic);
    return () => document.removeEventListener("click", alHacerClic);
  }, [slug]);

  return null;
}
