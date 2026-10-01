/**
 * Tres direcciones de identidad para que el consultorio elija.
 *
 * El nombre es descriptivo, así que la marca se sostiene en el símbolo.
 * Las tres parten de algo que el directorio sí hace y los demás no: el
 * sello, el lugar y la cita. Ninguna es un caduceo ni una cruz genérica.
 */

export type Direccion = {
  id: string;
  nombre: string;
  idea: string;
  razon: string;
  paleta: { primario: string; tenue: string; acento: string; tinta: string };
  tipografia: "serif" | "sans";
  Marca: (props: { size?: number; color?: string }) => React.JSX.Element;
};

function Sello({ size = 36, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 3.5 32.5 8v11.2c0 7.6-5.1 14.4-12.5 17.3C12.6 33.6 7.5 26.8 7.5 19.2V8L20 3.5Z"
        stroke={color}
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <path
        d="m14 20.2 4.3 4.3L26.5 16"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Lugar({ size = 36, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <path
        d="M20 4.5c-6.1 0-11 4.7-11 10.6 0 7.4 8.8 18 10.3 19.8.4.4 1 .4 1.4 0C22.2 33.1 31 22.5 31 15.1 31 9.2 26.1 4.5 20 4.5Z"
        stroke={color}
        strokeWidth="2.4"
      />
      <path
        d="M11.5 16.4h4.1l2.1-4.4 3.1 8 2.1-3.6h5.6"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cita({ size = 36, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <rect x="5.5" y="8.5" width="29" height="26" rx="6" stroke={color} strokeWidth="2.4" />
      <path d="M5.5 16.5h29" stroke={color} strokeWidth="2.4" />
      <path d="M13 4.5v7M27 4.5v7" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="m14.5 25.5 3.6 3.6 7.4-7.6"
        stroke={color}
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export const DIRECCIONES: Direccion[] = [
  {
    id: "sello",
    nombre: "El sello",
    idea: "Un escudo con una palomita dentro.",
    razon:
      "La promesa del directorio es que cada cédula está comprobada. El escudo dice verificación sin escribir la palabra, y funciona igual de bien reducido al tamaño de un favicon.",
    paleta: {
      primario: "#0D6B5A",
      tenue: "#E2F0EB",
      acento: "#A8551C",
      tinta: "#13201C",
    },
    tipografia: "serif",
    Marca: Sello,
  },
  {
    id: "lugar",
    nombre: "El lugar",
    idea: "Un pin de mapa con el trazo de un latido dentro.",
    razon:
      "Reúne las dos búsquedas del paciente: dónde y con quién. Es la dirección más clara para una marca que compite en «cerca de mí» y que crecerá a otras ciudades de la región.",
    paleta: {
      primario: "#1F5D7A",
      tenue: "#E3EEF3",
      acento: "#C2663A",
      tinta: "#14222A",
    },
    tipografia: "sans",
    Marca: Lugar,
  },
  {
    id: "cita",
    nombre: "La cita",
    idea: "Un calendario con la palomita de la confirmación.",
    razon:
      "Pone por delante lo que el paciente se lleva: la cita confirmada. Es la más cálida de las tres y la que mejor acompaña el botón de agendar.",
    paleta: {
      primario: "#2F6F4F",
      tenue: "#E7F1EA",
      acento: "#B4772A",
      tinta: "#17231D",
    },
    tipografia: "sans",
    Marca: Cita,
  },
];
