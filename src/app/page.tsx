import Link from "next/link";

import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import { sitio } from "@/config/sitio";
import {
  ciudades,
  especialidades,
  profesionalesPublicados,
  publicable,
} from "@/lib/catalogo";

export default function Inicio() {
  const listaCiudades = ciudades();
  const listaEspecialidades = especialidades();
  const profesionales = profesionalesPublicados();

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "48px 12px" }}>
        <p className="eyebrow">Chihuahua · región centro-sur</p>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", marginBlock: "10px 12px" }}>
          Encuentre a su médico y agende su cita en minutos.
        </h1>
        <p className="intro">
          Cada especialista del directorio tiene su cédula profesional cotejada
          contra el Registro Nacional de Profesionistas. Consulte horarios y
          precios reales, y reserve directamente, sin llamadas ni
          intermediarios.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Elija su ciudad</h2>
          <span>{listaCiudades.length} ciudades</span>
        </div>
        <div className="rejilla">
          {listaCiudades.map((ciudad) => {
            const estado = publicable(ciudad.slug);
            return (
              <Link key={ciudad.slug} href={`/${ciudad.slug}`} className="tarjeta">
                <h3>{ciudad.nombre}</h3>
                <p className="meta">{ciudad.estado}</p>
                <p className="meta">
                  {estado.cuantos === 1
                    ? "1 profesional"
                    : `${estado.cuantos} profesionales`}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Especialidades</h2>
          <span>Se abren conforme se suman profesionales</span>
        </div>
        <div className="chips">
          {listaEspecialidades.map((e) => (
            <Link key={e.slug} href={`/delicias/${e.slug}`} className="chip">
              {e.nombre}
            </Link>
          ))}
        </div>
      </section>

      {profesionales.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Profesionales publicados</h2>
          </div>
          <div className="rejilla">
            {profesionales.map((p) => (
              <TarjetaProfesional key={p.slug} profesional={p} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="envoltura seccion">
        <div className="nota-umbral">
          Una página de especialidad se publica cuando reúne {sitio.umbralPublicacion}{" "}
          profesionales en esa ciudad. Hasta entonces permanece visible para quien
          tenga el enlace, pero no se ofrece a los buscadores.
        </div>
      </section>
    </main>
  );
}
