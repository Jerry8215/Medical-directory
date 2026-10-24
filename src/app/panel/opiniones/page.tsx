import type { Metadata } from "next";
import Link from "next/link";

import { FilaOpinion } from "@/componentes/FilaOpinion";
import { exigirAdministrador } from "@/lib/guardia-panel";
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
  await exigirAdministrador();
  const [pendientes, publicadas] = await Promise.all([
    prisma.opinion.findMany({
      where: { publicada: false },
      orderBy: { fecha: "desc" },
      include: {
        profesional: { select: { nombre: true } },
        // De dónde viene la opinión: una cita la respalda el sistema,
        // una invitación la respalda quien la emitió.
        invitacion: { select: { emitidaPor: true, atendidoEn: true } },
        consulta: { select: { cerradaEn: true } },
      },
      take: 40,
    }),
    prisma.opinion.findMany({
      where: { publicada: true },
      orderBy: { fecha: "desc" },
      include: {
        profesional: { select: { nombre: true } },
        // De dónde viene la opinión: una cita la respalda el sistema,
        // una invitación la respalda quien la emitió.
        invitacion: { select: { emitidaPor: true, atendidoEn: true } },
        consulta: { select: { cerradaEn: true } },
      },
      take: 20,
    }),
  ]);

  // La fecha de la consulta de cada opinión: con ella el administrador
  // comprueba que corresponde a una visita y no a un parecido de nombre.
  // Va en una consulta aparte porque `citaId` es una columna suelta, sin
  // relación declarada, y ponerle una ahora pediría una migración.
  const citas = await prisma.cita.findMany({
    where: {
      id: {
        in: [...pendientes, ...publicadas]
          .map((o) => o.citaId)
          .filter((id): id is string => Boolean(id)),
      },
    },
    select: { id: true, inicio: true },
  });
  const consultaDe = new Map(citas.map((c) => [c.id, c.inicio]));

  const fecha = (d: Date) => d.toISOString().slice(0, 10);
  const cuandoSeAtendio = (citaId: string | null) => {
    const inicio = citaId ? consultaDe.get(citaId) : undefined;
    return inicio ? fecha(inicio) : null;
  };

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
                consulta={cuandoSeAtendio(o.citaId)}
                enLinea={o.consulta?.cerradaEn ? fecha(o.consulta.cerradaEn) : null}
                invitada={
                  o.invitacion
                    ? {
                        por: o.invitacion.emitidaPor,
                        cuando: o.invitacion.atendidoEn
                          ? fecha(o.invitacion.atendidoEn)
                          : null,
                      }
                    : null
                }
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
                consulta={cuandoSeAtendio(o.citaId)}
                enLinea={o.consulta?.cerradaEn ? fecha(o.consulta.cerradaEn) : null}
                invitada={
                  o.invitacion
                    ? {
                        por: o.invitacion.emitidaPor,
                        cuando: o.invitacion.atendidoEn
                          ? fecha(o.invitacion.atendidoEn)
                          : null,
                      }
                    : null
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
