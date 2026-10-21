import type { Metadata } from "next";
import Link from "next/link";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import { sitio } from "@/config/sitio";
import {
  ciudades,
  especialidades,
  profesionalesPublicados,
} from "@/lib/catalogo";
import { fichas, listaDeProfesionales, migasDeNavegacion } from "@/lib/schema";
import { perfilCompleto } from "@/lib/tipos";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Todos los médicos de la región",
  description:
    "El directorio completo: médicos con cédula verificada en Delicias, Meoqui, Saucillo, Rosales y Camargo, agrupados por ciudad.",
  alternates: { canonical: "/medicos" },
};

/**
 * El directorio completo, ciudad por ciudad.
 *
 * «Médicos» en la barra llevaba a Delicias, que es donde están casi
 * todos, y desde ahí no había forma de ver el resto sin saber de antemano
 * que las otras ciudades existían. Un paciente de Camargo no tiene por
 * qué adivinarlo.
 *
 * Un médico puede atender en dos ciudades y aparece en ambas: eso es lo
 * correcto para quien busca, aunque signifique repetir la tarjeta.
 */
export default async function TodosLosMedicos() {
  const [listaCiudades, listaEspecialidades, todos] = await Promise.all([
    ciudades(),
    especialidades(),
    profesionalesPublicados(),
  ]);

  const nombreDeEspecialidad = new Map(
    listaEspecialidades.map((e) => [e.slug, e.nombre]),
  );

  const publicables = todos.filter(perfilCompleto);

  const porCiudad = listaCiudades
    .map((c) => ({
      ciudad: c,
      suyos: publicables.filter((p) =>
        p.consultorios.some((k) => k.ciudad === c.slug),
      ),
    }))
    .filter((g) => g.suyos.length > 0);

  const sinCobertura = listaCiudades.filter(
    (c) => !porCiudad.some((g) => g.ciudad.slug === c.slug),
  );

  const datosEstructurados = fichas(
    listaDeProfesionales("Médicos del directorio", publicables, {
      nombre: "Delicias",
      estado: "Chihuahua",
    }),
    migasDeNavegacion([
      { nombre: "Inicio", ruta: "/" },
      { nombre: "Médicos", ruta: "/medicos" },
    ]),
  );

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: datosEstructurados }}
      />

      <div className="envoltura migas">
        <Link href="/">Inicio</Link> / Médicos
      </div>

      <section className="envoltura" style={{ paddingBlock: "18px 10px" }}>
        <p className="eyebrow">Directorio completo</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBlock: "8px 12px" }}>
          Todos los médicos de la región
        </h1>
        <p className="intro">
          {publicables.length === 1
            ? "1 profesional con cédula verificada"
            : `${publicables.length} profesionales con cédula verificada`}{" "}
          en la región centro-sur de Chihuahua, agrupados por la ciudad donde
          atienden. Quien tiene consultorio en dos ciudades aparece en las dos.
        </p>
      </section>

      {porCiudad.length > 0 ? (
        porCiudad.map(({ ciudad, suyos }) => (
          <section className="envoltura seccion" key={ciudad.slug}>
            <div className="seccion-cabeza">
              <h2>
                {ciudad.nombre}, {ciudad.estado}
              </h2>
              <Link href={`/${ciudad.slug}`} className="enlace-acento">
                {suyos.length === 1
                  ? "1 profesional →"
                  : `${suyos.length} profesionales →`}
              </Link>
            </div>

            <div className="rejilla">
              {suyos.map((p) => (
                <TarjetaProfesional
                  key={`${ciudad.slug}-${p.slug}`}
                  profesional={p}
                  especialidad={nombreDeEspecialidad.get(p.especialidades[0])}
                  ciudad={ciudad.nombre}
                />
              ))}
            </div>
          </section>
        ))
      ) : (
        <section className="envoltura seccion">
          <div className="nota-umbral">
            Todavía no hay perfiles publicados. Si usted atiende en la región,
            puede <Link href="/alta">solicitar su alta en el directorio</Link>.
          </div>
        </section>
      )}

      {sinCobertura.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Ciudades abriendo cobertura</h2>
          </div>
          <p className="intro" style={{ marginBottom: 14 }}>
            {sitio.nombre} ya cubre estas ciudades, pero todavía no hay un
            perfil publicado en ellas. Si usted atiende ahí, es buen momento
            para <Link href="/alta">aparecer primero</Link>.
          </p>
          <div className="chips">
            {sinCobertura.map((c) => (
              <Link key={c.slug} href={`/${c.slug}`} className="chip">
                {c.nombre}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
