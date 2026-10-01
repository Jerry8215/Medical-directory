import type { Metadata } from "next";
import Link from "next/link";

import { sitio } from "@/config/sitio";
import {
  ciudades,
  especialidades,
  padecimientos,
  profesionalesEn,
  profesionalesPublicados,
  publicable,
} from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

/**
 * Panel de administración.
 *
 * Esta primera versión muestra el estado real del directorio: qué páginas
 * se publican, cuáles esperan profesionales y cuántos faltan en cada una.
 * Las acciones de alta y edición se habilitan al conectar la base de datos;
 * lo que se ve acá ya sale de los mismos datos que alimentan el sitio, no
 * de un maquetado.
 */
export default function Panel() {
  const listaCiudades = ciudades();
  const listaEspecialidades = especialidades();
  const profesionales = profesionalesPublicados();

  const combinaciones = listaCiudades.flatMap((c) =>
    listaEspecialidades.map((e) => ({
      ciudad: c,
      especialidad: e,
      estado: publicable(c.slug, e.slug),
    })),
  );
  const publicadas = combinaciones.filter((x) => x.estado.publicada);
  const enEspera = combinaciones
    .filter((x) => !x.estado.publicada && x.estado.cuantos > 0)
    .sort((a, b) => a.estado.faltan - b.estado.faltan);

  const cifras = [
    { valor: profesionales.length, etiqueta: "profesionales en el padrón" },
    { valor: publicadas.length, etiqueta: "páginas publicadas" },
    { valor: enEspera.length, etiqueta: "páginas por abrir" },
    { valor: padecimientos().length, etiqueta: "padecimientos en catálogo" },
  ];

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.3rem)", marginBlock: "10px 10px" }}>
          Panel de {sitio.nombre}
        </h1>
        <p className="intro">
          Estado del directorio en este momento. Las altas, ediciones y
          aprobaciones se habilitan al conectar la base de datos, en los
          próximos días.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="cifras">
          {cifras.map((c) => (
            <div key={c.etiqueta} className="cifra">
              <b className="num">{c.valor}</b>
              <span>{c.etiqueta}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Ciudades</h2>
          <span>El mínimo para publicar se configura por ciudad</span>
        </div>
        <div className="tabla">
          <div className="tabla-fila tabla-cabeza">
            <span>Ciudad</span>
            <span>Profesionales</span>
            <span>Mínimo</span>
            <span>Estado</span>
          </div>
          {listaCiudades.map((c) => {
            const estado = publicable(c.slug);
            return (
              <div className="tabla-fila" key={c.slug}>
                <span>
                  <Link href={`/${c.slug}`}>{c.nombre}</Link>
                </span>
                <span className="num">{estado.cuantos}</span>
                <span className="num">{estado.minimo}</span>
                <span>
                  {estado.publicada ? (
                    <em className="pastilla pastilla-bien">Publicada</em>
                  ) : (
                    <em className="pastilla pastilla-espera">
                      Faltan {estado.faltan}
                    </em>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Páginas por especialidad</h2>
          <span>
            {publicadas.length} publicadas de {combinaciones.length}
          </span>
        </div>
        <div className="tabla">
          <div className="tabla-fila tabla-cabeza">
            <span>Página</span>
            <span>Profesionales</span>
            <span>Mínimo</span>
            <span>Estado</span>
          </div>
          {[...publicadas, ...enEspera].slice(0, 12).map((x) => (
            <div className="tabla-fila" key={`${x.ciudad.slug}-${x.especialidad.slug}`}>
              <span>
                <Link href={`/${x.ciudad.slug}/${x.especialidad.slug}`}>
                  {x.especialidad.nombre} en {x.ciudad.nombre}
                </Link>
              </span>
              <span className="num">{x.estado.cuantos}</span>
              <span className="num">{x.estado.minimo}</span>
              <span>
                {x.estado.publicada ? (
                  <em className="pastilla pastilla-bien">Publicada</em>
                ) : (
                  <em className="pastilla pastilla-espera">Faltan {x.estado.faltan}</em>
                )}
              </span>
            </div>
          ))}
        </div>
        <p className="meta" style={{ marginTop: 10 }}>
          Las páginas sin publicar responden con normalidad para quien tiene el
          enlace, pero piden a los buscadores no indexarlas y no entran al mapa
          del sitio.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Profesionales</h2>
          <span>{profesionales.length} en el padrón</span>
        </div>
        <div className="tabla">
          <div className="tabla-fila tabla-cabeza">
            <span>Nombre</span>
            <span>Especialidad</span>
            <span>Ciudad</span>
            <span>Verificación</span>
          </div>
          {profesionales.map((p) => {
            const ciudadesDelPerfil = [
              ...new Set(p.consultorios.map((c) => c.ciudad)),
            ]
              .map((slug) => listaCiudades.find((c) => c.slug === slug)?.nombre)
              .filter(Boolean)
              .join(", ");
            const especialidad = listaEspecialidades.find((e) =>
              p.especialidades.includes(e.slug),
            );
            return (
              <div className="tabla-fila" key={p.slug}>
                <span>
                  <Link href={`/medico/${p.slug}`}>{p.nombre}</Link>
                </span>
                <span>{especialidad?.nombre}</span>
                <span>{ciudadesDelPerfil}</span>
                <span>
                  {p.ejemplo ? (
                    <em className="pastilla pastilla-espera">Muestra</em>
                  ) : (
                    <em className="pastilla pastilla-bien">Cédula verificada</em>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Solicitudes de alta</h2>
        </div>
        <div className="nota-umbral">
          Las solicitudes que llegan por{" "}
          <Link href="/alta">la página de alta</Link> aparecerán acá para
          verificar la cédula y publicar el perfil, en cuanto se conecte la base
          de datos.
        </div>
      </section>
    </main>
  );
}
