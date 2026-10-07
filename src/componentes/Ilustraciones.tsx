/**
 * Las ilustraciones de la portada.
 *
 * Las tres grandes —la anatomía, el mapa de la región y el escudo— son las
 * piezas entregadas con el diseño. Llegaron en PNG de entre uno y dos y
 * medio megabytes cada una; acá se sirven en WebP recortado, que es la
 * diferencia entre una portada de catorce megas y una de medio.
 *
 * Todas son decoración: el texto que hay que leer está al lado, así que se
 * marcan como ocultas para el lector de pantalla en lugar de inventarles
 * una descripción que repetiría lo de al lado.
 */

/** La flecha de los botones redondos de las tarjetas. */
export function Flecha({ size = 17 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/** La figura del mapa de síntomas. */
export function Cuerpo() {
  return (
    <img
      src="/elementos/anatomia.webp"
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={640}
      height={960}
      className="dibujo-cuerpo"
    />
  );
}

/**
 * El mapa de la región.
 *
 * Los alfileres vienen dibujados en la ilustración, así que acá solo se
 * colocan los nombres encima. Las posiciones van en por ciento y no en
 * píxeles para que sigan cayendo sobre su alfiler cuando el mapa se achica.
 */
export function MapaRegion({
  ciudades,
}: {
  ciudades: { nombre: string; left: number; top: number; principal?: boolean }[];
}) {
  return (
    <div className="mapa">
      <img
        src="/elementos/mapa.webp"
        alt=""
        aria-hidden="true"
        loading="lazy"
        width={1180}
        height={785}
      />
      {ciudades.map((c) => (
        <span
          key={c.nombre}
          className={`mapa-rotulo${c.principal ? " mapa-rotulo-principal" : ""}`}
          style={{ left: `${c.left}%`, top: `${c.top}%` }}
        >
          {c.nombre}
        </span>
      ))}
    </div>
  );
}

/** El escudo de la franja de verificación. */
export function EscudoVerificado() {
  return (
    <img
      src="/elementos/escudo.webp"
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={600}
      height={563}
      className="dibujo-escudo"
    />
  );
}

/** Burbujas para las preguntas frecuentes, que no vinieron con el diseño. */
export function BurbujasDudas() {
  return (
    <svg viewBox="0 0 240 180" className="dibujo-burbujas" aria-hidden="true">
      <defs>
        <linearGradient id="burbuja-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d9f0e6" />
          <stop offset="100%" stopColor="#c6e7f7" />
        </linearGradient>
      </defs>

      <circle cx="42" cy="44" r="26" fill="#e6f4ec" />
      <circle cx="206" cy="140" r="18" fill="#e3eef7" />

      <g fill="url(#burbuja-a)">
        <path d="M44 62h128a22 22 0 0 1 22 22v34a22 22 0 0 1-22 22H86l-26 22v-22h-16a22 22 0 0 1-22-22V84a22 22 0 0 1 22-22z" />
      </g>

      <g fill="#8fc6e8">
        <circle cx="86" cy="101" r="8" />
        <circle cx="114" cy="101" r="8" />
        <circle cx="142" cy="101" r="8" />
      </g>

      <g fill="#20be70" opacity="0.9">
        <circle cx="196" cy="42" r="7" />
        <circle cx="216" cy="66" r="4" />
      </g>
    </svg>
  );
}
