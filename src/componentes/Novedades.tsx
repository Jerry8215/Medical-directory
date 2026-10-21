"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import { Campana } from "@/componentes/Iconos";
import { Modal } from "@/componentes/Modal";
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
 * Antes era una lista encajada arriba del tablero, y lo que ocurría es
 * que quien entraba a revisar sus cobros pasaba por encima de un alta sin
 * verla. Ahora se abre sola al entrar y hay que cerrarla: es un aviso, y
 * un aviso que se puede ignorar sin querer no está avisando nada.
 *
 * La campana queda después, con su contador, para volver a abrirla sin
 * recargar la página.
 */
export function Novedades({ novedades }: { novedades: Novedad[] }) {
  const [ocultas, setOcultas] = useState<string[]>([]);
  // Nace abierta si hay algo que atender, y no se abre desde un efecto:
  // el estado inicial ya sabe la respuesta. Lo que llegue después espera
  // en la campana en lugar de interrumpir lo que se esté haciendo.
  const [abierta, setAbierta] = useState(novedades.length > 0);
  const [trabajando, iniciar] = useTransition();

  const visibles = novedades.filter((n) => !ocultas.includes(n.id));

  const marcar = (ids: string[]) =>
    iniciar(async () => {
      await marcarComoVistas(ids);
      setOcultas((o) => [...o, ...ids]);
    });

  return (
    <>
      <button
        type="button"
        className="campana"
        onClick={() => setAbierta(true)}
        aria-label={
          visibles.length === 0
            ? "Novedades"
            : `${visibles.length} novedades por revisar`
        }
      >
        <Campana size={19} />
        {visibles.length > 0 ? (
          <span className="campana-punto">{visibles.length}</span>
        ) : null}
      </button>

      <Modal
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        titulo="Novedades"
        descripcion={
          visibles.length === 0
            ? "Nada pendiente por ahora."
            : visibles.length === 1
              ? "1 cosa esperando su revisión."
              : `${visibles.length} cosas esperando su revisión.`
        }
        ancha
        pie={
          visibles.length > 0 ? (
            <>
              <button
                type="button"
                className="enlace-boton callado"
                disabled={trabajando}
                onClick={() => marcar(visibles.map((n) => n.id))}
              >
                Marcar todas como vistas
              </button>
              <button
                type="button"
                className="enlace-boton"
                onClick={() => setAbierta(false)}
              >
                Cerrar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="enlace-boton"
              onClick={() => setAbierta(false)}
            >
              Entendido
            </button>
          )
        }
      >
        {visibles.length === 0 ? (
          <div className="nota-umbral">
            Acá aparecen las solicitudes de alta, las citas nuevas y las
            opiniones en cuanto llegan. Las que ya resolvió se apagan solas.
          </div>
        ) : (
          <ul className="novedades">
            {visibles.map((n) => (
              <li className="novedad" key={n.id}>
                <div style={{ minWidth: 0 }}>
                  <span className={`pastilla ${etiqueta(n.tipo)}`}>
                    {nombre(n.tipo)}
                  </span>
                  <p className="novedad-titulo">{n.titulo}</p>
                  {n.detalle ? <p className="meta">{n.detalle}</p> : null}
                  <p className="meta">{n.cuando}</p>
                </div>

                <div className="novedad-acciones">
                  {n.enlace ? (
                    <Link
                      href={n.enlace}
                      className="enlace-boton"
                      onClick={() => setAbierta(false)}
                    >
                      Revisar
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    className="enlace-boton callado"
                    disabled={trabajando}
                    onClick={() => marcar([n.id])}
                  >
                    Vista
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </>
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
