"use client";

import { useEffect, useRef, useState } from "react";

/** La tarjeta del directorio muestra el retrato en 1 : 1.2. */
export const PROPORCION = 1.2;
/** Un retrato de perfil no necesita más que esto, ni en pantalla ni impreso. */
export const ANCHO_MAXIMO = 760;

const ANCHO_MARCO = 240;
const ALTO_MARCO = Math.round(ANCHO_MARCO * PROPORCION);

/**
 * Encuadrar la fotografía antes de subirla.
 *
 * El recorte lo decidía el sistema: tomaba el centro de la imagen, un
 * poco hacia arriba, porque ahí suele estar la cara. Suele, no siempre.
 * En una foto de grupo o de cuerpo entero cortaba la cabeza, y el médico
 * no tenía manera de corregirlo más que volver a tomar la foto con el
 * encuadre que al sistema le gustara.
 *
 * Aquí ve el marco exacto que va a quedar, mueve la imagen con el dedo o
 * el ratón y acerca con la barra. Lo que se ve es lo que se sube: el
 * recorte final se calcula sobre la imagen original, no sobre esta
 * vista, así que la nitidez no depende del tamaño del marco en pantalla.
 */
export function RecorteFoto({
  archivo,
  trabajando,
  alConfirmar,
  alCancelar,
}: {
  archivo: File;
  trabajando: boolean;
  alConfirmar: (recorte: Blob) => void;
  alCancelar: () => void;
}) {
  // La URL se crea una sola vez, al montar: el componente se vuelve a
  // montar con cada archivo, así que no hay que recalcularla ni fijarla
  // desde un efecto.
  const [url] = useState(() => URL.createObjectURL(archivo));
  const [medidas, setMedidas] = useState<{ ancho: number; alto: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [corrido, setCorrido] = useState({ x: 0, y: 0 });
  const [error, setError] = useState("");
  const imagen = useRef<HTMLImageElement | null>(null);
  const arrastre = useRef<{ x: number; y: number } | null>(null);

  // El navegador retiene el archivo mientras la URL exista.
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  // Cuánto hay que agrandar la imagen para que llene el marco.
  const base = medidas
    ? Math.max(ANCHO_MARCO / medidas.ancho, ALTO_MARCO / medidas.alto)
    : 1;
  const escala = base * zoom;
  const anchoVista = medidas ? medidas.ancho * escala : 0;
  const altoVista = medidas ? medidas.alto * escala : 0;
  const topeX = Math.max(0, (anchoVista - ANCHO_MARCO) / 2);
  const topeY = Math.max(0, (altoVista - ALTO_MARCO) / 2);

  /** La imagen nunca puede dejar un borde del marco vacío. */
  function dentro(p: { x: number; y: number }) {
    return {
      x: Math.min(topeX, Math.max(-topeX, p.x)),
      y: Math.min(topeY, Math.max(-topeY, p.y)),
    };
  }

  function recortar() {
    if (!imagen.current || !medidas) return;

    // De la vista a los píxeles de la imagen original.
    const ladoX = ANCHO_MARCO / escala;
    const ladoY = ALTO_MARCO / escala;
    const desdeX = (medidas.ancho - ladoX) / 2 - corrido.x / escala;
    const desdeY = (medidas.alto - ladoY) / 2 - corrido.y / escala;

    const ancho = Math.min(Math.round(ladoX), ANCHO_MAXIMO);
    const alto = Math.round(ancho * PROPORCION);

    const lienzo = document.createElement("canvas");
    lienzo.width = ancho;
    lienzo.height = alto;
    const pincel = lienzo.getContext("2d");
    if (!pincel) {
      setError("Su navegador no pudo procesar la imagen.");
      return;
    }

    pincel.drawImage(
      imagen.current,
      Math.max(0, desdeX),
      Math.max(0, desdeY),
      ladoX,
      ladoY,
      0,
      0,
      ancho,
      alto,
    );

    lienzo.toBlob(
      (resultado) => {
        if (resultado) alConfirmar(resultado);
        else setError("No se pudo procesar la imagen.");
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div className="recorte">
      <div
        className="recorte-marco"
        style={{ width: ANCHO_MARCO, height: ALTO_MARCO }}
        onPointerDown={(e) => {
          arrastre.current = { x: e.clientX - corrido.x, y: e.clientY - corrido.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!arrastre.current) return;
          setCorrido(
            dentro({
              x: e.clientX - arrastre.current.x,
              y: e.clientY - arrastre.current.y,
            }),
          );
        }}
        onPointerUp={() => {
          arrastre.current = null;
        }}
        onPointerCancel={() => {
          arrastre.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imagen}
          src={url}
          alt=""
          draggable={false}
          style={{
            width: anchoVista || undefined,
            height: altoVista || undefined,
            transform: `translate(-50%, -50%) translate(${corrido.x}px, ${corrido.y}px)`,
          }}
          onLoad={(e) => {
            const img = e.currentTarget;
            setMedidas({ ancho: img.naturalWidth, alto: img.naturalHeight });
          }}
          onError={() => setError("Ese archivo no es una imagen.")}
        />
      </div>

      <div className="recorte-mandos">
        <label className="campo" htmlFor="recorte-zoom">
          <span>Acercar</span>
          <input
            id="recorte-zoom"
            type="range"
            min={1}
            max={3}
            step={0.02}
            value={zoom}
            onChange={(e) => {
              setZoom(Number(e.target.value));
              // Al alejar, la imagen puede quedar fuera del marco.
              setCorrido((antes) => dentro(antes));
            }}
          />
        </label>

        <p className="meta">
          Arrastre la imagen para encuadrar la cara dentro del marco. Así
          exactamente va a verse en el directorio.
        </p>

        {error ? <p className="error">{error}</p> : null}

        <div className="recorte-botones">
          <button
            type="button"
            className="boton-lleno"
            disabled={trabajando || !medidas}
            onClick={recortar}
          >
            {trabajando ? "Subiendo…" : "Usar esta foto"}
          </button>
          <button
            type="button"
            className="boton-texto"
            disabled={trabajando}
            onClick={alCancelar}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
