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
} from "@/componentes/Iconos";
import {
  BurbujasDudas,
  Cuerpo,
  EscudoVerificado,
  Flecha,
  MapaRegion,
} from "@/componentes/Ilustraciones";
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
/**
 * Una línea por especialidad, para la cuadrícula de arriba.
 *
 * Se describe lo que resuelve, no lo que estudió: el paciente que llega a la
 * portada está buscando a quién acudir, no un plan de estudios. Las que no
 * estén acá caen en una línea general en lugar de quedarse mudas.
 */
const DESCRIPCIONES: Record<string, string> = {
  "cirugia-general": "Diagnóstico y tratamiento quirúrgico, con un enfoque humano y seguro.",
  ginecologia: "Cuidado integral de la mujer, en todas las etapas.",
  pediatria: "Salud y crecimiento de los más pequeños de la casa.",
  traumatologia: "Recupera tu movilidad después de una lesión o una fractura.",
  "medicina-interna": "Prevención y control de las enfermedades del adulto.",
  cardiologia: "Cuidado del corazón y de la presión arterial.",
  neumologia: "Atención de las vías respiratorias y la respiración.",
};

const DESCRIPCION_GENERICA =
  "Especialistas de la región con cédula verificada y cita en línea.";

/** Las zonas que nombra el dibujo del mapa de síntomas. */
const ZONAS = ["Cabeza", "Respiratorio", "Corazón", "Digestivo", "Huesos y articulaciones"];

/**
 * Dónde cae el nombre de cada ciudad sobre el mapa.
 *
 * Los alfileres vienen dibujados en la ilustración: estas son las
 * posiciones de cada uno, en por ciento, para colgarles el nombre encima.
 * El mapa es una ilustración, no una carta geográfica, así que las
 * posiciones son las del dibujo y no las del territorio.
 */
const MAPA: Record<string, { left: number; top: number }> = {
  delicias: { left: 51.9, top: 26.5 },
  meoqui: { left: 28.8, top: 16.3 },
  rosales: { left: 76.4, top: 22.2 },
  saucillo: { left: 84.6, top: 54.8 },
  camargo: { left: 24.3, top: 45.2 },
};

/**
 * La ilustración de cada especialidad, entregada con el diseño.
 *
 * `foto` distingue las dos fotografías de los tres objetos recortados: unas
 * se encuadran y los otros flotan sobre el color de la tarjeta.
 */
const ARTE: Record<string, { src: string; foto?: boolean }> = {
  "cirugia-general": { src: "/elementos/consulta.webp", foto: true },
  ginecologia: { src: "/elementos/maternidad.webp", foto: true },
  pediatria: { src: "/elementos/pediatria.webp" },
  traumatologia: { src: "/elementos/rodilla.webp" },
  "medicina-interna": { src: "/elementos/estetoscopio.webp" },
};

/**
 * El rótulo corto que va arriba de la tarjeta.
 *
 * «Ginecología y Obstetricia» en versalitas y en dos renglones se come la
 * tarjeta, así que arriba va solo la primera mitad y el nombre completo
 * queda en el título.
 */
function rotuloDe(nombre: string): string {
  const [primera] = nombre.split(" y ");
  return primera;
}

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
    r: "Nada. Buscar médico, comparar perfiles y agendar tu cita no te cuesta. Lo que pagas es la consulta, directamente en el consultorio, y el precio aparece en el perfil de cada médico cuando él lo publica.",
  },
  {
    q: "¿Cómo sé que el médico tiene cédula de verdad?",
    r: "Antes de publicar un perfil comprobamos la cédula profesional en el Registro Nacional de Profesionistas. En las especialidades que lo exigen comprobamos además la certificación del consejo correspondiente. El perfil que ya pasó esa revisión lleva la palomita de verificado.",
  },
  {
    q: "¿Puedo agendar en línea con cualquier médico?",
    r: "Con los que tienen agenda en línea activa, sí: eliges el horario y la cita queda confirmada en el momento. En los demás perfiles aparece el teléfono del consultorio para que llames directamente.",
  },
  {
    q: "¿Puedo cambiar o cancelar mi cita?",
    r: "Sí. Al agendar recibes un enlace propio de tu cita; desde ahí la cambias o la cancelas sin llamar al consultorio. El horario que liberas vuelve a quedar disponible para otro paciente.",
  },
  {
    q: "¿Atienden urgencias?",
    r: "No. Médicos de Delicias es un directorio para consulta programada. Ante una urgencia médica llama al 911 o acude al servicio de urgencias más cercano.",
  },
  {
    q: "Soy médico, ¿cómo aparezco en el directorio?",
    r: "Solicita tu alta desde el sitio con tu cédula profesional. Revisamos los datos y, una vez verificados, tu perfil se publica con tu especialidad, tus consultorios y tus horarios.",
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

      <div className="franja-ventajas">
        <div className="envoltura">
          <div className="ventajas">
            <div className="ventaja">
              <span className="icono-cuadro">
                <Documento size={20} />
              </span>
              <div>
                <b>Perfiles completos</b>
                <p>Conoce la experiencia, formación y detalles de cada médico.</p>
              </div>
            </div>
            <div className="ventaja">
              <span className="icono-cuadro">
                <Estrella size={20} />
              </span>
              <div>
                <b>Opiniones de pacientes</b>
                <p>Lee reseñas reales de personas que ya se atendieron con él.</p>
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
      </div>

      <section className="envoltura seccion">
        <div className="cabeza-doble">
          <div>
            <p className="rotulo">Especialidades</p>
            <h2>Encuentra atención para cada etapa de tu vida</h2>
          </div>
          <div className="cabeza-doble-lado">
            <p>
              Desde la prevención hasta el tratamiento, encuentra al
              especialista indicado para ti y para tu familia en Delicias.
            </p>
            <Link href="/delicias" className="enlace-acento">
              Ver todas las especialidades →
            </Link>
          </div>
        </div>

        <div className="especialidades-rejilla">
          {porEspecialidad.slice(0, 5).map((e, i) => {
            const Icono = ICONOS[e.slug] ?? Estetoscopio;
            const arte = ARTE[e.slug];
            return (
              <Link
                key={e.slug}
                href={`/delicias/${e.slug}`}
                className={`tarjeta-esp${i === 0 ? " tarjeta-esp-ancha" : ""}`}
                data-esp={e.slug}
              >
                {arte ? (
                  <span
                    className={`esp-arte${arte.foto ? " esp-arte-foto" : ""}`}
                    aria-hidden="true"
                  >
                    <img src={arte.src} alt="" loading="lazy" />
                  </span>
                ) : null}

                <span className="esp-cuerpo">
                  <span className="esp-rotulo">
                    <Icono size={17} />
                    {rotuloDe(e.nombre)}
                  </span>
                  <b>{e.nombre}</b>
                  <span className="esp-texto">
                    {DESCRIPCIONES[e.slug] ?? DESCRIPCION_GENERICA}
                  </span>
                  <span className="esp-boton">
                    Ver especialistas
                    <Flecha size={16} />
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {porPadecimiento.length > 0 ? (
        <section className="franja-sintomas">
          <div className="envoltura seccion sintomas">
            <div className="sintomas-arte">
              <Cuerpo />
              <div className="zonas">
                {ZONAS.map((z) => (
                  <span className="zona" key={z}>
                    {z}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="rotulo">Síntomas</p>
              <h2>¿Qué te está pasando?</h2>
              <p className="intro">
                A veces no sabes qué especialista te toca, pero sí sabes qué te
                duele. Elige el motivo y te mostramos quién lo atiende.
              </p>

              <div className="sintomas-filas">
                {listaEspecialidades.map((e) => {
                  const suyos = porPadecimiento.filter(
                    (p) => p.especialidad.slug === e.slug,
                  );
                  if (suyos.length === 0) return null;
                  const Icono = ICONOS[e.slug] ?? Estetoscopio;
                  return (
                    <div className="sintoma-fila" key={e.slug}>
                      <span className="sintoma-nombre">
                        <span className="icono-cuadro">
                          <Icono size={17} />
                        </span>
                        {e.nombre}
                      </span>
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
                            // Sin nadie que lo atienda todavía, el enlace
                            // llevaría a una página vacía: se muestra apagado.
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
            </div>
          </div>
        </section>
      ) : null}

      {destacados.length > 0 ? (
        <section className="envoltura seccion">
          <div className="cabeza-doble">
            <div>
              <p className="rotulo">Médicos destacados</p>
              <h2>Conoce a algunos de los especialistas en Delicias</h2>
            </div>
            <div className="cabeza-doble-lado">
              <Link href="/delicias" className="enlace-acento">
                Ver todos los médicos →
              </Link>
            </div>
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
        <div className="ciudades">
          <div>
            <p className="rotulo">En tu ciudad y alrededores</p>
            <h2>Dónde atendemos</h2>
            <p className="intro">
              Médicos de la región centro-sur de Chihuahua, con su consultorio y
              sus horarios en cada ciudad.
            </p>

            <ul className="lista-ciudades">
              {porCiudad.map((c) => (
                <li key={c.slug}>
                  <Link href={`/${c.slug}`}>
                    <span className="icono-cuadro">
                      <Pin size={17} />
                    </span>
                    <span>
                      <b>{c.nombre}</b>
                      <small>
                        {c.cuantos === 0
                          ? "Abriendo cobertura"
                          : c.cuantos === 1
                            ? "1 médico con consultorio"
                            : `${c.cuantos} médicos con consultorio`}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Solo las que tienen alfiler en el dibujo: una ciudad nueva
              aparece en la lista de al lado, no encimada sobre otra. */}
          <MapaRegion
            ciudades={porCiudad
              .filter((c) => MAPA[c.slug])
              .map((c) => ({
                nombre: c.nombre,
                principal: c.slug === "delicias",
                ...MAPA[c.slug],
              }))}
          />
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="verificacion">
          <div className="verificacion-texto">
            <p className="rotulo">Perfiles verificados</p>
            <h2>
              Ningún perfil se publica <span>sin comprobarse</span>
            </h2>
            <p>
              Un directorio médico sirve de poco si cualquiera puede aparecer en
              él. Antes de publicar un perfil comprobamos la cédula profesional,
              la especialidad y, donde hace falta, la certificación del consejo,
              para que agendes con confianza.
            </p>
            <a href="#preguntas" className="boton-contorno">
              Mira cómo lo comprobamos
              <Flecha size={16} />
            </a>
          </div>

          <div className="verificacion-arte">
            <EscudoVerificado />
            <ul className="sellos">
              <li>
                <span className="icono-cuadro">
                  <Documento size={17} />
                </span>
                Cédula profesional verificada
              </li>
              <li>
                <span className="icono-cuadro">
                  <Escudo size={17} />
                </span>
                Especialidad y consejo confirmados
              </li>
              <li>
                <span className="icono-cuadro">
                  <Estrella size={17} />
                </span>
                Opiniones solo de quien tuvo cita
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="envoltura seccion">
        <p className="rotulo">Así de fácil</p>
        <h2 className="titulo-seccion">Tu próxima consulta, en tres pasos</h2>

        <div className="pasos-ui">
          <div className="paso-ui">
            <div className="paso-cabeza">
              <span className="numero">1</span>
              <div>
                <b>Busca</b>
                <p>Encuentra un médico por especialidad, síntoma o nombre.</p>
              </div>
            </div>
            {/* Las maquetas son decoración: muestran de un vistazo cómo se ve
                cada paso sin obligar a leerlo. */}
            <div className="maqueta" aria-hidden="true">
              <div className="maqueta-busqueda">
                <Lupa size={15} />
                Pediatría en Delicias
              </div>
              <div className="maqueta-fila">
                <span className="maqueta-avatar" />
                <span className="maqueta-barras" />
              </div>
              <div className="maqueta-fila">
                <span className="maqueta-avatar" />
                <span className="maqueta-barras" />
              </div>
            </div>
          </div>

          <div className="paso-ui">
            <div className="paso-cabeza">
              <span className="numero">2</span>
              <div>
                <b>Compara</b>
                <p>Revisa perfiles, opiniones, horarios y precios de consulta.</p>
              </div>
            </div>
            <div className="maqueta" aria-hidden="true">
              <div className="maqueta-fila">
                <span className="maqueta-avatar maqueta-iniciales">HN</span>
                <span className="maqueta-barras" />
              </div>
              <div className="maqueta-fila">
                <span className="maqueta-avatar maqueta-iniciales">IS</span>
                <span className="maqueta-barras" />
              </div>
            </div>
          </div>

          <div className="paso-ui">
            <div className="paso-cabeza">
              <span className="numero">3</span>
              <div>
                <b>Agenda</b>
                <p>Reserva en línea y recibe la confirmación de tu cita.</p>
              </div>
            </div>
            <div className="maqueta" aria-hidden="true">
              <div className="maqueta-fila">
                <span className="maqueta-avatar">
                  <Calendario size={17} />
                </span>
                <span className="maqueta-barras" />
              </div>
              <div className="maqueta-confirmada">¡Cita agendada!</div>
            </div>
          </div>
        </div>
      </section>

      <section className="envoltura seccion" id="preguntas">
        <div className="faq">
          <div className="faq-intro">
            <p className="rotulo">Preguntas frecuentes</p>
            <h2>Resolvemos tus dudas</h2>
            <p>
              Aquí están las respuestas a lo que más nos preguntan antes de
              agendar la primera cita.
            </p>
            <BurbujasDudas />
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
        </div>

        <div className="aviso-urgencias">
          <span className="icono-cuadro">
            <Corazon size={19} />
          </span>
          <p>
            <b>Esto no es un servicio de urgencias.</b> Ante dolor en el pecho,
            dificultad para respirar, sangrado abundante o pérdida del
            conocimiento, llama al <a href="tel:911">911</a> o acude al servicio
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
