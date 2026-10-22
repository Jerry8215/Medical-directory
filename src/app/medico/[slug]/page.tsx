import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnotarseEnEspera } from "@/componentes/AnotarseEnEspera";
import { ContadorDeVisitas } from "@/componentes/ContadorDeVisitas";
import {
  Calendario,
  Escudo,
  Estrella,
  Maletin,
  Pin,
  Reloj,
  Whatsapp,
} from "@/componentes/Iconos";
import { Reserva } from "@/componentes/Reserva";
import Image from "next/image";

import { InsigniaVerificado } from "@/componentes/Retrato";
import { sitio, urlAbsoluta } from "@/config/sitio";
import { huecos, porDia } from "@/lib/agenda";
import { hoyLocal, horaLocal } from "@/lib/reloj";
import { fichas, migasDeNavegacion } from "@/lib/schema";
import {
  cedulaVerificada,
  ciudades,
  especialidadesDe,
  profesional,
  profesionalesPublicados,
  type Ciudad,
  type Especialidad,
} from "@/lib/catalogo";
import { cerradosDe } from "@/lib/cerrados-lectura";
import { ocupadosDe } from "@/lib/citas-lectura";
import { opinionesDe, telefonoDe } from "@/lib/opiniones-lectura";

type Props = { params: Promise<{ slug: string }> };

/**
 * La página se vuelve a generar cada hora. Sin esto, los días disponibles
 * quedarían congelados en la fecha de la compilación y el paciente vería
 * horarios de la semana pasada.
 */
export const revalidate = 3600;

/** Los días como los nombra schema.org, en el mismo orden que DIAS. */
const DIAS_SCHEMA = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export async function generateStaticParams() {
  return (await profesionalesPublicados()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await profesional(slug);
  if (!p) return {};

  const [listaEspecialidades, listaCiudades] = await Promise.all([
    especialidadesDe(p),
    ciudades(),
  ]);
  const especialidad = listaEspecialidades[0];
  const nombresDeCiudad = p.consultorios
    .map((c) => listaCiudades.find((x: Ciudad) => x.slug === c.ciudad)?.nombre)
    .filter(Boolean)
    .join(" y ");

  return {
    title: `${p.nombre} · ${especialidad?.nombre} en ${nombresDeCiudad}`,
    description: `${p.nombre}, ${especialidad?.nombre.toLowerCase()} con cédula verificada en ${nombresDeCiudad}. Consulte horarios, precio de consulta y agende su cita en línea.`,
    alternates: { canonical: `/medico/${p.slug}` },
    // Un perfil de muestra no entra al buscador. Está para que el sitio no
    // se vea vacío mientras se llena, no para que alguien lo encuentre
    // buscando un cardiólogo y aterrice en un médico que no existe.
    robots: p.ejemplo ? { index: false, follow: false } : undefined,
  };
}


function inicialesDe(nombre: string): string {
  const palabras = nombre
    .replace(/^(Dr\.|Dra\.|Lic\.)\s*/i, "")
    .split(/\s+/)
    .filter(Boolean);
  return (palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "");
}

export default async function PaginaProfesional({ params }: Props) {
  const { slug } = await params;
  const p = await profesional(slug);
  if (!p) notFound();

  const [listaEspecialidades, listaCiudades, telefono, opiniones] = await Promise.all([
    especialidadesDe(p),
    ciudades(),
    telefonoDe(slug),
    opinionesDe(slug),
  ]);

  const principal = listaEspecialidades[0];
  const primera = p.consultorios[0];
  const ciudadPrincipal = primera
    ? listaCiudades.find((c: Ciudad) => c.slug === primera.ciudad)
    : undefined;

  const nombreDeCiudad = (slugCiudad: string) =>
    listaCiudades.find((c: Ciudad) => c.slug === slugCiudad)?.nombre ?? "";

  // En hora de Chihuahua, no en UTC. A las 23:00 locales el reloj UTC ya
  // va en el día siguiente, de modo que la agenda saltaba un día entero y
  // el paciente no veía los huecos de esa misma noche.
  const hoy = hoyLocal();
  const horaActual = horaLocal();

  // Vacaciones y ausencias: valen para todos sus consultorios, así que se
  // leen una vez y no uno por uno.
  const cerrados = p.puede.agenda ? await cerradosDe(p.slug) : [];

  // Cada consultorio tiene su propia agenda: un médico que atiende en dos
  // ciudades no comparte horarios entre ellas, y ofrecer solo la del
  // primero deja sin cita al paciente de la otra.
  const reservables = p.puede.agenda
    ? await Promise.all(
        p.consultorios.map(async (c) => ({
          id: c.id,
          nombre: c.nombre,
          ciudad: nombreDeCiudad(c.ciudad),
          horario: c.horario,
          dias: c.franjas.length
            ? porDia(
                huecos({
                  franjas: c.franjas,
                  duracionMin: c.duracionCitaMin,
                  ocupados: await ocupadosDe(c.id),
                  bloqueados: cerrados,
                  desde: hoy,
                  // Sin esto el agendador ofrecía las horas de hoy que ya
                  // pasaron: el filtro trabajaba por día y no por hora.
                  horaActual,
                  // Dos meses, y el tope alto a propósito. Con 24 huecos
                  // y dos citas al día el calendario se cortaba a los
                  // once días, que es lo que lo hacía parecer una agenda
                  // de una semana: el paciente que quería pedir para
                  // dentro de un mes no tenía dónde.
                  dias: 60,
                  maximo: 400,
                }),
              )
            : [],
        })),
      )
    : [];

  // Cuántas opiniones hay de cada calificación, para las barras del resumen.
  const reparto = [5, 4, 3, 2, 1].map((n) => ({
    estrellas: n,
    cuantas: opiniones.filter((o) => o.calificacion === n).length,
  }));

  // El horario semanal de cada consultorio, como lo lee un paciente.
  const horarios = p.consultorios.map((c) => ({
    id: c.id,
    semana: DIAS.map((nombre, dia) => {
      const tramos = c.franjas.filter((f) => f.dia === dia);
      return {
        nombre,
        texto:
          tramos.length > 0
            ? tramos.map((t) => `${t.desde} - ${t.hasta}`).join(" y ")
            : "Cerrado",
      };
    }),
  }));

  // El horario de atención, en el formato que Google entiende. Sale de las
  // mismas franjas que el paciente ve en pantalla, no de un texto aparte
  // que alguien tendría que recordar actualizar.
  const atencion = p.consultorios.flatMap((c) =>
    c.franjas.map((f) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: DIAS_SCHEMA.at(f.dia),
      opens: f.desde,
      closes: f.hasta,
    })),
  );

  const perfilDelMedico = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: p.nombre,
    description: p.semblanza,
    medicalSpecialty: listaEspecialidades.map((e: Especialidad) => e.nombre),
    url: urlAbsoluta(`/medico/${p.slug}`),
    telephone: telefono ?? undefined,
    ...(p.calificacion
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.calificacion,
            reviewCount: p.opiniones,
          },
        }
      : {}),
    address: p.consultorios.map((c) => ({
      "@type": "PostalAddress",
      name: c.nombre,
      streetAddress: c.direccion,
      addressLocality: nombreDeCiudad(c.ciudad),
      addressRegion: listaCiudades.find((x: Ciudad) => x.slug === c.ciudad)?.estado,
      addressCountry: "MX",
    })),
    ...(atencion.length > 0 ? { openingHoursSpecification: atencion } : {}),
  };

  const datosEstructurados = fichas(
    perfilDelMedico,
    migasDeNavegacion([
      { nombre: "Inicio", ruta: "/" },
      ...(primera
        ? [{ nombre: nombreDeCiudad(primera.ciudad), ruta: `/${primera.ciudad}` }]
        : []),
      ...(listaEspecialidades[0] && primera
        ? [
            {
              nombre: listaEspecialidades[0].nombre,
              ruta: `/${primera.ciudad}/${listaEspecialidades[0].slug}`,
            },
          ]
        : []),
      { nombre: p.nombre, ruta: `/medico/${p.slug}` },
    ]),
  );

  // Si ningún consultorio tiene horarios libres, se ofrece la lista.
  const sinHuecos =
    reservables.length > 0 && reservables.every((c) => c.dias.length === 0);

  return (
    <main>
      {/* Cuenta la visita desde el navegador: esta página se sirve
          cacheada y el servidor no se entera de cada una. */}
      <ContadorDeVisitas slug={p.slug} />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: datosEstructurados }}
      />

      <div className="envoltura migas">
        <Link href="/">Inicio</Link>
        {ciudadPrincipal ? (
          <>
            {" / "}
            <Link href={`/${ciudadPrincipal.slug}`}>{ciudadPrincipal.nombre}</Link>
          </>
        ) : null}
        {ciudadPrincipal && principal ? (
          <>
            {" / "}
            <Link href={`/${ciudadPrincipal.slug}/${principal.slug}`}>
              {principal.nombre}
            </Link>
          </>
        ) : null}
        {" / "}
        {p.nombre}
      </div>

      <div className="envoltura perfil">
        <div>
          <div className="ficha">
            <div className="perfil-cabeza">
              {/* El retrato manda también acá: es la misma pieza que el
                  paciente vio en el listado, en grande. */}
              <div className="perfil-retrato">
                {p.fotografia ? (
                  <Image
                    src={p.fotografia}
                    alt={p.nombre}
                    fill
                    sizes="(max-width: 860px) 92vw, 380px"
                    className="retratada-imagen"
                    priority
                  />
                ) : (
                  <span className="retratada-iniciales" aria-hidden="true">
                    {inicialesDe(p.nombre)}
                  </span>
                )}
                {cedulaVerificada(p) ? (
                  <span className="perfil-insignia">
                    <InsigniaVerificado size={34} />
                  </span>
                ) : null}
              </div>

              <div className="perfil-datos">
                <h1>{p.nombre}</h1>
                <p className="especialidad-texto">
                  {listaEspecialidades.map((e: Especialidad) => e.nombre).join(" · ")}
                </p>

                {p.calificacion ? (
                  <div className="estrellas">
                    <Estrella size={16} />
                    <span className="num">{p.calificacion.toFixed(1)}</span>
                    <small>({p.opiniones} opiniones)</small>
                  </div>
                ) : (
                  <p className="meta">Sin opiniones todavía</p>
                )}

                {primera ? (
                  <p className="linea-icono">
                    <Pin size={15} />
                    {primera.nombre}, {nombreDeCiudad(primera.ciudad)}, Chihuahua
                  </p>
                ) : null}

                <span className="sello" style={{ alignSelf: "flex-start", marginTop: 6 }}>
                  <Escudo size={14} />
                  {p.ejemplo
                    ? "Perfil de muestra"
                    : cedulaVerificada(p)
                      ? "Cédula verificada"
                      : "En verificación"}
                </span>

                <div className="acciones-perfil">
                  {p.puede.agenda ? (
                    <a className="boton-lleno" href="#agenda">
                      <Calendario size={17} />
                      Agendar cita
                    </a>
                  ) : null}

                  {telefono && p.puede.whatsapp ? (
                    <a
                      className="boton-whatsapp"
                      data-metrica="whatsapp"
                      href={`https://wa.me/52${telefono}?text=${encodeURIComponent(
                        `Hola, lo contacto desde ${sitio.nombre} para agendar una consulta.`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Whatsapp size={17} />
                      WhatsApp
                    </a>
                  ) : null}

                  {telefono && !p.puede.whatsapp ? (
                    <a className="boton-suave num" data-metrica="telefono" href={`tel:+52${telefono}`}>
                      {telefono}
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            <nav className="pestanas">
              <a href="#acerca">Acerca de</a>
              <a href="#opiniones">Opiniones</a>
              <a href="#ubicacion">Ubicación</a>
            </nav>
          </div>

          <div className="ficha" id="acerca">
            <h2>
              <Maletin size={18} />
              Acerca {p.nombre.startsWith("Dra") ? "de la doctora" : "del doctor"}
            </h2>
            <p style={{ color: "var(--suave)" }}>
              {p.semblanza || "Este profesional todavía no publicó su semblanza."}
            </p>

            <div className="cedulas">
              {p.credenciales.map((c) => (
                <div key={`${c.tipo}-${c.numero ?? ""}`}>
                  {c.tipo === "CEDULA_PROFESIONAL"
                    ? "Cédula profesional"
                    : c.tipo === "CEDULA_ESPECIALIDAD"
                      ? "Cédula de especialidad"
                      : "Consejo de especialidad"}
                  <b className="num">{c.numero ?? "En revisión"}</b>
                </div>
              ))}
            </div>
          </div>

          <div className="ficha">
            <h2>
              <Escudo size={18} />
              Áreas de atención
            </h2>
            <div className="chips">
              {listaEspecialidades.flatMap((e: Especialidad) =>
                e.padecimientos
                  .filter((pad: { slug: string }) => p.padecimientos.includes(pad.slug))
                  .map((pad: { slug: string; nombre: string }) => (
                    <span className="chip" key={pad.slug}>
                      {pad.nombre}
                    </span>
                  )),
              )}
            </div>
          </div>

          <div className="ficha" id="opiniones">
            <h2>
              <Estrella size={18} />
              Opiniones de pacientes
            </h2>

            {opiniones.length > 0 ? (
              <>
                <div className="resumen-opiniones">
                  <div className="promedio">
                    <b className="num">{(p.calificacion ?? 0).toFixed(1)}</b>
                    <div className="estrellas">
                      {"★".repeat(Math.round(p.calificacion ?? 0))}
                      {"☆".repeat(5 - Math.round(p.calificacion ?? 0))}
                    </div>
                    <span className="meta">{opiniones.length} opiniones</span>
                  </div>

                  <div className="barras">
                    {reparto.map((r) => (
                      <div className="barra-fila" key={r.estrellas}>
                        <span className="num">{r.estrellas} ★</span>
                        <span className="barra-fondo">
                          <span
                            className="barra-relleno"
                            style={{
                              width: `${
                                opiniones.length ? (r.cuantas / opiniones.length) * 100 : 0
                              }%`,
                            }}
                          />
                        </span>
                        <span className="num">{r.cuantas}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {opiniones.map((o) => (
                    <div className="resena" key={o.id}>
                      <p style={{ color: "var(--estrella)", fontWeight: 600 }}>
                        {"★".repeat(o.calificacion)}
                        {"☆".repeat(5 - o.calificacion)}
                      </p>
                      <p>«{o.texto}»</p>
                      <p className="quien">
                        {o.autor} · {o.cuando}
                        {o.verificada ? (
                          <span className="sello-opinion">
                            <Escudo size={12} />
                            Paciente verificado
                          </span>
                        ) : null}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="meta">
                Todavía no hay opiniones publicadas de este profesional. Si ya se
                atendió con él, la suya le sirve a quien venga después.
              </p>
            )}

            {/* El perfil prometía opiniones de pacientes y a la vez
                dejaba opinar a cualquiera, sin haber tenido cita. Ahora la
                opinión se deja desde el enlace que recibe el paciente,
                que es lo que demuestra que la consulta existió. */}
            <p className="meta" style={{ marginTop: 16 }}>
              Las opiniones se dejan desde el enlace que recibe el paciente
              con su cita, y se revisan antes de publicarse. Si se atendió
              con {p.nombre} y no encuentra su enlace, escríbanos y se lo
              reenviamos.
            </p>
          </div>

          <div className="ficha" id="ubicacion">
            <h2>
              <Pin size={18} />
              Consultorios y horarios
            </h2>

            {p.consultorios.map((c) => {
              const horario = horarios.find((h) => h.id === c.id);
              const mapa = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${c.nombre} ${c.direccion} ${nombreDeCiudad(c.ciudad)} Chihuahua`,
              )}`;
              return (
                <div className="sede" key={c.id} style={{ marginBottom: 12 }}>
                  <b>{c.nombre}</b>
                  <p>
                    {c.direccion} · {nombreDeCiudad(c.ciudad)}, Chihuahua
                  </p>
                  {c.precioValoracion ? (
                    <p className="num" style={{ color: "var(--navy)", fontWeight: 600 }}>
                      Consulta ${c.precioValoracion}
                    </p>
                  ) : null}

                  {/* Siete renglones diciendo «Cerrado» no es un horario:
                      es un consultorio que parece clausurado. Mientras el
                      médico no capture sus días, se dice lo que de verdad
                      pasa y se le ofrece al paciente la vía que sí sirve. */}
                  {horario?.semana.some((d) => d.texto !== "Cerrado") ? (
                    <div className="horario-tabla" style={{ marginTop: 12 }}>
                      {horario.semana.map((d) => (
                        <div className="horario-fila" key={d.nombre}>
                          <span>{d.nombre}</span>
                          <span className={d.texto === "Cerrado" ? "cerrado" : "num"}>
                            {d.texto}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="meta" style={{ marginTop: 12 }}>
                      Horario no publicado todavía. Llame al consultorio para
                      conocer sus días y horas de atención.
                    </p>
                  )}

                  <p style={{ marginTop: 12 }}>
                    <a className="boton-suave" href={mapa} target="_blank" rel="noreferrer">
                      <Pin size={16} />
                      Cómo llegar
                    </a>
                  </p>
                </div>
              );
            })}
          </div>

          {p.convenios ? (
            <div className="ficha">
              <h2>
                <Escudo size={18} />
                Aseguradoras y convenios
              </h2>
              <p style={{ color: "var(--suave)" }}>{p.convenios}</p>
            </div>
          ) : null}
        </div>

        <aside>
          {p.puede.agenda ? (
            <div className="ficha reserva" id="agenda">
              <h2>
                <Calendario size={18} />
                Agenda tu consulta
              </h2>
              <p className="meta">
                {p.consultorios.length > 1
                  ? `${p.consultorios.length} consultorios disponibles`
                  : primera
                    ? `${primera.nombre} · ${primera.horario}`
                    : ""}
              </p>
              <div style={{ marginTop: 12 }}>
                <Reserva consultorios={reservables} profesional={p.nombre} />
              </div>

              {/* Solo cuando no queda nada que ofrecer: con horarios
                  libres, apuntarse competiría con agendar, que es lo que
                  el paciente de verdad quiere hacer. */}
              {sinHuecos ? (
                <div style={{ marginTop: 14 }}>
                  <AnotarseEnEspera slug={p.slug} profesional={p.nombre} />
                </div>
              ) : null}
            </div>
          ) : (
            <div className="ficha reserva" id="contacto">
              <h2>
                <Reloj size={18} />
                Contacto
              </h2>
              <p className="meta">
                {primera ? `${primera.nombre} · ${primera.horario}` : ""}
              </p>

              {telefono ? (
                <>
                  <p
                    className="num"
                    style={{
                      fontSize: "1.3rem",
                      fontWeight: 700,
                      marginTop: 10,
                      color: "var(--navy)",
                    }}
                  >
                    {telefono}
                  </p>
                  {p.puede.whatsapp ? (
                    <a
                      className="boton-lleno"
                      data-metrica="whatsapp"
                      style={{ width: "100%", marginTop: 12 }}
                      href={`https://wa.me/52${telefono}?text=${encodeURIComponent(
                        `Hola, lo contacto desde ${sitio.nombre} para agendar una consulta.`,
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Whatsapp size={17} />
                      Escribir por WhatsApp
                    </a>
                  ) : (
                    <p className="meta" style={{ marginTop: 8 }}>
                      Llame al consultorio para agendar su consulta.
                    </p>
                  )}
                </>
              ) : (
                <p className="meta" style={{ marginTop: 10 }}>
                  Este profesional todavía no publicó un teléfono de contacto.
                </p>
              )}
            </div>
          )}
          <div className="ficha" style={{ marginTop: 16 }}>
            <h2>
              <Escudo size={18} />
              Verificación
            </h2>
            <ul className="lista-limpia">
              <li>
                <Escudo size={15} />
                Cédula cotejada contra el Registro Nacional de Profesionistas.
              </li>
              <li>
                <Escudo size={15} />
                Datos del consultorio confirmados con el profesional.
              </li>
              <li>
                <Escudo size={15} />
                Las opiniones se revisan antes de publicarse.
              </li>
            </ul>
            <p className="meta" style={{ marginTop: 12 }}>
              ¿Encontró algo incorrecto en este perfil?{" "}
              <Link href="/alta" className="enlace-acento">
                Avísenos
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
