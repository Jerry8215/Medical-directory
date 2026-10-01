import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import {
  ciudad,
  ciudades,
  padecimiento,
  padecimientos,
  profesionalesPorPadecimiento,
  umbral,
} from "@/lib/catalogo";

type Props = { params: Promise<{ ciudad: string; padecimiento: string }> };

export async function generateStaticParams() {
  const [listaCiudades, listaPadecimientos] = await Promise.all([
    ciudades(),
    padecimientos(),
  ]);
  return listaCiudades.flatMap((c) =>
    listaPadecimientos.map((p) => ({ ciudad: c.slug, padecimiento: p.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad: ciudadSlug, padecimiento: padSlug } = await params;
  const [c, p] = await Promise.all([ciudad(ciudadSlug), padecimiento(padSlug)]);
  if (!c || !p) return {};

  const cuantos = (await profesionalesPorPadecimiento(c.slug, p.slug)).length;

  return {
    // Así es como lo busca el paciente: por lo que le pasa, no por el
    // nombre de la especialidad.
    title: `${p.nombre} en ${c.nombre}`,
    description: `Especialistas que atienden ${p.nombre.toLowerCase()} en ${c.nombre}, ${c.estado}, con cédula verificada. Consulte precios y horarios, y agende en línea.`,
    alternates: { canonical: `/${c.slug}/padecimiento/${p.slug}` },
    robots:
      cuantos >= (await umbral(c.slug)) ? undefined : { index: false, follow: true },
  };
}

export default async function PaginaPadecimiento({ params }: Props) {
  const { ciudad: ciudadSlug, padecimiento: padSlug } = await params;
  const [c, p] = await Promise.all([ciudad(ciudadSlug), padecimiento(padSlug)]);
  if (!c || !p) notFound();

  const profesionales = await profesionalesPorPadecimiento(c.slug, p.slug);

  return (
    <main>
      <div className="envoltura migas">
        <Link href="/">Inicio</Link> / <Link href={`/${c.slug}`}>{c.nombre}</Link> /{" "}
        <Link href={`/${c.slug}/${p.especialidad.slug}`}>{p.especialidad.nombre}</Link>{" "}
        / {p.nombre}
      </div>

      <section className="envoltura" style={{ paddingBlock: "18px 10px" }}>
        <p className="eyebrow">{p.especialidad.nombre}</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBlock: "8px 12px" }}>
          {p.nombre} en {c.nombre}
        </h1>
        <p className="intro">{p.especialidad.descripcion}</p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Quién lo atiende en {c.nombre}</h2>
          <span>
            {profesionales.length === 1
              ? "1 especialista"
              : `${profesionales.length} especialistas`}
          </span>
        </div>

        {profesionales.length > 0 ? (
          <div className="rejilla">
            {profesionales.map((profesional) => (
              <TarjetaProfesional
                key={profesional.slug}
                profesional={profesional}
                especialidad={p.especialidad.nombre}
              />
            ))}
          </div>
        ) : (
          <div className="nota-umbral">
            Todavía no hay especialistas publicados para {p.nombre.toLowerCase()} en{" "}
            {c.nombre}. Consulte {p.especialidad.nombre.toLowerCase()} en las
            ciudades cercanas.
          </div>
        )}
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Otros padecimientos de {p.especialidad.nombre.toLowerCase()}</h2>
        </div>
        <div className="chips">
          {p.especialidad.padecimientos
            .filter((otro) => otro.slug !== p.slug)
            .map((otro) => (
              <Link
                key={otro.slug}
                href={`/${c.slug}/padecimiento/${otro.slug}`}
                className="chip"
              >
                {otro.nombre}
              </Link>
            ))}
        </div>
      </section>
    </main>
  );
}
