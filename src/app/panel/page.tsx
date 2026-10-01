import type { Metadata } from "next";
import Link from "next/link";

import { sitio } from "@/config/sitio";
import {
  ciudades,
  especialidades,
  padecimientos,
  profesionalesPublicados,
  publicable,
} from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

/** El panel refleja la base, así que no conviene servirlo de una caché vieja. */
export const dynamic = "force-dynamic";

/**
 * Panel de administración.
 *
 * Muestra el estado real del directorio: qué páginas se publican, cuáles
 * esperan profesionales y cuántos faltan en cada una. Las acciones de alta
 * y edición llegan sobre esta misma base.
 */
export default async function Panel() {
  const [listaCiudades, listaEspecialidades, profesionales, listaPadecimientos] =
    await Promise.all([
      ciudades(),
      especialidades(),
      profesionalesPublicados(),
      padecimientos(),
    ]);

  const estadoPorCiudad = new Map(
    await Promise.all(
      listaCiudades.map(async (c) => [c.slug, await publicable(c.slug)] as const),
    ),
  );

  const combinaciones = await Promise.all(
    listaCiudades.flatMap((c) =>
      listaEspecialidades.map(async (e) => ({
        ciudad: c,
        especialidad: e,
        estado: await publicable(c.slug, e.slug),
      })),
    ),
  );

  const publicadas = combinaciones.filter((x) => x.estado.publicada);
  const enEspera = combinaciones
    .filter((x) => !x.estado.publicada && x.estado.cuantos > 0)
    .sort((a, b) => a.estado.faltan - b.estado.faltan);

  const cifras = [
    { valor: profesionales.length, etiqueta: "profesionales en el padrón" },
    { valor: publicadas.length, etiqueta: "páginas publicadas" },
    { valor: enEspera.length, etiqueta: "páginas por abrir" },
    { valor: listaPadecimientos.length, etiqueta: "padecimientos en catálogo" },
  ];

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.3rem)", marginBlock: "10px 10px" }}>
          Panel de {sitio.nombre}
        </h1>
        <p className="intro">
          Estado del directorio en este momento, leído de la base de datos. Las
          altas, ediciones y aprobaciones se incorporan sobre esta misma
          pantalla.
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
            const estado = estadoPorCiudad.get(c.slug);
            if (!estado) return null;
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
                    <em className="pastilla pastilla-espera">Faltan {estado.faltan}</em>
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
            const ciudadesDelPerfil = [...new Set(p.consultorios.map((c) => c.ciudad))]
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
          Las solicitudes que llegan por <Link href="/alta">la página de alta</Link>{" "}
          aparecerán acá para verificar la cédula y publicar el perfil.
        </div>
      </section>
    </main>
  );
}
