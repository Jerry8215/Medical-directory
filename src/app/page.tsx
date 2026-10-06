import Link from "next/link";

import { BuscadorPortada } from "@/componentes/BuscadorPortada";
import {
  Bebe,
  Calendario,
  Corazon,
  Documento,
  Estetoscopio,
  Estrella,
  Hueso,
  Lupa,
  Mujer,
  Pulmon,
} from "@/componentes/Iconos";
import { PortadaCarrusel } from "@/componentes/PortadaCarrusel";
import { TarjetaProfesional } from "@/componentes/TarjetaProfesional";
import { sitio } from "@/config/sitio";
import {
  ciudades,
  especialidades,
  profesionalesEn,
  profesionalesPublicados,
} from "@/lib/catalogo";

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

export default async function Inicio() {
  const [listaCiudades, listaEspecialidades, profesionales] = await Promise.all([
    ciudades(),
    especialidades(),
    profesionalesPublicados(),
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
