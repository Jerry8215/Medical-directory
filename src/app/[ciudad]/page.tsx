import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Buscador } from "@/componentes/Buscador";
import { sitio } from "@/config/sitio";
import {
  ciudad,
  ciudades,
  especialidades,
  padecimientos,
  profesionalesEn,
  publicable,
} from "@/lib/catalogo";

type Props = { params: Promise<{ ciudad: string }> };

export function generateStaticParams() {
  return ciudades().map((c) => ({ ciudad: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { ciudad: slug } = await params;
  const c = ciudad(slug);
  if (!c) return {};

  const estado = publicable(slug);
  return {
    title: `Médicos en ${c.nombre}, ${c.estado}`,
    description: `Especialistas con cédula verificada en ${c.nombre}. Consulte horarios, precios de consulta y agende su cita en línea.`,
    alternates: { canonical: `/${c.slug}` },
    // Mientras la ciudad no reúne el mínimo acordado, la página responde
    // pero no se ofrece al buscador: contenido delgado perjudica al resto
    // del sitio.
    robots: estado.publicada ? undefined : { index: false, follow: true },
  };
}

export default async function PaginaCiudad({ params }: Props) {
  const { ciudad: slug } = await params;
  const c = ciudad(slug);
  if (!c) notFound();

  const profesionales = profesionalesEn(c.slug);
  const estado = publicable(c.slug);

  // El buscador del navegador necesita los nombres legibles para poder
  // encontrar por padecimiento, no por su identificador.
  const etiquetas = Object.fromEntries(
    padecimientos().map((p) => [p.slug, p.nombre]),
  );

  return (
    <main>
      <div className="envoltura migas">
        <Link href="/">Inicio</Link> / {c.nombre}
      </div>

      <section className="envoltura" style={{ paddingBlock: "18px 10px" }}>
        <p className="eyebrow">{c.estado}</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBlock: "8px 12px" }}>
          Médicos en {c.nombre}
        </h1>
        <p className="intro">{c.descripcion}</p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Especialidades en {c.nombre}</h2>
        </div>
        <div className="chips">
          {especialidades().map((e) => (
            <Link key={e.slug} href={`/${c.slug}/${e.slug}`} className="chip">
              {e.nombre}
            </Link>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Profesionales</h2>
          <span>
            {estado.cuantos === 1 ? "1 profesional" : `${estado.cuantos} profesionales`}
          </span>
        </div>

        {profesionales.length > 0 ? (
          <Buscador
            profesionales={profesionales}
            etiquetas={etiquetas}
            ciudad={c.nombre}
          />
        ) : (
          <div className="nota-umbral">
            Todavía no hay profesionales publicados en {c.nombre}. Si usted
            atiende en esta ciudad, puede solicitar su alta en el directorio.
          </div>
        )}

        {!estado.publicada && profesionales.length > 0 ? (
          <div className="nota-umbral" style={{ marginTop: 16 }}>
            Esta página se publicará en buscadores al reunir {estado.minimo}{" "}
            profesionales en {c.nombre}. Faltan {estado.faltan}.
          </div>
        ) : null}
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Busque por padecimiento</h2>
        </div>
        <div className="chips">
          {padecimientos().map((p) => (
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
        <p className="intro">
          {sitio.nombre} reúne a los profesionales de la región centro-sur de
          Chihuahua. Si no encuentra a su especialista en {c.nombre}, revise las
          ciudades cercanas: muchos atienden en más de una.
        </p>
      </section>
    </main>
  );
}
