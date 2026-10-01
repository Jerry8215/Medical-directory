import Link from "next/link";

import { cedulaVerificada, type Profesional } from "@/lib/tipos";

function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.|Mtro\.|Mtra\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

function estrellas(calificacion: number): string {
  const llenas = Math.round(calificacion);
  return "★".repeat(llenas) + "☆".repeat(5 - llenas);
}

export function TarjetaProfesional({
  profesional,
  especialidad,
}: {
  profesional: Profesional;
  /** Nombre legible de la especialidad, ya resuelto por la página. */
  especialidad?: string;
}) {
  const consultorio = profesional.consultorios[0];

  return (
    <Link href={`/medico/${profesional.slug}`} className="tarjeta">
      <div className="tarjeta-medico">
        <div className="retrato" aria-hidden="true">
          {iniciales(profesional.nombre)}
        </div>
        <div>
          <h3>{profesional.nombre}</h3>
          {especialidad ? <p className="especialidad-texto">{especialidad}</p> : null}
          {consultorio ? (
            <p className="meta">
              {consultorio.nombre}
              {consultorio.precioValoracion
                ? ` · valoración $${consultorio.precioValoracion}`
                : ""}
            </p>
          ) : null}
          <span className="sello">
            {profesional.ejemplo
              ? "Perfil de muestra"
              : cedulaVerificada(profesional)
                ? "Cédula verificada"
                : "En verificación"}
          </span>
          {profesional.calificacion ? (
            <div className="estrellas">
              <span aria-hidden="true">{estrellas(profesional.calificacion)}</span>
              <small className="num">
                {profesional.calificacion.toFixed(1)} · {profesional.opiniones} opiniones
              </small>
            </div>
          ) : (
            <p className="meta">Sin opiniones todavía</p>
          )}
        </div>
      </div>
    </Link>
  );
}
