import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Reserva } from "@/componentes/Reserva";
import { urlAbsoluta } from "@/config/sitio";
import { huecos, porDia } from "@/lib/agenda";
import { ocupadosDe } from "@/lib/citas-lectura";
import {
  cedulaVerificada,
  ciudades,
  especialidadesDe,
  profesional,
  profesionalesPublicados,
  type Ciudad,
  type Especialidad,
} from "@/lib/catalogo";

type Props = { params: Promise<{ slug: string }> };

/**
 * La página se vuelve a generar cada hora. Sin esto, los días disponibles
 * quedarían congelados en la fecha de la compilación y el paciente vería
 * horarios de la semana pasada.
 */
export const revalidate = 3600;

export async function generateStaticParams() {
  return (await profesionalesPublicados()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await profesional(slug);
  if (!p) return {};

  const [listaEspecialidades, listaCiudades] = await Promise.all([
    especialidadesDe(p),
    ciudades(),
  ]);
  const especialidad = listaEspecialidades[0];
  const nombresDeCiudad = p.consultorios
    .map((c) => listaCiudades.find((x: Ciudad) => x.slug === c.ciudad)?.nombre)
    .filter(Boolean)
    .join(" y ");

  return {
    title: `${p.nombre} · ${especialidad?.nombre} en ${nombresDeCiudad}`,
    description: `${p.nombre}, ${especialidad?.nombre.toLowerCase()} con cédula verificada en ${nombresDeCiudad}. Consulte horarios, precio de consulta y agende su cita en línea.`,
    alternates: { canonical: `/medico/${p.slug}` },
  };
}

export default async function PaginaProfesional({ params }: Props) {
  const { slug } = await params;
  const p = await profesional(slug);
  if (!p) notFound();

  const [listaEspecialidades, listaCiudades] = await Promise.all([
    especialidadesDe(p),
    ciudades(),
  ]);
  const principal = listaEspecialidades[0];
  const primera = p.consultorios[0];
  const ciudadPrincipal = primera
    ? listaCiudades.find((c: Ciudad) => c.slug === primera.ciudad)
    : undefined;
  const nombreDeCiudad = (slugCiudad: string) =>
    listaCiudades.find((c: Ciudad) => c.slug === slugCiudad)?.nombre ?? "";

  // La disponibilidad se calcula en el servidor, con las franjas del
  // consultorio. Cuando la base esté montada se le restan además las citas
  // ya tomadas, que es el único cambio que falta en esta pantalla.
  const hoy = new Date().toISOString().slice(0, 10);
  const ocupados = primera ? await ocupadosDe(primera.id) : [];
  const dias = primera?.franjas?.length
    ? porDia(
        huecos({
          franjas: primera.franjas,
          duracionMin: primera.duracionCitaMin,
          ocupados,
          desde: hoy,
          dias: 21,
          maximo: 24,
        }),
      )
    : [];

  const datosEstructurados = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: p.nombre,
    description: p.semblanza,
    medicalSpecialty: listaEspecialidades.map((e: Especialidad) => e.nombre),
    url: urlAbsoluta(`/medico/${p.slug}`),
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.calificacion,
      reviewCount: p.opiniones,
    },
    address: p.consultorios.map((c) => ({
      "@type": "PostalAddress",
      name: c.nombre,
      streetAddress: c.direccion,
      addressLocality: nombreDeCiudad(c.ciudad),
      addressRegion: listaCiudades.find((x: Ciudad) => x.slug === c.ciudad)?.estado,
      addressCountry: "MX",
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />

      <div className="envoltura migas">
        <Link href="/">Inicio</Link>
        {ciudadPrincipal ? (
          <>
            {" / "}
            <Link href={`/${ciudadPrincipal.slug}`}>{ciudadPrincipal.nombre}</Link>
          </>
        ) : null}
        {ciudadPrincipal && principal ? (
          <>
            {" / "}
            <Link href={`/${ciudadPrincipal.slug}/${principal.slug}`}>
              {principal.nombre}
            </Link>
          </>
        ) : null}
      </div>

      <div className="envoltura perfil">
        <div>
          <div className="ficha">
            <div className="perfil-cabeza">
              <div className="retrato retrato-grande" aria-hidden="true">
                {p.nombre
                  .replace(/^(Dr\.|Dra\.)\s*/i, "")
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((x) => x[0])
                  .join("")}
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <h1>{p.nombre}</h1>
                <p className="especialidad-texto">
                  {listaEspecialidades.map((e: Especialidad) => e.nombre).join(" · ")}
                </p>
                <span className="sello">
                  {p.ejemplo
                    ? "Perfil de muestra"
                    : cedulaVerificada(p)
                      ? "Cédula verificada"
                      : "En verificación"}
                </span>
              </div>
            </div>

            <div className="cedulas">
              {p.credenciales.map((c) => (
                <div key={`${c.tipo}-${c.numero ?? ""}`}>
                  {c.tipo === "CEDULA_PROFESIONAL"
                    ? "Cédula profesional"
                    : c.tipo === "CEDULA_ESPECIALIDAD"
                      ? "Cédula de especialidad"
                      : "Consejo de especialidad"}
                  <b className="num">{c.numero ?? "En revisión"}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="ficha">
            <h2>Sobre el especialista</h2>
            <p style={{ color: "var(--suave)" }}>{p.semblanza}</p>
          </div>

          <div className="ficha">
            <h2>Padecimientos que atiende</h2>
            <ul className="lista-limpia">
              {listaEspecialidades.flatMap((e: Especialidad) =>
                e.padecimientos
                  .filter((pad: { slug: string }) => p.padecimientos.includes(pad.slug))
                  .map((pad: { slug: string; nombre: string }) => <li key={pad.slug}>{pad.nombre}</li>),
              )}
            </ul>
          </div>

          <div className="ficha">
            <h2>Consultorios y precios</h2>
            {p.consultorios.map((c) => (
              <div className="sede" key={`${c.ciudad}-${c.nombre}`}>
                <b>{c.nombre}</b>
                <p>
                  {c.direccion} · {nombreDeCiudad(c.ciudad)}
                </p>
                <p>{c.horario}</p>
                {c.precioValoracion ? (
                  <p className="num" style={{ color: "var(--tinta)", fontWeight: 600 }}>
                    Valoración ${c.precioValoracion}
                  </p>
                ) : null}
              </div>
            ))}
          </div>

          {p.convenios ? (
            <div className="ficha">
              <h2>Aseguradoras y convenios</h2>
              <p style={{ color: "var(--suave)" }}>{p.convenios}</p>
            </div>
          ) : null}
        </div>

        <aside>
          <div className="ficha">
            <h2>Agende su cita</h2>
            <p style={{ color: "var(--suave)", fontSize: "0.9rem" }}>
              {primera ? `${primera.nombre} · ${primera.horario}` : ""}
            </p>
            <div style={{ marginTop: 12 }}>
              <Reserva
                dias={dias}
                consultorioId={primera?.id ?? ""}
                consultorio={primera?.nombre ?? ""}
                profesional={p.nombre}
              />
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
