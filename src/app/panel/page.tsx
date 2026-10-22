import type { Metadata } from "next";
import Link from "next/link";

import { sitio } from "@/config/sitio";
import { ListaProfesionales } from "@/componentes/ListaProfesionales";
import { Novedades } from "@/componentes/Novedades";
import { exigirEquipo } from "@/lib/guardia-panel";
import { prisma } from "@/lib/prisma";
import { PestanasPanel } from "@/componentes/PestanasPanel";
import { sinLeer } from "@/lib/novedades";
import { enHoraLocal, proximasCitas, solicitudesPendientes } from "@/lib/panel-datos";
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
/**
 * Qué puede abrir cada quien desde el panel.
 *
 * El médico administra lo suyo: su perfil y su agenda. El equipo del
 * consultorio lleva el directorio completo, la caja y las solicitudes
 * sobre datos personales.
 */


/** Cuántos entraron hoy, en hora de Chihuahua. */
async function visitantesDeHoy(): Promise<number> {
  const local = new Date(Date.now() - 6 * 60 * 60_000);
  const dia = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()),
  );
  const fila = await prisma.visitaDiaria.findUnique({ where: { dia } });
  return fila?.visitas ?? 0;
}

export default async function Panel() {
  await exigirEquipo();
  const [
    listaCiudades,
    listaEspecialidades,
    profesionales,
    listaPadecimientos,
    solicitudes,
    citas,
    visitasHoy,
  ] = await Promise.all([
    ciudades(),
    especialidades(),
    profesionalesPublicados(),
    padecimientos(),
    solicitudesPendientes(),
    proximasCitas(),
    visitantesDeHoy(),
  ]);

  const novedades = await sinLeer();

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
    // Lo primero que un administrador quiere saber al entrar: cuánta
    // gente llegó hoy y cuántos médicos tiene el directorio.
    { valor: visitasHoy, etiqueta: "visitantes hoy" },
    { valor: profesionales.length, etiqueta: "profesionales en el padrón" },
    { valor: publicadas.length, etiqueta: "páginas publicadas" },
    { valor: enEspera.length, etiqueta: "páginas por abrir" },
    { valor: citas.length, etiqueta: "citas próximas" },
    { valor: solicitudes.length, etiqueta: "solicitudes por revisar" },
    { valor: listaPadecimientos.length, etiqueta: "padecimientos en catálogo" },
  ];

  return (
    <main>
      <header className="panel-cabeza">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Panel de {sitio.nombre}</h1>
          <p className="intro">
            Estado del directorio en este momento, leído de la base de datos.
          </p>
        </div>

        <Novedades
          novedades={novedades.map((n) => ({
            id: n.id,
            tipo: n.tipo,
            titulo: n.titulo,
            detalle: n.detalle,
            enlace: n.enlace,
            cuando: enHoraLocal(n.creadaEn),
          }))}
        />
      </header>

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

      <PestanasPanel
        secciones={[
          {
            id: "ciudades",
            titulo: "Ciudades",
            contenido: (
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
            ),
          },
          {
            id: "paginas",
            titulo: "Páginas por especialidad",
            contenido: (
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
            ),
          },
          {
            id: "profesionales",
            titulo: "Profesionales",
            cuenta: profesionales.length,
            contenido: (
              <section className="envoltura seccion">
            <div className="seccion-cabeza">
              <h2>Profesionales</h2>
              <span>Busque por nombre, especialidad o ciudad</span>
            </div>
            <ListaProfesionales
              especialidades={listaEspecialidades.map((e) => ({
                slug: e.slug,
                nombre: e.nombre,
              }))}
              profesionales={profesionales.map((p) => {
                const especialidad = listaEspecialidades.find((e) =>
                  p.especialidades.includes(e.slug),
                );
                return {
                  slug: p.slug,
                  nombre: p.nombre,
                  especialidad: especialidad?.nombre ?? "",
                  especialidadSlug: especialidad?.slug ?? "",
                  ciudades: [...new Set(p.consultorios.map((c) => c.ciudad))]
                    .map((slug) => listaCiudades.find((c) => c.slug === slug)?.nombre)
                    .filter(Boolean)
                    .join(", "),
                  plan: p.plan,
                  publicado: !p.ejemplo,
                  verificado: p.credenciales.some(
                    (c) => c.tipo === "CEDULA_PROFESIONAL" && Boolean(c.numero),
                  ),
                  citas: 0,
                };
              })}
            />
              </section>
            ),
          },
          {
            id: "citas",
            titulo: "Próximas citas",
            cuenta: citas.length,
            contenido: (
              <section className="envoltura seccion">
            <div className="seccion-cabeza">
              <h2>Próximas citas</h2>
              <span>{citas.length} agendadas</span>
            </div>
            {citas.length > 0 ? (
              <div className="tabla">
                <div className="tabla-fila tabla-cabeza">
                  <span>Cuándo</span>
                  <span>Paciente</span>
                  <span>Profesional</span>
                  <span>Aviso</span>
                </div>
                {citas.map((c) => (
                  <div className="tabla-fila" key={c.id}>
                    <span className="num">{enHoraLocal(c.inicio)}</span>
                    <span>
                      {c.paciente.nombre ?? "Sin nombre"}
                      <br />
                      <small className="meta num">{c.paciente.telefono}</small>
                    </span>
                    <span>
                      {c.profesional.nombre}
                      <br />
                      <small className="meta">{c.consultorio.nombre}</small>
                    </span>
                    <span>
                      {c.avisos.every((a) => a.estado === "ENVIADO") ? (
                        <em className="pastilla pastilla-bien">Avisado</em>
                      ) : (
                        <em className="pastilla pastilla-espera">Por enviar</em>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="nota-umbral">
                Todavía no hay citas agendadas desde el sitio.
              </div>
            )}
              </section>
            ),
          },
          {
            id: "solicitudes",
            titulo: "Solicitudes de alta",
            cuenta: solicitudes.length,
            contenido: (
              <section className="envoltura seccion">
            <div className="seccion-cabeza">
              <h2>Solicitudes de alta</h2>
              <Link href="/panel/solicitudes" className="enlace-acento">
                Revisarlas →
              </Link>
            </div>
            <div className="nota-umbral">
              {solicitudes.length === 0
                ? "No hay solicitudes esperando."
                : solicitudes.length === 1
                  ? "Hay 1 solicitud esperando para cotejar la cédula y publicar el perfil."
                  : `Hay ${solicitudes.length} solicitudes esperando para cotejar la cédula y publicar el perfil.`}{" "}
              Llegan por <Link href="/alta">la página de alta</Link>.
            </div>
              </section>
            ),
          },
        ]}
      />

    </main>
  );
}
