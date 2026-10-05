import type { Metadata } from "next";
import Link from "next/link";

import { FilaOpinion } from "@/componentes/FilaOpinion";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Opiniones",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Revisión de opiniones.
 *
 * Primero las que esperan: son las que bloquean a un paciente que ya
 * escribió y a un médico que todavía no ve su reseña.
 */
export default async function Opiniones() {
  const [pendientes, publicadas] = await Promise.all([
    prisma.opinion.findMany({
      where: { publicada: false },
      orderBy: { fecha: "desc" },
      include: { profesional: { select: { nombre: true } } },
      take: 40,
    }),
    prisma.opinion.findMany({
      where: { publicada: true },
      orderBy: { fecha: "desc" },
      include: { profesional: { select: { nombre: true } } },
      take: 20,
    }),
  ]);

  const fecha = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Opiniones
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          Opiniones de pacientes
        </h1>
        <p className="intro">
          Se revisan antes de publicarse. No se publican las que traigan datos
          clínicos de una persona identificable, ofensas o afirmaciones sobre
          terceros. Al publicar una, la calificación del perfil se recalcula.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Por revisar</h2>
          <span>{pendientes.length}</span>
        </div>
        {pendientes.length > 0 ? (
          <div style={{ display: "grid", gap: 14 }}>
            {pendientes.map((o) => (
              <FilaOpinion
                key={o.id}
                id={o.id}
                autor={o.autor}
                texto={o.texto}
                calificacion={o.calificacion}
                profesional={o.profesional.nombre}
                cuando={fecha(o.fecha)}
                publicada={false}
                deUnaCita={Boolean(o.citaId)}
              />
            ))}
          </div>
        ) : (
          <div className="nota-umbral">No hay opiniones esperando revisión.</div>
        )}
      </section>

      {publicadas.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Publicadas</h2>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {publicadas.map((o) => (
              <FilaOpinion
                key={o.id}
                id={o.id}
                autor={o.autor}
                texto={o.texto}
                calificacion={o.calificacion}
                profesional={o.profesional.nombre}
                cuando={fecha(o.fecha)}
                publicada
                deUnaCita={Boolean(o.citaId)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
