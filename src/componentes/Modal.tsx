"use client";

import { useEffect, useRef } from "react";

/**
 * Una ventana modal.
 *
 * Usa el `<dialog>` del navegador y no un `div` flotante, que es lo que
 * trae gratis y bien hecho lo difícil: el foco atrapado dentro, el resto
 * de la página inerte para quien navega con teclado o lector, y la tecla
 * de escape cerrando. Reimplementar eso a mano es la forma más común de
 * dejar un panel que no se puede usar sin ratón.
 */
export function Modal({
  abierta,
  alCerrar,
  titulo,
  descripcion,
  ancha = false,
  children,
  pie,
}: {
  abierta: boolean;
  alCerrar: () => void;
  titulo: string;
  descripcion?: string;
  ancha?: boolean;
  children?: React.ReactNode;
  pie?: React.ReactNode;
}) {
  const caja = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = caja.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  return (
    <dialog
      ref={caja}
      className="modal"
      data-ancha={ancha}
      onClose={alCerrar}
      // Clic en el velo de afuera: el `dialog` reporta el clic sobre sí
      // mismo solo cuando cae fuera de su contenido.
      onClick={(e) => {
        if (e.target === caja.current) alCerrar();
      }}
    >
      <div className="modal-caja">
        <div className="modal-cabeza">
          <div>
            <h2>{titulo}</h2>
            {descripcion ? <p className="meta">{descripcion}</p> : null}
          </div>
          <button
            type="button"
            className="modal-cerrar"
            onClick={alCerrar}
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
            </svg>
          </button>
        </div>

        {children ? <div className="modal-cuerpo">{children}</div> : null}
        {pie ? <div className="modal-pie">{pie}</div> : null}
      </div>
    </dialog>
  );
}
