import type { Metadata } from "next";
import Link from "next/link";

import { situacion } from "@/lib/consulta-reglas";
import { pacienteActual } from "@/lib/paciente-acceso";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import {
  apareceEnElListado,
  esSuya,
  puedeEntrar,
  veAlPaciente,
  type QuienMira,
} from "@/lib/visibilidad-consulta";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Consultas en línea",
  description:
    "Casos que los médicos del directorio están respondiendo en línea, por especialidad.",
};

export const dynamic = "force-dynamic";

const COMO_VA: Record<string, string> = {
  "por-pagar": "Por empezar",
  "esperando-medico": "Esperando al médico",
  "sin-respuesta": "Sin respuesta",
  abierta: "Abierta",
  "por-cerrar": "Por cerrarse",
  "se-acabo": "Se acabó el tiempo",
  terminada: "Terminada",
};

const ABIERTAS = new Set(["abierta", "por-cerrar", "esperando-medico"]);

type Props = {
  searchParams: Promise<{ categoria?: string; estado?: string; mias?: string }>;
};

/**
 * El directorio de salas.
 *
 * Cualquiera puede recorrerlo y ordenarlo por especialidad: ver que hay
 * médicos respondiendo casos reales es lo que convence al siguiente
 * paciente de abrir el suyo, y cada caso con su título es contenido por
 * el que la gente busca.
 *
 * Lo que nunca sale de la sala es quién es el paciente. Un padecimiento
 * atado a un nombre es un dato de salud, que la ley trata como sensible,
 * así que el listado publica el título, la especialidad, el médico y el
 * estado, y nada más. El nombre, el teléfono y el correo se quedan
 * adentro; la conversación también, porque entrar sigue exigiendo ser de
 * la sala.
 *
 * Quien ha entrado ve además las suyas, marcadas y con el enlace puesto.
 * El consultorio ve todas, incluidas las que el paciente pidió no
 * publicar, porque le toca responder por ellas.
 */
export default async function Consultas({ searchParams }: Props) {
  const { categoria, estado, mias } = await searchParams;
  const [paciente, sesion] = await Promise.all([pacienteActual(), sesionActual()]);

  const quien: QuienMira = {
    esEquipo: sesion?.rol === "ADMINISTRADOR" || sesion?.rol === "RECEPCION",
    pacienteId: paciente?.id ?? null,
    profesionalId: sesion?.profesionalId ?? null,
  };
  const esEquipo = quien.esEquipo;
  const miPerfil = quien.profesionalId;

  // El equipo ve todo. Los demás ven lo publicado, más lo suyo aunque no
  // esté publicado: nadie debería perder de vista su propia consulta por
  // haber decidido no publicarla.
  const alcance = esEquipo
    ? {}
    : {
        OR: [
          { publica: true },
          ...(paciente ? [{ pacienteId: paciente.id }] : []),
          ...(miPerfil ? [{ profesionalId: miPerfil }] : []),
        ],
      };

  const consultas = await prisma.consulta.findMany({
    where: alcance,
    orderBy: { creadaEn: "desc" },
    include: {
      paciente: { select: { nombre: true } },
      profesional: {
        select: {
          nombre: true,
          slug: true,
          especialidades: {
            where: { principal: true },
            select: { especialidad: { select: { slug: true, nombre: true } } },
          },
        },
      },
    },
    take: 120,
  });

  const ahora = new Date();

  const salas = consultas.map((c) => {
    const esp = c.profesional.especialidades[0]?.especialidad;
    return {
      id: c.id,
      token: c.token,
      titulo: c.titulo ?? c.motivo.split("\n")[0].slice(0, 90),
      medico: c.profesional.nombre,
      medicoSlug: c.profesional.slug,
      categoriaSlug: esp?.slug ?? "sin-especialidad",
      categoria: esp?.nombre ?? "Sin especialidad",
      cuando: enHoraLocal(c.creadaEn),
      donde: situacion(c, ahora),
      esMia: esSuya(quien, c),
      // El nombre del paciente solo lo ve quien ya está adentro de esa
      // sala, o el consultorio. Para todos los demás no existe.
      paciente: veAlPaciente(quien, c) ? (c.paciente.nombre ?? "Un paciente") : null,
      puedeEntrar: puedeEntrar(quien, c),
      enElListado: apareceEnElListado(quien, c),
    };
  });

  // Las categorías salen de lo que hay, no de un catálogo: ofrecer un
  // filtro que no devuelve nada es hacer perder el tiempo.
  const categorias = [...new Map(salas.map((s) => [s.categoriaSlug, s.categoria])).entries()]
    .map(([slug, nombre]) => ({ slug, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const soloMias = mias === "si";
  const visibles = salas.filter(
    (s) =>
      // La consulta trae ya solo lo que corresponde, pero la regla se
      // vuelve a aplicar acá: es la que no puede fallar, y comprobarla
      // dos veces cuesta nada.
      s.enElListado &&
      (!categoria || s.categoriaSlug === categoria) &&
      (!estado ||
        (estado === "abiertas" ? ABIERTAS.has(s.donde) : !ABIERTAS.has(s.donde))) &&
      (!soloMias || s.esMia),
  );

  const cuantasMias = salas.filter((s) => s.esMia).length;

  /** Conserva los demás filtros al cambiar uno. */
  const con = (clave: "categoria" | "estado" | "mias", valor?: string) => {
    const actual: Record<string, string | undefined> = { categoria, estado, mias };
    actual[clave] = valor;
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(actual)) if (v) p.set(k, v);
    const q = p.toString();
    return q ? `/consultas?${q}` : "/consultas";
  };

  return (
    <main className="envoltura seccion" style={{ maxWidth: 820 }}>
      <p className="eyebrow">Consultas en línea</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.1rem)", marginBlock: "10px 8px" }}>
        {esEquipo ? "Todas las consultas" : "Casos que se están respondiendo"}
      </h1>
      <p className="intro">
        Los médicos de {sitio.nombre} responden por escrito, con su cédula
        verificada a la vista. Aquí se ve qué se está atendiendo y de qué
        especialidad.{" "}
        <b>Lo que cada paciente escribe se queda en su sala</b>: de los casos
        ajenos solo se publica el título, nunca quién lo abrió.
      </p>

      {salas.length > 0 ? (
        <div className="filtros-consultas">
          <div className="filtro-grupo">
            <Link href={con("estado", undefined)} data-activo={!estado}>
              Todas
            </Link>
            <Link href={con("estado", "abiertas")} data-activo={estado === "abiertas"}>
              Abiertas
            </Link>
            <Link href={con("estado", "terminadas")} data-activo={estado === "terminadas"}>
              Terminadas
            </Link>
            {cuantasMias > 0 ? (
              <Link href={con("mias", soloMias ? undefined : "si")} data-activo={soloMias}>
                Las mías ({cuantasMias})
              </Link>
            ) : null}
          </div>

          {categorias.length > 1 ? (
            <div className="filtro-grupo">
              <Link href={con("categoria", undefined)} data-activo={!categoria}>
                Toda especialidad
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c.slug}
                  href={con("categoria", c.slug)}
                  data-activo={categoria === c.slug}
                >
                  {c.nombre}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {visibles.length === 0 ? (
        <div className="nota-umbral" style={{ marginTop: 16 }}>
          {salas.length === 0 ? (
            <>
              Todavía no hay consultas en línea.{" "}
              <Link href="/medicos" className="enlace-acento">
                Busque un médico
              </Link>{" "}
              y ábrale la primera.
            </>
          ) : (
            "Ninguna sala coincide con ese filtro."
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {visibles.map((s) => {
            const fila = (
              <>
                <div>
                  <b>{s.titulo}</b>
                  <p className="meta" style={{ marginTop: 4 }}>
                    {s.medico} · {s.categoria}
                    {s.paciente ? ` · ${s.paciente}` : ""}
                  </p>
                  <p className="meta">{s.cuando}</p>
                </div>
                <span className="consulta-marcas">
                  {s.esMia ? <em className="pastilla pastilla-aviso">Suya</em> : null}
                  <em
                    className={`pastilla ${
                      s.donde === "abierta" || s.donde === "por-cerrar"
                        ? "pastilla-bien"
                        : s.donde === "terminada"
                          ? "pastilla-espera"
                          : "pastilla-aviso"
                    }`}
                  >
                    {COMO_VA[s.donde] ?? s.donde}
                  </em>
                </span>
              </>
            );

            // Solo se enlaza lo que se puede abrir. Un enlace que lleva a
            // «esta sala no es suya» es una puerta pintada en la pared.
            return s.puedeEntrar ? (
              <Link key={s.id} href={`/consulta/${s.token}`} className="ficha consulta-fila">
                {fila}
              </Link>
            ) : (
              <article key={s.id} className="ficha consulta-fila">
                {fila}
              </article>
            );
          })}
        </div>
      )}

      {!paciente && !sesion ? (
        <div className="nota-umbral" style={{ marginTop: 20 }}>
          ¿Tiene algo que preguntar? Entre con su correo y su WhatsApp, elija
          un médico disponible y ábrale su consulta.{" "}
          <Link href="/paciente/entrar" className="enlace-acento">
            Entrar
          </Link>
        </div>
      ) : null}

      {paciente ? (
        <p className="meta" style={{ marginTop: 22 }}>
          <Link href="/paciente" className="enlace-acento">
            Ver también mis citas en consultorio →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
