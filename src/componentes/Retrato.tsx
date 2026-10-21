import Image from "next/image";

/**
 * El retrato de un profesional, igual en todo el sitio.
 *
 * Tres decisiones viven aquí y no en cada página, que es lo que antes
 * hacía que el mismo médico se viera distinto en el listado, en la
 * portada y en su ficha.
 *
 * La primera es el acercamiento. La fotografía se recorta cuadrada por el
 * centro al subirla, y en un retrato de pie el centro cae en la bata, no
 * en la cara. El doble de acercamiento, desplazado hacia arriba, devuelve
 * el encuadre de cara y hombros que uno espera de un directorio médico.
 *
 * La segunda es el fondo. Detrás del retrato va un degradado y no un
 * color plano, porque es lo que sostiene la pieza cuando el médico
 * todavía no subió fotografía y lo único que hay son sus iniciales.
 *
 * La tercera es la insignia. Va dentada y no redonda a propósito: es la
 * forma que la gente ya asocia con «esto está comprobado», y en un
 * directorio médico la cédula verificada es lo único que de verdad
 * distingue un perfil de otro.
 */

function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Mtro\.|Mtra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

export function InsigniaVerificado({ size = 26 }: { size?: number }) {
  return (
    <span
      className="insignia-verificado"
      style={{ width: size, height: size }}
      title="Cédula verificada"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
        {/* Los lóbulos y el disco comparten relleno: superpuestos dan el
            borde dentado sin tener que calcular un solo contorno. */}
        <g fill="currentColor">
          <circle cx="12" cy="4.45" r="2.45" />
          <circle cx="16.08" cy="5.65" r="2.45" />
          <circle cx="18.87" cy="8.86" r="2.45" />
          <circle cx="19.47" cy="13.07" r="2.45" />
          <circle cx="17.71" cy="16.94" r="2.45" />
          <circle cx="14.13" cy="19.24" r="2.45" />
          <circle cx="9.87" cy="19.24" r="2.45" />
          <circle cx="6.29" cy="16.94" r="2.45" />
          <circle cx="4.53" cy="13.07" r="2.45" />
          <circle cx="5.13" cy="8.86" r="2.45" />
          <circle cx="7.92" cy="5.65" r="2.45" />
          <circle cx="12" cy="12" r="7.6" />
        </g>
        <path
          d="m8.4 12.25 2.5 2.5 5-5.3"
          fill="none"
          stroke="#fff"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="sr-only">Cédula verificada</span>
    </span>
  );
}

export function Retrato({
  nombre,
  fotografia,
  verificado = false,
  tamano = 96,
  tinte,
}: {
  nombre: string;
  fotografia?: string;
  /** Lleva la insignia dentada: solo el perfil con cédula comprobada. */
  verificado?: boolean;
  tamano?: number;
  /** Degradado del fondo; por omisión el del sitio. */
  tinte?: string;
}) {
  return (
    // El marco recorta la fotografía ampliada; la insignia va fuera de él
    // porque tiene que asomar por el borde.
    <span
      className="retrato-caja"
      data-tinte={tinte}
      style={{ width: tamano, height: tamano }}
    >
      <span className="retrato-marco">
        {fotografia ? (
          <Image
            className="retrato-foto"
            src={fotografia}
            alt={nombre}
            fill
            sizes={`${tamano * 2}px`}
          />
        ) : (
          <span
            className="retrato-iniciales"
            style={{ fontSize: Math.round(tamano * 0.34) }}
            aria-hidden="true"
          >
            {iniciales(nombre)}
          </span>
        )}
      </span>

      {verificado ? (
        <InsigniaVerificado size={Math.max(20, Math.round(tamano * 0.27))} />
      ) : null}
    </span>
  );
}
