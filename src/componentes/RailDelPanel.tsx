"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Calendario,
  Casa,
  Documento,
  Engrane,
  Escudo,
  Estrella,
  Fichas,
  Persona,
  Personas,
  Tarjeta,
} from "@/componentes/Iconos";
import type { EnlaceDelPanel } from "@/lib/navegacion-panel";

const ICONOS: Record<string, (p: { size?: number }) => React.JSX.Element> = {
  casa: Casa,
  calendario: Calendario,
  persona: Persona,
  documento: Documento,
  maletin: Fichas,
  estrella: Estrella,
  tarjeta: Tarjeta,
  escudo: Escudo,
  puerta: Personas,
  engrane: Engrane,
};

/**
 * El rail del panel.
 *
 * Antes la navegación era una línea de texto con puntos entre los
 * enlaces, debajo del título: «Sesión de Admin · administrador · Agenda ·
 * Mi perfil · Catálogos…». Para quien administra todos los días eso no es
 * una navegación, es un párrafo que hay que releer cada vez.
 *
 * Sabe en qué pantalla está porque es lo único que un rail tiene que
 * saber, y es lo que evita la pregunta de «¿dónde estoy?» en un panel con
 * nueve pantallas.
 */
export function RailDelPanel({
  enlaces,
  nombre,
  rol,
  pendientes,
  pie,
}: {
  enlaces: EnlaceDelPanel[];
  nombre: string;
  rol: string;
  /** Solicitudes por revisar, para el punto del rail. */
  pendientes: number;
  /** Lo de la cuenta —contraseña, salir—, dentro de la misma tarjeta. */
  pie?: React.ReactNode;
}) {
  const ruta = usePathname();

  const iniciales = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");

  return (
    <nav className="rail" aria-label="Secciones del panel">
      <div className="rail-identidad">
        <span className="rail-avatar" aria-hidden="true">
          {iniciales}
        </span>
        <span className="rail-quien">
          <b>{nombre}</b>
          <small>{rol}</small>
        </span>
      </div>

      <ul className="rail-lista">
        {enlaces.map((e) => {
          const Icono = ICONOS[e.icono] ?? Casa;
          // «/panel» coincidiría con todas: solo la exacta cuenta.
          const aqui =
            e.href === "/panel" ? ruta === "/panel" : ruta.startsWith(e.href);
          return (
            <li key={e.href}>
              <Link
                href={e.href}
                className="rail-enlace"
                data-aqui={aqui}
                aria-current={aqui ? "page" : undefined}
              >
                <span className="rail-icono" aria-hidden="true">
                  <Icono size={17} />
                </span>
                {e.texto}
                {e.href === "/panel/solicitudes" && pendientes > 0 ? (
                  <span className="rail-punto" aria-label={`${pendientes} por revisar`}>
                    {pendientes}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Dentro de la tarjeta y no debajo: fuera parecían dos piezas
          sueltas flotando bajo el menú, y una de ellas era un botón de
          degradado que competía con la sección abierta. */}
      {pie ? <div className="rail-pie">{pie}</div> : null}
    </nav>
  );
}
