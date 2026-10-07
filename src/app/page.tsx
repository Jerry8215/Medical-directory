import Link from "next/link";

import { BuscadorPortada } from "@/componentes/BuscadorPortada";
import {
  Bebe,
  Calendario,
  Corazon,
  Documento,
  Escudo,
  Estetoscopio,
  Estrella,
  Hueso,
  Lupa,
  Mujer,
  Pin,
  Pulmon,
  Reloj,
} from "@/componentes/Iconos";
import { PortadaCarrusel } from "@/componentes/PortadaCarrusel";
import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import {
  ciudades,
  especialidades,
  padecimientos,
  profesionalesEn,
  profesionalesPublicados,
} from "@/lib/catalogo";
import { sitio, urlAbsoluta } from "@/config/sitio";

import type { Metadata } from "next";

export const metadata: Metadata = {
  // Sin esto, la portada es la única página sin dirección canónica, y es
  // justo la que más versiones distintas tiene: con www, sin www, con el
  // dominio .mx y con la dirección temporal.
  alternates: { canonical: "/" },
};

export const revalidate = 1800;

/**
 * Las fotografías de la portada.
 *
 * Doce escenas de consulta, todas con la misma composición: el médico a la
 * derecha y el consultorio despejado a la izquierda, que es donde cae el
 * título y el buscador.
 */
const FOTOGRAFIAS = Array.from(
  { length: 12 },
  (_, i) => `/portada/${String(i + 1).padStart(2, "0")}.webp`,
);

/**
 * Un ícono por especialidad.
 *
 * El paciente reconoce la silueta antes que el texto, y una cuadrícula con
 * el mismo dibujo repetido obliga a leerlas todas. Las que no estén en la
 * tabla caen en el estetoscopio.
 */
const ICONOS: Record<string, (p: { size?: number }) => React.JSX.Element> = {
  "cirugia-general": Estetoscopio,
  ginecologia: Mujer,
  pediatria: Bebe,
  traumatologia: Hueso,
  "medicina-interna": Corazon,
  cardiologia: Corazon,
  neumologia: Pulmon,
};

/**
 * Las preguntas que de verdad llegan al consultorio.
 *
 * Van también como datos estructurados: son las búsquedas con las que un
 * paciente llega desde Google escribiendo la pregunta entera, y respondidas
 * acá evitan la llamada para preguntar lo mismo.
 */
const PREGUNTAS = [
  {
    q: "¿Cuánto cuesta usar el directorio?",
    r: "Nada. Buscar médico, comparar perfiles y agendar su cita no le cuesta al paciente. Lo que usted paga es la consulta, directamente en el consultorio, y el precio aparece en el perfil de cada médico cuando él lo publica.",
  },
  {
    q: "¿Cómo sé que el médico tiene cédula de verdad?",
    r: "Antes de publicar un perfil comprobamos la cédula profesional en el Registro Nacional de Profesionistas. En las especialidades que lo exigen comprobamos además la certificación del consejo correspondiente. El perfil que ya pasó esa revisión lleva la palomita de verificado.",
  },
  {
    q: "¿Puedo agendar en línea con cualquier médico?",
    r: "Con los que tienen agenda en línea activa, sí: usted elige el horario y la cita queda confirmada en el momento. En los demás perfiles aparece el teléfono del consultorio para que llame directamente.",
  },
  {
    q: "¿Puedo cambiar o cancelar mi cita?",
    r: "Sí. Al agendar recibe un enlace propio de su cita; desde ahí la cambia o la cancela sin llamar al consultorio. El horario que libera vuelve a quedar disponible para otro paciente.",
  },
  {
    q: "¿Atienden urgencias?",
    r: "No. Médicos de Delicias es un directorio para consulta programada. Ante una urgencia médica llame al 911 o acuda al servicio de urgencias más cercano.",
  },
  {
    q: "Soy médico, ¿cómo aparezco en el directorio?",
    r: "Solicite su alta desde el sitio con su cédula profesional. Revisamos los datos y, una vez verificados, su perfil se publica con su especialidad, sus consultorios y sus horarios.",
  },
];

export default async function Inicio() {
  const [listaCiudades, listaEspecialidades, profesionales, listaPadecimientos] =
    await Promise.all([
      ciudades(),
      especialidades(),
      profesionalesPublicados(),
      padecimientos(),
    ]);

  // Cuántos atienden cada especialidad, para que la tarjeta no prometa una
  // oferta que no existe.
  const porEspecialidad = await Promise.all(
    listaEspecialidades.map(async (e) => {
      const cuantos = (
        await Promise.all(listaCiudades.map((c) => profesionalesEn(c.slug, e.slug)))
      ).flat();
      const unicos = new Set(cuantos.map((p) => p.slug));
      return { ...e, cuantos: unicos.size };
    }),
  );

  const nombreDeEspecialidad = new Map(listaEspecialidades.map((e) => [e.slug, e.nombre]));
  const nombreDeCiudad = new Map(listaCiudades.map((c) => [c.slug, c.nombre]));

  // Padecimientos y ciudades se cuentan sobre la lista que ya está en
  // memoria: son dos docenas de comparaciones y evitan otras tantas
  // consultas a la base para pintar una portada.
  const porPadecimiento = listaPadecimientos.map((p) => ({
    ...p,
    cuantos: profesionales.filter((m) => m.padecimientos.includes(p.slug)).length,
  }));

  const porCiudad = listaCiudades.map((c) => ({
    ...c,
    cuantos: profesionales.filter((m) =>
      m.consultorios.some((k) => k.ciudad === c.slug),
    ).length,
  }));

  // Los destacados son los mejor calificados; mientras no haya opiniones,
  // simplemente los primeros publicados.
  const destacados = [...profesionales]
    .sort((a, b) => (b.calificacion ?? 0) - (a.calificacion ?? 0))
    .slice(0, 3);

  return (
    <main>
      <section className="portada">
        <PortadaCarrusel
          imagenes={FOTOGRAFIAS}
          descripcion="Médicos de la región atendiendo a sus pacientes en consultorio."
        />

        <div className="envoltura">
          <h1>Encuentra tu médico en Delicias</h1>
          <p className="intro">
            Especialistas cerca de ti, con cédula verificada. Compara perfiles y
            agenda tu próxima consulta en minutos.
          </p>

          <BuscadorPortada
            ciudades={listaCiudades.map((c) => ({ slug: c.slug, nombre: c.nombre }))}
          />

          <div className="populares">
            <span>Búsquedas populares:</span>
            {listaEspecialidades.slice(0, 4).map((e) => (
              <Link key={e.slug} href={`/delicias/${e.slug}`}>
                {e.nombre}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="envoltura">
        <div className="ventajas">
          <div className="ventaja">
            <span className="icono-cuadro">
              <Documento size={20} />
            </span>
            <div>
              <b>Perfiles completos</b>
              <p>Conoce su experiencia, especialidades, consultorios y precios.</p>
            </div>
          </div>
          <div className="ventaja">
            <span className="icono-cuadro">
              <Estrella size={20} />
            </span>
            <div>
              <b>Opiniones de pacientes</b>
              <p>Lee reseñas de personas que ya se atendieron con él.</p>
            </div>
          </div>
          <div className="ventaja">
            <span className="icono-cuadro">
              <Calendario size={20} />
            </span>
            <div>
              <b>Reserva sencilla</b>
              <p>Agenda tu cita en línea en pocos minutos, sin llamadas.</p>
            </div>
          </div>
        </div>
      </div>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <div>
            <h2>Busca por especialidad</h2>
            <p>
              Encuentra al especialista que necesitas entre las especialidades
              disponibles en la región.
            </p>
          </div>
        </div>

        <div className="rejilla-especialidades">
          {porEspecialidad.map((e) => (
            <Link
              key={e.slug}
              href={`/delicias/${e.slug}`}
              className="tarjeta especialidad-tarjeta"
            >
              <span className="icono-cuadro">
                {(() => {
                  const Icono = ICONOS[e.slug] ?? Estetoscopio;
                  return <Icono size={21} />;
                })()}
              </span>
              <b>{e.nombre}</b>
              <span>
                {e.cuantos === 0
                  ? "Próximamente"
                  : e.cuantos === 1
                    ? "1 médico"
                    : `${e.cuantos} médicos`}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {porPadecimiento.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <div>
              <h2>¿Qué le está pasando?</h2>
              <p>
                A veces uno no sabe qué especialista le toca, pero sí sabe qué
                le duele. Elija el motivo y le mostramos quién lo atiende.
              </p>
            </div>
          </div>

          <div className="padecimientos">
            {listaEspecialidades.map((e) => {
              const suyos = porPadecimiento.filter(
                (p) => p.especialidad.slug === e.slug,
              );
              if (suyos.length === 0) return null;
              const Icono = ICONOS[e.slug] ?? Estetoscopio;
              return (
                <div className="padecimiento-grupo" key={e.slug}>
                  <h3>
                    <span className="icono-cuadro">
                      <Icono size={18} />
                    </span>
                    {e.nombre}
                  </h3>
                  <div className="chips">
                    {suyos.map((p) =>
                      p.cuantos > 0 ? (
                        <Link
                          key={p.slug}
                          href={`/delicias/padecimiento/${p.slug}`}
                          className="chip"
                        >
                          {p.nombre}
                        </Link>
                      ) : (
                        // Sin nadie que lo atienda todavía, el enlace llevaría
                        // a una página vacía: se muestra apagado.
                        <span key={p.slug} className="chip chip-apagado">
                          {p.nombre}
                        </span>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {destacados.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <div>
              <h2>Médicos destacados</h2>
              <p>Conoce a algunos de los especialistas del directorio.</p>
            </div>
            <Link href="/delicias" className="enlace-acento">
              Ver todos los médicos →
            </Link>
          </div>

          <div className="rejilla">
            {destacados.map((p) => (
              <TarjetaProfesional
                key={p.slug}
                profesional={p}
                especialidad={nombreDeEspecialidad.get(p.especialidades[0])}
                ciudad={nombreDeCiudad.get(p.consultorios[0]?.ciudad ?? "")}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <div>
            <h2>Dónde atendemos</h2>
            <p>
              Médicos de la región centro-sur de Chihuahua, con su consultorio
              y sus horarios en cada ciudad.
            </p>
          </div>
        </div>

        <div className="rejilla-ciudades">
          {porCiudad.map((c) => (
            <Link key={c.slug} href={`/${c.slug}`} className="tarjeta ciudad-tarjeta">
              <span className="icono-cuadro">
                <Pin size={19} />
              </span>
              <div>
                <b>{c.nombre}</b>
                <span>
                  {c.cuantos === 0
                    ? "Abriendo cobertura"
                    : c.cuantos === 1
                      ? "1 médico con consultorio"
                      : `${c.cuantos} médicos con consultorio`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="verificacion">
          <div>
            <p className="eyebrow">Por qué puede confiar</p>
            <h2>Ningún perfil se publica sin comprobarse</h2>
            <p className="intro">
              Un directorio médico sirve de poco si cualquiera puede aparecer
              en él. Antes de publicar un perfil revisamos, uno por uno, estos
              cuatro puntos.
            </p>
          </div>

          <ul className="comprobaciones">
            <li>
              <span className="icono-cuadro">
                <Documento size={19} />
              </span>
              <div>
                <b>Cédula profesional</b>
                <p>
                  Se comprueba en el Registro Nacional de Profesionistas antes
                  de que el perfil exista para el paciente.
                </p>
              </div>
            </li>
            <li>
              <span className="icono-cuadro">
                <Escudo size={19} />
              </span>
              <div>
                <b>Certificación del consejo</b>
                <p>
                  En las especialidades que lo exigen se verifica además el
                  consejo, y se revisa que siga vigente.
                </p>
              </div>
            </li>
            <li>
              <span className="icono-cuadro">
                <Estrella size={19} />
              </span>
              <div>
                <b>Opiniones de pacientes reales</b>
                <p>
                  Solo puede opinar quien tuvo una cita registrada, una vez por
                  cita, y la reseña pasa por revisión antes de publicarse.
                </p>
              </div>
            </li>
            <li>
              <span className="icono-cuadro">
                <Reloj size={19} />
              </span>
              <div>
                <b>Horarios del propio médico</b>
                <p>
                  La disponibilidad que usted ve la carga y la actualiza el
                  consultorio, no es una estimación nuestra.
                </p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Tu próxima consulta, en tres pasos</h2>
        </div>
        <div className="pasos">
          <div className="paso">
            <span className="numero">1</span>
            <div>
              <b>Busca</b>
              <p>Encuentra un médico por especialidad, padecimiento o nombre.</p>
            </div>
          </div>
          <div className="paso">
            <span className="numero">2</span>
            <div>
              <b>Compara</b>
              <p>Revisa perfiles, opiniones, horarios y precios de consulta.</p>
            </div>
          </div>
          <div className="paso">
            <span className="numero">3</span>
            <div>
              <b>Agenda</b>
              <p>Reserva en línea y recibe tu recordatorio por WhatsApp.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <div>
            <h2>Preguntas frecuentes</h2>
            <p>Lo que más nos preguntan antes de agendar la primera cita.</p>
          </div>
        </div>

        <div className="preguntas">
          {PREGUNTAS.map((p) => (
            // <details> en lugar de un acordeón con JavaScript: funciona
            // antes de que cargue nada y el buscador lee la respuesta.
            <details key={p.q}>
              <summary>{p.q}</summary>
              <p>{p.r}</p>
            </details>
          ))}
        </div>

        <div className="aviso-urgencias">
          <span className="icono-cuadro">
            <Corazon size={19} />
          </span>
          <p>
            <b>Esto no es un servicio de urgencias.</b> Ante dolor en el pecho,
            dificultad para respirar, sangrado abundante o pérdida del
            conocimiento, llame al <a href="tel:911">911</a> o acuda al servicio
            de urgencias más cercano.
          </p>
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebSite",
                name: sitio.nombre,
                url: urlAbsoluta("/"),
                inLanguage: "es-MX",
                potentialAction: {
                  "@type": "SearchAction",
                  target: {
                    "@type": "EntryPoint",
                    urlTemplate: urlAbsoluta("/delicias?q={search_term_string}"),
                  },
                  "query-input": "required name=search_term_string",
                },
              },
              {
                "@type": "FAQPage",
                mainEntity: PREGUNTAS.map((p) => ({
                  "@type": "Question",
                  name: p.q,
                  acceptedAnswer: { "@type": "Answer", text: p.r },
                })),
              },
            ],
          }),
        }}
      />

      <section className="envoltura seccion">
        <div className="banda">
          <div>
            <h2>¿Eres médico en la región?</h2>
            <p>
              Únete a {sitio.nombre} y conecta con más pacientes. Publica tu
              perfil con cédula verificada, muestra tus especialidades y recibe
              citas en línea.
            </p>
          </div>
          <Link href="/alta" className="boton-lleno">
            <Lupa size={17} />
            Crear mi perfil
          </Link>
        </div>
      </section>
    </main>
  );
}
