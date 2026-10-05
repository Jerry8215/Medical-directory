"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Calendario, Casa, Estetoscopio, Maletin } from "@/componentes/Iconos";

type Enlace = { href: string; texto: string; icono: "casa" | "medicos" | "medico" };

const ICONOS = {
  casa: Casa,
  medicos: Estetoscopio,
  medico: Maletin,
} as const;

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
      {enlaces.map((e) => {
        const Icono = ICONOS[e.icono];
        return (
          <Link
            key={e.href + e.texto}
            href={e.href}
            className="boton-icono-barra"
            aria-current={activo(e.href) ? "page" : undefined}
            aria-label={e.texto}
            title={e.texto}
          >
            <Icono size={24} />
          </Link>
        );
      })}

      {/* Con el texto, porque es la acción principal del sitio. Como ícono
          suelto no decía nada y además repetía el enlace de «Médicos». */}
      <Link href="/delicias" className="boton-lleno boton-cita">
        <Calendario size={20} grosor={2} />
        Agendar cita
      </Link>
    </nav>
  );
}
