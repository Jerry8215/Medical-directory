import Image from "next/image";
import Link from "next/link";

import { Calendario, Escudo, Globo, Persona, Pin } from "@/componentes/Iconos";
import { Flecha } from "@/componentes/Ilustraciones";
import { cedulaVerificada, type Profesional } from "@/lib/tipos";

function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Mtro\.|Mtra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

/**
 * Un médico, en todo el sitio.
 *
 * Es una sola tarjeta y no una por página a propósito: el mismo médico se
 * veía de tres maneras distintas según por dónde se llegara a él, y eso
 * le quita al directorio lo único que lo hace parecer serio, que es verse
 * igual en todas partes.
 *
 * La fotografía manda. Un directorio médico se recorre con los ojos antes
 * que con la cabeza, y el retrato grande es lo que convierte una lista de
 * nombres en gente a la que uno le confiaría una cirugía. Por eso ocupa
 * casi toda la tarjeta y el resto se acomoda alrededor.
 *
 * Termina en dos botones y no en uno: «conocer» para quien está
 * comparando y «agendar» para quien ya decidió. Obligar a entrar al
 * perfil para agendar le cuesta una pantalla al que ya se decidió.
 */
export function TarjetaProfesional({
  profesional,
  especialidad,
  ciudad,
}: {
  profesional: Profesional;
  especialidad?: string;
  ciudad?: string;
}) {
  const consultorio = profesional.consultorios[0];
  const verificado = cedulaVerificada(profesional) && !profesional.ejemplo;

  return (
    <article className="retratada">
      <div className="retratada-cabeza">
        {especialidad ? (
          <p className="retratada-especialidad">{especialidad}</p>
        ) : null}
        <h3 className="retratada-nombre">
          <Link href={`/medico/${profesional.slug}`}>{profesional.nombre}</Link>
        </h3>
      </div>

      <div className="retratada-foto">
        {profesional.fotografia ? (
          <Image
            src={profesional.fotografia}
            alt={profesional.nombre}
            fill
            sizes="(max-width: 640px) 92vw, 360px"
            className="retratada-imagen"
          />
        ) : (
          <span className="retratada-iniciales" aria-hidden="true">
            {iniciales(profesional.nombre)}
          </span>
        )}

        {/* El velo blanco de arriba es lo que deja leer el nombre sobre
            cualquier fotografía, clara u oscura, sin tener que pedirle al
            médico una con el fondo correcto. */}
        <span className="retratada-velo" aria-hidden="true" />

        {!verificado ? (
          <span className="retratada-sello">
            {profesional.ejemplo ? "Perfil de muestra" : "En verificación"}
          </span>
        ) : null}
      </div>

      <div className="retratada-pie">
        <div className="retratada-datos">
          <p className="retratada-lugar">
            <Pin size={16} />
            <span>
              <b>{consultorio?.nombre ?? ciudad ?? "Sin consultorio"}</b>
              {ciudad ? <small>{ciudad}, Chihuahua</small> : null}
            </span>
          </p>

          <p className="retratada-sello-texto" data-si={verificado}>
            {verificado ? <Escudo size={16} /> : <Persona size={16} />}
            <span>
              {verificado
                ? "Identidad profesional verificada"
                : profesional.ejemplo
                  ? "Ejemplo de presentación del perfil"
                  : "Cédula en revisión"}
            </span>
          </p>
        </div>

        <div className="retratada-acciones">
          <Link href={`/medico/${profesional.slug}`} className="retratada-boton principal">
            Conocer al especialista
            <Flecha size={17} />
          </Link>

          {profesional.puede.agenda ? (
            <Link href={`/medico/${profesional.slug}#agenda`} className="retratada-boton">
              <Calendario size={17} />
              Consultar agenda
            </Link>
          ) : (
            <Link href={`/medico/${profesional.slug}#contacto`} className="retratada-boton">
              <Globo size={17} />
              Ver contacto
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
