/**
 * Las ilustraciones de la portada.
 *
 * Van dibujadas en SVG y no como imagen: pesan unos pocos kilobytes, se ven
 * nítidas en cualquier pantalla y toman los colores de la hoja de estilos,
 * así que si cambia la paleta cambian con ella. Son decoración, de modo que
 * todas se marcan como ocultas para el lector de pantalla; lo que hay que
 * leer está en el texto de al lado.
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

/** Silueta para el mapa de síntomas. */
export function Cuerpo() {
  return (
    <svg viewBox="0 0 260 380" className="dibujo-cuerpo" aria-hidden="true">
      <defs>
        <linearGradient id="piel" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#bfe0f5" />
          <stop offset="100%" stopColor="#d8f0e7" />
        </linearGradient>
        <radialGradient id="aura">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx="130" cy="200" rx="122" ry="190" fill="url(#aura)" />

      {/* Figura armada con formas simples, no con un contorno anatómico: a
          este tamaño una silueta detallada se vuelve una mancha, y lo que
          tiene que leerse son las zonas señaladas. */}
      <g fill="url(#piel)" stroke="#8fc6e8" strokeWidth="1.6">
        <circle cx="130" cy="44" r="28" />
        <rect x="120" y="64" width="20" height="18" rx="9" />
        <path d="M100 76h60a26 26 0 0 1 26 26v70a26 26 0 0 1-6 17l-8 9h-84l-8-9a26 26 0 0 1-6-17v-70a26 26 0 0 1 26-26z" />
        <rect x="56" y="88" width="23" height="112" rx="11.5" />
        <rect x="181" y="88" width="23" height="112" rx="11.5" />
        <rect x="104" y="196" width="23" height="134" rx="11.5" />
        <rect x="133" y="196" width="23" height="134" rx="11.5" />
      </g>

      {/* Los puntos marcan las zonas que nombran las etiquetas de al lado. */}
      {[
        [130, 44],
        [130, 106],
        [115, 126],
        [130, 160],
        [115, 262],
        [145, 262],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="11" fill="#20be70" opacity="0.16" />
          <circle cx={cx} cy={cy} r="4.5" fill="#20be70" />
        </g>
      ))}
    </svg>
  );
}

/** Mapa abstracto de la región, con un alfiler por ciudad. */
export function MapaRegion({
  ciudades,
}: {
  ciudades: { nombre: string; x: number; y: number; principal?: boolean }[];
}) {
  return (
    <svg viewBox="0 0 520 400" className="dibujo-mapa" aria-hidden="true">
      <defs>
        <linearGradient id="campo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#eaf7f0" />
          <stop offset="100%" stopColor="#dcedf9" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="520" height="400" rx="26" fill="url(#campo)" />

      {/* Parcelas: la región es agrícola y el dibujo lo insinúa sin pretender
          ser un mapa real. */}
      <g fill="#cfe9dc" opacity="0.75">
        <rect x="36" y="48" width="118" height="78" rx="12" />
        <rect x="320" y="36" width="150" height="92" rx="12" />
        <rect x="58" y="246" width="136" height="104" rx="12" />
        <rect x="338" y="232" width="132" height="86" rx="12" />
      </g>

      {/* El río y los caminos. */}
      <path
        d="M-10 158c90 0 120 44 200 44s130-52 230-34 110 26 110 26"
        fill="none"
        stroke="#9fd4ec"
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.75"
      />
      <path
        d="M60 390c40-96 128-128 196-150S430 170 500 96"
        fill="none"
        stroke="#ffffff"
        strokeWidth="8"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M12 236c120 18 206-6 300 22s150 70 196 84"
        fill="none"
        stroke="#ffffff"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="2 14"
        opacity="0.95"
      />

      {ciudades.map((c) => (
        <g key={c.nombre} transform={`translate(${c.x} ${c.y})`}>
          <ellipse cx="0" cy="4" rx="15" ry="5" fill="#123b59" opacity="0.12" />
          <path
            d="M0 2c-7-9-12-14-12-21a12 12 0 0 1 24 0c0 7-5 12-12 21z"
            fill={c.principal ? "#20be70" : "#176a98"}
          />
          <circle cx="0" cy="-19" r="4.6" fill="#fff" />
          <text
            x="0"
            y="-34"
            textAnchor="middle"
            fontSize="15"
            fontWeight="600"
            fill="#123b59"
          >
            {c.nombre}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** El escudo de la franja de verificación. */
export function EscudoVerificado() {
  return (
    <svg viewBox="0 0 240 260" className="dibujo-escudo" aria-hidden="true">
      <defs>
        <linearGradient id="escudo-cara" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5fe0b8" />
          <stop offset="55%" stopColor="#22b98a" />
          <stop offset="100%" stopColor="#0f7f68" />
        </linearGradient>
        <linearGradient id="escudo-brillo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="halo">
          <stop offset="0%" stopColor="#36d6a4" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#36d6a4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="120" cy="130" r="118" fill="url(#halo)" />

      <path
        d="M120 18l86 33v78c0 54-36 94-86 113-50-19-86-59-86-113V51z"
        fill="#0b5f4f"
        opacity="0.55"
        transform="translate(6 8)"
      />
      <path
        d="M120 18l86 33v78c0 54-36 94-86 113-50-19-86-59-86-113V51z"
        fill="url(#escudo-cara)"
      />
      <path
        d="M120 18l86 33v78c0 54-36 94-86 113z"
        fill="#000"
        opacity="0.08"
      />
      <path d="M120 18l86 33v78c0 54-36 94-86 113z" fill="none" />
      <path
        d="M120 18L34 51v78c0 30 11 55 30 74z"
        fill="url(#escudo-brillo)"
      />

      <path
        d="M78 128l30 30 58-62"
        fill="none"
        stroke="#fff"
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Burbujas para las preguntas frecuentes. */
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
