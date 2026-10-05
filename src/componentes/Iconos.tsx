/**
 * Los íconos del sitio, dibujados a mano.
 *
 * Son pocos y livianos: traer una librería entera para doce trazos le
 * costaría al paciente más tiempo de carga que todo el contenido de la
 * página. Todos heredan el color del texto y miden lo que se les pida.
 */

type Props = { size?: number };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function Lupa({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4 4" />
    </svg>
  );
}

export function Pin({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}

export function Calendario({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function Reloj({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  );
}

export function Documento({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M14 3.5H7.5A2.5 2.5 0 0 0 5 6v12a2.5 2.5 0 0 0 2.5 2.5h9A2.5 2.5 0 0 0 19 18V8.5L14 3.5Z" />
      <path d="M14 3.5V9h5M8.5 13h7M8.5 16.5h4.5" />
    </svg>
  );
}

export function Estrella({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.7.9 5.2-4.6-2.5-4.6 2.5.9-5.2L4.5 10l5.2-.8L12 4.5Z" />
    </svg>
  );
}

export function Escudo({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.2 19 6v6c0 4.3-2.9 8.1-7 9.3-4.1-1.2-7-5-7-9.3V6l7-2.8Z" />
      <path d="m9 12 2.2 2.2L15.4 10" />
    </svg>
  );
}

export function Whatsapp({ size = 18 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.5 14.4c-.3-.2-1.7-.9-2-1-.3-.1-.5-.1-.7.2-.2.3-.7 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.5-.5c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.9-2.1c-.2-.5-.4-.5-.6-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.4.7.3 1.3.5 1.7.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z" />
      <path
        d="M12 3.2c-4.9 0-8.8 3.9-8.8 8.8 0 1.6.4 3.1 1.2 4.4L3.2 20.8l4.6-1.2c1.3.7 2.7 1 4.2 1 4.9 0 8.8-3.9 8.8-8.8S16.9 3.2 12 3.2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function Palomita({ size = 14 }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2 6.2 4.6 8.8 10 3.4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Maletin({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17" />
    </svg>
  );
}

/** Ícono genérico de especialidad: un estetoscopio. */
export function Estetoscopio({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M6 3.5v5a4 4 0 0 0 8 0v-5" />
      <path d="M10 15.5a4.5 4.5 0 0 0 9 0v-2" />
      <circle cx="19" cy="11.5" r="2" />
      <path d="M6 3.5H4.5M14 3.5h1.5" />
    </svg>
  );
}

export function Corazon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 20s-7-4.4-7-9.3A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7 2.7c0 4.9-7 9.3-7 9.3Z" />
      <path d="M4.5 12.5h3l1.3-2.4 2 4.3 1.4-2.6h3.3" />
    </svg>
  );
}

export function Hueso({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M8.5 4.5a2.3 2.3 0 0 0-2 3.4l-2.6 2.6a2.3 2.3 0 1 0 2.2 2.2l2.6-2.6a2.3 2.3 0 0 0 3.4-2 2.3 2.3 0 0 0-3.6-1.6Z" />
      <path d="M15.5 19.5a2.3 2.3 0 0 0 2-3.4l2.6-2.6a2.3 2.3 0 1 0-2.2-2.2l-2.6 2.6a2.3 2.3 0 0 0-3.4 2 2.3 2.3 0 0 0 3.6 1.6Z" />
    </svg>
  );
}

export function Bebe({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M10.3 8.3h.01M13.7 8.3h.01M10.6 10.8c.8.7 2 .7 2.8 0" />
      <path d="M5.5 20.5c.8-3 3.4-5 6.5-5s5.7 2 6.5 5" />
    </svg>
  );
}

export function Mujer({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <circle cx="12" cy="8.5" r="4.5" />
      <path d="M12 13v7.5M9 17.5h6" />
    </svg>
  );
}

export function Pulmon({ size = 18 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M12 3.5v8" />
      <path d="M12 8.5c-1.6-2-4-1.5-4.8.4-.7 1.6-1.2 3.6-1.2 5.6 0 2 1 3.5 2.6 3.5 1.6 0 2.4-1.2 2.4-3.1V8.5Z" />
      <path d="M12 8.5c1.6-2 4-1.5 4.8.4.7 1.6 1.2 3.6 1.2 5.6 0 2-1 3.5-2.6 3.5-1.6 0-2.4-1.2-2.4-3.1V8.5Z" />
    </svg>
  );
}

/**
 * El asistente, en la burbuja flotante.
 *
 * Provisional: se reemplaza por el archivo que entregue el consultorio en
 * cuanto esté en el proyecto. El trazo coincide con el resto de los íconos
 * para que no desentone mientras tanto.
 */
export function Asistente({ size = 22 }: Props) {
  return (
    <svg {...base(size)}>
      <path d="M20 12.5c0 3.6-3.6 6.5-8 6.5-1 0-2-.1-2.9-.4L4 20.5l1.5-3.6C4.5 15.7 4 14.2 4 12.5 4 8.9 7.6 6 12 6s8 2.9 8 6.5Z" />
      <path d="M9 11.5h.01M12 11.5h.01M15 11.5h.01" />
    </svg>
  );
}
