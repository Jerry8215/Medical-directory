import type { Metadata } from "next";
import Link from "next/link";

import { situacion } from "@/lib/consulta-reglas";
import { pacienteActual } from "@/lib/paciente-acceso";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Consultas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const COMO_VA: Record<string, string> = {
  "por-pagar": "Falta el pago",
  "esperando-medico": "Esperando al médico",
  "sin-respuesta": "Sin respuesta",
  abierta: "Abierta",
  "por-cerrar": "Por cerrarse",
  "se-acabo": "Se acabó el tiempo",
  terminada: "Terminada",
};

const ABIERTAS = new Set(["abierta", "por-cerrar", "esperando-medico"]);

type Props = {
  searchParams: Promise<{ categoria?: string; estado?: string }>;
};

/**
 * Las salas de consulta.
 *
 * Cada quien ve las suyas: el paciente las que abrió, el médico las que
 * atiende, y el equipo del consultorio todas, porque le toca responder
 * por ellas. No existe un listado abierto al público, y no es una
 * omisión: el título de un caso lleva el padecimiento de una persona con
 * nombre, y eso es un dato de salud, que la ley trata como sensible.
 *
 * Se ordena y se filtra por especialidad, que es la categoría que de
 * verdad distingue a una consulta de otra, y por si está abierta o ya
 * terminó, que es lo primero que uno busca al entrar.
 */
export default async function Consultas({ searchParams }: Props) {
  const { categoria, estado } = await searchParams;
  const [paciente, sesion] = await Promise.all([pacienteActual(), sesionActual()]);

  if (!paciente && !sesion) {
    return (
      <main className="envoltura seccion" style={{ maxWidth: 560 }}>
        <p className="eyebrow">Consultas</p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          Sus consultas en línea
        </h1>
        <div className="nota-umbral">
          Entre para ver sus salas. Cada conversación la ven solo el
          paciente y el médico que participan en ella.
        </div>
        <div className="acciones" style={{ marginTop: 16 }}>
          <Link href="/paciente/entrar" className="boton-lleno">
            Entrar como paciente
          </Link>
          <Link href="/panel/acceso" className="boton-suave">
            Soy médico
          </Link>
        </div>
      </main>
    );
  }

  const esEquipo = sesion?.rol === "ADMINISTRADOR" || sesion?.rol === "RECEPCION";

  // Cada quien ve lo suyo. El equipo ve todo porque le toca responder.
  const deQuien = esEquipo
    ? {}
    : sesion?.profesionalId
      ? { profesionalId: sesion.profesionalId }
      : { pacienteId: paciente?.id ?? "" };

  const consultas = await prisma.consulta.findMany({
    where: deQuien,
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
    take: 100,
  });

  const ahora = new Date();

  const salas = consultas.map((c) => {
    const esp = c.profesional.especialidades[0]?.especialidad;
    const donde = situacion(c, ahora);
    return {
      id: c.id,
      token: c.token,
      titulo: c.titulo ?? c.motivo.split("\n")[0].slice(0, 90),
      medico: c.profesional.nombre,
      paciente: c.paciente.nombre ?? "Un paciente",
      categoriaSlug: esp?.slug ?? "sin-especialidad",
      categoria: esp?.nombre ?? "Sin especialidad",
      cuando: enHoraLocal(c.creadaEn),
      donde,
    };
  });

  // Las categorías salen de lo que hay, no de un catálogo: ofrecer un
  // filtro que no devuelve nada es hacer perder el tiempo.
  const categorias = [...new Map(salas.map((s) => [s.categoriaSlug, s.categoria])).entries()]
    .map(([slug, nombre]) => ({ slug, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const visibles = salas.filter(
    (s) =>
      (!categoria || s.categoriaSlug === categoria) &&
      (!estado ||
        (estado === "abiertas" ? ABIERTAS.has(s.donde) : !ABIERTAS.has(s.donde))),
  );

  const conFiltro = (clave: string, valor?: string) => {
    const p = new URLSearchParams();
    if (clave === "categoria" ? valor : categoria) {
      p.set("categoria", clave === "categoria" ? valor! : categoria!);
    }
    if (clave === "estado" ? valor : estado) {
      p.set("estado", clave === "estado" ? valor! : estado!);
    }
    const q = p.toString();
    return q ? `/consultas?${q}` : "/consultas";
  };

  return (
    <main className="envoltura seccion" style={{ maxWidth: 760 }}>
      <p className="eyebrow">Consultas</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 8px" }}>
        {esEquipo ? "Todas las consultas" : "Sus consultas en línea"}
      </h1>
      <p className="intro">
        {esEquipo
          ? "Las salas de todo el directorio. Cada conversación la ven solo el paciente y el médico que participan en ella."
          : "Cada sala la ven solo usted y el médico que participa en ella."}
      </p>

      {salas.length > 0 ? (
        <div className="filtros-consultas">
          <div className="filtro-grupo">
            <Link href={conFiltro("estado", undefined)} data-activo={!estado}>
              Todas
            </Link>
            <Link href={conFiltro("estado", "abiertas")} data-activo={estado === "abiertas"}>
              Abiertas
            </Link>
            <Link
              href={conFiltro("estado", "terminadas")}
              data-activo={estado === "terminadas"}
            >
              Terminadas
            </Link>
          </div>

          {categorias.length > 1 ? (
            <div className="filtro-grupo">
              <Link href={conFiltro("categoria", undefined)} data-activo={!categoria}>
                Toda especialidad
              </Link>
              {categorias.map((c) => (
                <Link
                  key={c.slug}
                  href={conFiltro("categoria", c.slug)}
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
              Todavía no tiene salas.{" "}
              <Link href="/medicos" className="enlace-acento">
                Busque un médico
              </Link>{" "}
              y ábrale una consulta.
            </>
          ) : (
            "Ninguna sala coincide con ese filtro."
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {visibles.map((s) => (
            <Link key={s.id} href={`/consulta/${s.token}`} className="ficha consulta-fila">
              <div>
                <b>{s.titulo}</b>
                <p className="meta" style={{ marginTop: 4 }}>
                  {/* El médico que participa, que es lo que distingue una
                      sala de otra cuando los títulos se parecen. */}
                  {s.medico} · {s.categoria}
                  {esEquipo ? ` · ${s.paciente}` : ""}
                </p>
                <p className="meta">{s.cuando}</p>
              </div>
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
            </Link>
          ))}
        </div>
      )}

      {!esEquipo ? (
        <p className="meta" style={{ marginTop: 22 }}>
          <Link href="/paciente" className="enlace-acento">
            Ver también mis citas en consultorio →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
