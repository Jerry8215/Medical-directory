"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { marcarComoVistas } from "@/lib/novedades-acciones";

type Novedad = {
  id: string;
  tipo: string;
  titulo: string;
  detalle: string | null;
  enlace: string | null;
  cuando: string;
};

/**
 * Lo que pasó mientras nadie miraba.
 *
 * Va arriba del panel y con su contador porque el consultorio reportó
 * exactamente esto: alguien solicitaba un alta o pedía una cita y no se
 * enteraba por ningún lado. Se marcan como vistas al revisarlas, de modo
 * que la lista se vacía y no se vuelve un adorno permanente.
 */
export function Novedades({ novedades }: { novedades: Novedad[] }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  const [trabajando, iniciar] = useTransition();

  const visibles = novedades.filter((n) => !ocultas.includes(n.id));

  if (visibles.length === 0) {
    return (
      <div className="nota-umbral">
        Sin novedades por revisar. Acá aparecen las solicitudes de alta, las
        citas nuevas y las opiniones en cuanto llegan.
      </div>
    );
  }

  return (
    <div className="novedades">
      <div className="novedades-cabeza">
        <b>
          {visibles.length === 1
            ? "1 novedad por revisar"
            : `${visibles.length} novedades por revisar`}
        </b>
        <button
          type="button"
          className="enlace-boton"
          disabled={trabajando}
          onClick={() =>
            iniciar(async () => {
              const ids = visibles.map((n) => n.id);
              await marcarComoVistas(ids);
              setOcultas((o) => [...o, ...ids]);
            })
          }
        >
          Marcar todas como vistas
        </button>
      </div>

      {visibles.map((n) => (
        <div className="novedad" key={n.id}>
          <div style={{ minWidth: 0 }}>
            <span className={`pastilla ${etiqueta(n.tipo)}`}>{nombre(n.tipo)}</span>
            <p style={{ fontWeight: 600, marginTop: 6 }}>{n.titulo}</p>
            {n.detalle ? <p className="meta">{n.detalle}</p> : null}
            <p className="meta">{n.cuando}</p>
          </div>

          <div className="novedad-acciones">
            {n.enlace ? (
              <Link href={n.enlace} className="boton-suave">
                Revisar
              </Link>
            ) : null}
            <button
              type="button"
              className="enlace-boton"
              disabled={trabajando}
              onClick={() =>
                iniciar(async () => {
                  await marcarComoVistas([n.id]);
                  setOcultas((o) => [...o, n.id]);
                })
              }
            >
              Vista
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function nombre(tipo: string): string {
  if (tipo === "SOLICITUD_ALTA") return "Solicitud de alta";
  if (tipo === "CITA_NUEVA") return "Cita nueva";
  if (tipo === "CITA_CANCELADA") return "Cita cancelada";
  return "Opinión por revisar";
}

function etiqueta(tipo: string): string {
  return tipo === "CITA_CANCELADA" ? "pastilla-espera" : "pastilla-bien";
}
