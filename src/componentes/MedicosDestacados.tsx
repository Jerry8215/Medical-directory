"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

import {
  Calendario,
  Escudo,
  Estrella,
  Flecha,
  Globo,
  Persona,
  Pin,
} from "@/componentes/Iconos";
import { cedulaVerificada, type Profesional } from "@/lib/tipos";

/**
 * Los médicos destacados de la portada.
 *
 * Es un escaparate, no un listado: son tres tarjetas grandes y la del
 * perfil verificado es la única que va en color pleno. El resto del sitio
 * sigue usando la tarjeta compacta, que es la que sirve cuando hay veinte
 * resultados y el paciente está comparando.
 *
 * Los filtros son del navegador y no del servidor. Son tres perfiles que
 * ya vinieron con la página, de modo que recargarla para esconder uno
 * sería cobrarle al paciente una vuelta entera al servidor por un trabajo
 * que el navegador hace sin parpadear.
 */

const TODOS = "todos";

/** Los de muestra se reparten los tintes para que no se repitan en fila. */
const TINTES = ["lila", "durazno", "cielo"] as const;

function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Mtro\.|Mtra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

export function MedicosDestacados({
  profesionales,
  especialidades,
  ciudades,
}: {
  profesionales: Profesional[];
  /** slug de especialidad -> nombre legible */
  especialidades: Record<string, string>;
  /** slug de ciudad -> nombre legible */
  ciudades: Record<string, string>;
}) {
  const [filtro, setFiltro] = useState<string>(TODOS);

  // Solo las especialidades que alguno de estos tres atiende: un filtro
  // que no deja nada en pantalla no es un filtro, es un callejón.
  const pestanas = useMemo(() => {
    const vistas = new Map<string, string>();
    for (const p of profesionales) {
      const slug = p.especialidades[0];
      if (slug && especialidades[slug]) vistas.set(slug, especialidades[slug]);
    }
    return [...vistas].map(([slug, nombre]) => ({ slug, nombre }));
  }, [profesionales, especialidades]);

  const visibles = useMemo(
    () =>
      filtro === TODOS
        ? profesionales
        : profesionales.filter((p) => p.especialidades[0] === filtro),
    [profesionales, filtro],
  );

  // El tinte se reparte entre los de muestra, no entre todas las tarjetas:
  // si contara también la verificada, el primer tinte nunca saldría.
  const conTinte = useMemo(() => {
    let muestra = 0;
    return visibles.map((p) => {
      const verificado = cedulaVerificada(p) && !p.ejemplo;
      return {
        p,
        tinte: verificado ? "verde" : TINTES[muestra++ % TINTES.length],
      };
    });
  }, [visibles]);

  const hayMuestras = visibles.some((p) => p.ejemplo);

  return (
    <>
      {pestanas.length > 1 ? (
        <div className="destacados-filtros">
          <div className="destacados-pestanas" role="tablist" aria-label="Filtrar por especialidad">
            <button
              type="button"
              role="tab"
              aria-selected={filtro === TODOS}
              className="destacados-pestana"
              data-activa={filtro === TODOS}
              onClick={() => setFiltro(TODOS)}
            >
              Todos
            </button>
            {pestanas.map((e) => (
              <button
                key={e.slug}
                type="button"
                role="tab"
                aria-selected={filtro === e.slug}
                className="destacados-pestana"
                data-activa={filtro === e.slug}
                onClick={() => setFiltro(e.slug)}
              >
                {e.nombre}
              </button>
            ))}
          </div>

          <p className="destacados-cuenta" aria-live="polite">
            {visibles.length === 1
              ? "1 perfil en esta selección"
              : `${visibles.length} perfiles en esta selección`}
          </p>
        </div>
      ) : null}

      <div className="destacados-rejilla">
        {conTinte.map(({ p, tinte }) => (
          <TarjetaDestacada
            key={p.slug}
            profesional={p}
            especialidad={especialidades[p.especialidades[0]]}
            ciudad={ciudades[p.consultorios[0]?.ciudad ?? ""]}
            tinte={tinte}
          />
        ))}
      </div>

      {hayMuestras ? (
        <p className="destacados-pie">
          Los perfiles de muestra se conservan como ejemplos del directorio. La
          insignia azul se reserva para el perfil con cédula verificada.
        </p>
      ) : null}
    </>
  );
}

function TarjetaDestacada({
  profesional,
  especialidad,
  ciudad,
  tinte,
}: {
  profesional: Profesional;
  especialidad?: string;
  ciudad?: string;
  tinte: string;
}) {
  const consultorio = profesional.consultorios[0];
  const verificado = cedulaVerificada(profesional) && !profesional.ejemplo;

  return (
    <article className="destacado" data-tinte={tinte}>
      <div className="destacado-tapa">
        <span className="destacado-sello">
          {profesional.ejemplo
            ? "Perfil de muestra"
            : verificado
              ? "Cédula verificada"
              : "En verificación"}
        </span>
        <span className="destacado-glifo" aria-hidden="true">
          <Persona size={22} />
        </span>
      </div>

      <div className="destacado-cuerpo">
        <div className="destacado-foto">
          {profesional.fotografia ? (
            <Image
              className="destacado-retrato"
              src={profesional.fotografia}
              alt={profesional.nombre}
              width={96}
              height={96}
            />
          ) : (
            <div className="destacado-retrato" aria-hidden="true">
              {iniciales(profesional.nombre)}
            </div>
          )}
          {verificado ? (
            <span className="destacado-insignia" title="Cédula verificada">
              <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="m9.6 16.3-3.5-3.5 1.4-1.4 2.1 2.1 6-6 1.4 1.4-7.4 7.4Z"
                />
              </svg>
              <span className="sr-only">Cédula verificada</span>
            </span>
          ) : null}
        </div>

        {especialidad ? (
          <p className="destacado-especialidad">{especialidad}</p>
        ) : null}

        <h3 className="destacado-nombre">
          <Link href={`/medico/${profesional.slug}`}>{profesional.nombre}</Link>
        </h3>

        <p className="destacado-lugar">
          <Pin size={15} />
          <span>
            {consultorio?.nombre ?? ciudad ?? ""}
            {consultorio && ciudad ? <small>{ciudad}, Chihuahua</small> : null}
          </span>
        </p>

        <div className="destacado-raya" />

        <p className="destacado-nota">
          {verificado ? <Escudo size={15} /> : <Persona size={15} />}
          {verificado
            ? "Identidad profesional verificada"
            : "Ejemplo de presentación del perfil"}
        </p>

        {profesional.calificacion ? (
          <p className="destacado-opiniones destacado-estrellas">
            <Estrella size={14} />
            <b>{profesional.calificacion.toFixed(1)}</b>
            <span>
              {profesional.opiniones === 1
                ? "1 opinión"
                : `${profesional.opiniones} opiniones`}
            </span>
          </p>
        ) : (
          <p className="destacado-opiniones">Sin opiniones todavía</p>
        )}

        <Link
          href={`/medico/${profesional.slug}`}
          className="destacado-boton"
          data-realce={verificado}
        >
          Conocer al especialista
          <Flecha size={17} />
        </Link>

        {profesional.puede.agenda ? (
          <Link href={`/medico/${profesional.slug}#agenda`} className="destacado-atajo">
            <Calendario size={15} />
            Consultar agenda
          </Link>
        ) : (
          <Link href={`/medico/${profesional.slug}#contacto`} className="destacado-atajo">
            <Globo size={15} />
            Ver contacto
          </Link>
        )}
      </div>
    </article>
  );
}
