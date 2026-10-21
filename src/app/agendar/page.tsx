import type { Metadata } from "next";
import Link from "next/link";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import {
  ciudades,
  especialidades,
  profesionalesPublicados,
} from "@/lib/catalogo";
import { migasDeNavegacion, fichas } from "@/lib/schema";
import { perfilCompleto } from "@/lib/tipos";

export const revalidate = 1800;

export const metadata: Metadata = {
  title: "Agendar una cita",
  description:
    "Elija a su médico y reserve su consulta en línea. Recibirá la confirmación y el recordatorio por WhatsApp.",
  alternates: { canonical: "/agendar" },
};

/**
 * El primer paso para agendar: elegir médico.
 *
 * El botón de «Agendar cita» de la barra llevaba al listado de Delicias,
 * exactamente igual que el botón de «Médicos» que tiene al lado. Dos
 * botones distintos que hacen lo mismo le enseñan al paciente que uno de
 * los dos sobra, y el que sobra termina siendo el de agendar, que es
 * justamente la acción que el consultorio quiere que ocurra.
 *
 * Aquí solo aparece quien de verdad puede recibir una reserva en línea.
 * Ofrecer a alguien sin agenda y que el paciente descubra al llegar que
 * tiene que hablar por teléfono es peor que no haberlo ofrecido.
 */
export default async function Agendar() {
  const [listaCiudades, listaEspecialidades, todos] = await Promise.all([
    ciudades(),
    especialidades(),
    profesionalesPublicados(),
  ]);

  const nombreDeCiudad = new Map(listaCiudades.map((c) => [c.slug, c.nombre]));
  const nombreDeEspecialidad = new Map(
    listaEspecialidades.map((e) => [e.slug, e.nombre]),
  );

  const conAgenda = todos.filter((p) => perfilCompleto(p) && p.puede.agenda);
  const sinAgenda = todos.filter((p) => perfilCompleto(p) && !p.puede.agenda);

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: fichas(
            migasDeNavegacion([
              { nombre: "Inicio", ruta: "/" },
              { nombre: "Agendar cita", ruta: "/agendar" },
            ]),
          ),
        }}
      />

      <div className="envoltura migas">
        <Link href="/">Inicio</Link> / Agendar cita
      </div>

      <section className="envoltura" style={{ paddingBlock: "18px 10px" }}>
        <p className="eyebrow">Cita en línea</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.4rem)", marginBlock: "8px 12px" }}>
          Elija a su médico y reserve su consulta
        </h1>
        <p className="intro">
          Estos profesionales tienen agenda en línea: usted ve sus horarios
          libres y reserva sin llamar. Recibirá la confirmación y el
          recordatorio por WhatsApp.
        </p>
      </section>

      {conAgenda.length > 0 ? (
        <section className="envoltura seccion">
          <div className="rejilla-medicos">
            {conAgenda.map((p) => (
              <TarjetaProfesional
                key={p.slug}
                profesional={p}
                especialidad={nombreDeEspecialidad.get(p.especialidades[0])}
                ciudad={nombreDeCiudad.get(p.consultorios[0]?.ciudad ?? "")}
              />
            ))}
          </div>
        </section>
      ) : (
        <section className="envoltura seccion">
          <div className="nota-umbral">
            Todavía ningún médico del directorio tiene agenda en línea abierta.
            Mientras tanto puede{" "}
            <Link href="/medicos">ver el directorio completo</Link> y contactar
            al consultorio directamente.
          </div>
        </section>
      )}

      {sinAgenda.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Atienden con cita por teléfono</h2>
          </div>
          <p className="intro" style={{ marginBottom: 14 }}>
            Estos profesionales están en el directorio pero todavía no abren su
            agenda en línea. En su perfil encontrará el teléfono y el horario
            del consultorio.
          </p>
          <div className="chips">
            {sinAgenda.map((p) => (
              <Link key={p.slug} href={`/medico/${p.slug}`} className="chip">
                {p.nombre}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
