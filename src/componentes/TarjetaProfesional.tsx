import Image from "next/image";
import Link from "next/link";

import { Escudo, Estrella, Pin } from "@/componentes/Iconos";
import { cedulaVerificada, type Profesional } from "@/lib/tipos";

function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Mtro\.|Mtra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

/**
 * Un médico en los listados.
 *
 * La tarjeta termina en dos botones y no en uno: «ver perfil» para quien
 * está comparando y «agendar» para quien ya decidió. Obligar a entrar al
 * perfil para agendar le cuesta una pantalla al paciente que ya se decidió.
 * El botón de agendar solo aparece si el plan del médico tiene agenda.
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

  return (
    <article className="tarjeta medico-tarjeta">
      <div className="medico-cabeza">
        {profesional.fotografia ? (
          <Image
            className="retrato"
            src={profesional.fotografia}
            alt={profesional.nombre}
            width={64}
            height={64}
          />
        ) : (
          <div className="retrato" aria-hidden="true">
            {iniciales(profesional.nombre)}
          </div>
        )}

        <div style={{ minWidth: 0 }}>
          <h3>
            <Link href={`/medico/${profesional.slug}`}>{profesional.nombre}</Link>
          </h3>
          {especialidad ? <p className="especialidad-texto">{especialidad}</p> : null}

          {profesional.calificacion ? (
            <div className="estrellas">
              <Estrella size={15} />
              <span className="num">{profesional.calificacion.toFixed(1)}</span>
              <small>({profesional.opiniones} opiniones)</small>
            </div>
          ) : (
            <p className="meta" style={{ marginTop: 6 }}>
              Sin opiniones todavía
            </p>
          )}

          <p className="linea-icono">
            <Pin size={15} />
            {consultorio ? `${consultorio.nombre}, ${ciudad ?? ""}` : (ciudad ?? "")}
          </p>
        </div>
      </div>

      <span className={`sello ${cedulaVerificada(profesional) ? "" : "sello-azul"}`}>
        <Escudo size={14} />
        {profesional.ejemplo
          ? "Perfil de muestra"
          : cedulaVerificada(profesional)
            ? "Cédula verificada"
            : "En verificación"}
      </span>

      <div className="acciones-tarjeta">
        <Link href={`/medico/${profesional.slug}`} className="boton-suave">
          Ver perfil
        </Link>
        {profesional.puede.agenda ? (
          <Link href={`/medico/${profesional.slug}#agenda`} className="boton-lleno">
            Agendar cita
          </Link>
        ) : (
          <Link href={`/medico/${profesional.slug}#contacto`} className="boton-azul">
            Contactar
          </Link>
        )}
      </div>
    </article>
  );
}
