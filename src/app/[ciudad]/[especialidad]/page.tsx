import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import { urlAbsoluta } from "@/config/sitio";
import { fichas, listaDeProfesionales, migasDeNavegacion } from "@/lib/schema";
import {
  ciudad,
  ciudades,
  especialidad,
  especialidades,
  profesionalesEn,
  publicable,
} from "@/lib/catalogo";

/**
 * El catálogo cambia sin que nadie despliegue: se abre una ciudad, se
 * publica un médico, se corrige un texto. Sin esta línea la página
 * quedaba congelada en el momento de compilar y el cambio no llegaba
 * nunca al visitante ni al buscador.
 */
export const revalidate = 1800;

type Props = { params: Promise<{ ciudad: string; especialidad: string }> };

export async function generateStaticParams() {
  const [listaCiudades, listaEspecialidades] = await Promise.all([
    ciudades(),
    especialidades(),
  ]);
  return listaCiudades.flatMap((c) =>
    listaEspecialidades.map((e) => ({ ciudad: c.slug, especialidad: e.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad: ciudadSlug, especialidad: espSlug } = await params;
  const [c, e] = await Promise.all([ciudad(ciudadSlug), especialidad(espSlug)]);
  if (!c || !e) return {};

  const estado = await publicable(c.slug, e.slug);
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
  const [c, e] = await Promise.all([ciudad(ciudadSlug), especialidad(espSlug)]);
  if (!c || !e) notFound();

  const [profesionales, estado, listaCiudades] = await Promise.all([
    profesionalesEn(c.slug, e.slug),
    publicable(c.slug, e.slug),
    ciudades(),
  ]);

  // La lista de especialistas y el rastro de migas, que es lo que Google
  // dibuja bajo el título en lugar de la dirección cruda.
  const datosEstructurados = fichas(
    listaDeProfesionales(`${e.nombre} en ${c.nombre}`, profesionales, c, e.nombre),
    migasDeNavegacion([
      { nombre: "Inicio", ruta: "/" },
      { nombre: c.nombre, ruta: `/${c.slug}` },
      { nombre: e.nombre, ruta: `/${c.slug}/${e.slug}` },
    ]),
  );

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: datosEstructurados }}
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
          <div className="rejilla-medicos">
            {profesionales.map((p) => (
              <TarjetaProfesional key={p.slug} profesional={p} especialidad={e.nombre} />
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
          {/* Cada padecimiento tiene su propia página; dejarlos como texto
              las convertía en páginas huérfanas, a las que el buscador
              llega por el mapa del sitio pero sin nada que las respalde. */}
          {e.padecimientos.map((p) => (
            <Link
              key={p.slug}
              href={`/${c.slug}/padecimiento/${p.slug}`}
              className="chip"
            >
              {p.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>{e.nombre} en otras ciudades</h2>
        </div>
        <div className="chips">
          {listaCiudades
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
