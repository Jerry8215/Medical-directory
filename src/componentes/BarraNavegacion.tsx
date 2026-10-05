"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Calendario } from "@/componentes/Iconos";

type Enlace = { href: string; texto: string; soloEscritorio?: boolean };

/**
 * Los enlaces de la barra.
 *
 * Marcar en qué parte del sitio está parado el paciente cuesta una línea y
 * evita la sensación de estar perdido en un directorio con muchas páginas
 * parecidas. La comparación es por prefijo para que un perfil siga marcando
 * «Médicos», y la raíz se compara exacta para que no quede siempre activa.
 */
export function BarraNavegacion({ enlaces }: { enlaces: Enlace[] }) {
  const ruta = usePathname();

  const activo = (href: string) =>
    href === "/" ? ruta === "/" : ruta.startsWith(href);

  return (
    <nav>
      {enlaces.map((e) => (
        <Link
          key={e.href + e.texto}
          href={e.href}
          className={e.soloEscritorio ? "oculta-movil" : undefined}
          aria-current={activo(e.href) ? "page" : undefined}
        >
          {e.texto}
        </Link>
      ))}

      <Link
        href="/delicias"
        className="boton-lleno boton-icono"
        aria-label="Agendar cita"
        title="Agendar cita"
      >
        <Calendario size={19} />
      </Link>
    </nav>
  );
}
