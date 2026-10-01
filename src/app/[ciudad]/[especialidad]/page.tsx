import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import { urlAbsoluta } from "@/config/sitio";
import {
  ciudad,
  ciudades,
  especialidad,
  especialidades,
  profesionalesEn,
  publicable,
} from "@/lib/catalogo";

type Props = { params: Promise<{ ciudad: string; especialidad: string }> };

export function generateStaticParams() {
  return ciudades().flatMap((c) =>
    especialidades().map((e) => ({ ciudad: c.slug, especialidad: e.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad: ciudadSlug, especialidad: espSlug } = await params;
  const c = ciudad(ciudadSlug);
  const e = especialidad(espSlug);
  if (!c || !e) return {};

  const estado = publicable(c.slug, e.slug);
  const cuantos = estado.cuantos === 1 ? "1 especialista" : `${estado.cuantos} especialistas`;

  return {
    // El título repite la búsqueda tal como la escribe el paciente:
    // «cirujano general en Delicias».
    title: `${e.nombre} en ${c.nombre}, ${c.estado}`,
    description: `${cuantos} en ${e.nombre.toLowerCase()} con cédula verificada en ${c.nombre}. Compare precio de consulta y horarios, y agende en línea con confirmación inmediata.`,
    alternates: { canonical: `/${c.slug}/${e.slug}` },
    robots: estado.publicada ? undefined : { index: false, follow: true },
  };
}

export default async function PaginaEspecialidad({ params }: Props) {
  const { ciudad: ciudadSlug, especialidad: espSlug } = await params;
  const c = ciudad(ciudadSlug);
  const e = especialidad(espSlug);
  if (!c || !e) notFound();

  const profesionales = profesionalesEn(c.slug, e.slug);
  const estado = publicable(c.slug, e.slug);

  // Lo que Google necesita para mostrar la ficha con los especialistas.
  const datosEstructurados = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${e.nombre} en ${c.nombre}`,
    itemListElement: profesionales.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Physician",
        name: p.nombre,
        medicalSpecialty: e.nombre,
        url: urlAbsoluta(`/medico/${p.slug}`),
        address: {
          "@type": "PostalAddress",
          addressLocality: c.nombre,
          addressRegion: c.estado,
          addressCountry: "MX",
        },
      },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datosEstructurados) }}
      />

      <div className="envoltura migas">
        <Link href="/">Inicio</Link> / <Link href={`/${c.slug}`}>{c.nombre}</Link> /{" "}
        {e.nombre}
      </div>

      <section className="envoltura" style={{ paddingBlock: "18px 10px" }}>
        <p className="eyebrow">{c.nombre}, {c.estado}</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBlock: "8px 12px" }}>
          {e.nombre} en {c.nombre}
        </h1>
        <p className="intro">{e.descripcion}</p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Especialistas disponibles</h2>
          <span>
            {estado.cuantos === 1 ? "1 especialista" : `${estado.cuantos} especialistas`}
          </span>
        </div>

        {profesionales.length > 0 ? (
          <div className="rejilla">
            {profesionales.map((p) => (
              <TarjetaProfesional key={p.slug} profesional={p} />
            ))}
          </div>
        ) : (
          <div className="nota-umbral">
            Todavía no hay especialistas de {e.nombre.toLowerCase()} publicados en{" "}
            {c.nombre}. Puede consultar la misma especialidad en las ciudades
            cercanas.
          </div>
        )}

        {!estado.publicada && profesionales.length > 0 ? (
          <div className="nota-umbral" style={{ marginTop: 16 }}>
            Esta página se ofrecerá a los buscadores al reunir {estado.minimo}{" "}
            especialistas en {c.nombre}. Faltan {estado.faltan}.
          </div>
        ) : null}
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Padecimientos que atiende esta especialidad</h2>
        </div>
        <div className="chips">
          {e.padecimientos.map((p) => (
            <span key={p.slug} className="chip">
              {p.nombre}
            </span>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>{e.nombre} en otras ciudades</h2>
        </div>
        <div className="chips">
          {ciudades()
            .filter((otra) => otra.slug !== c.slug)
            .map((otra) => (
              <Link key={otra.slug} href={`/${otra.slug}/${e.slug}`} className="chip">
                {otra.nombre}
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
