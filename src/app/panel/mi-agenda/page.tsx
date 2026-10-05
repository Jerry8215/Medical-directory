import type { Metadata } from "next";
import Link from "next/link";

import { FilaCita } from "@/componentes/FilaCita";
import { FiltroMedico } from "@/componentes/FiltroMedico";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Mi agenda",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * La agenda de un profesional.
 *
 * El administrador y la recepción ven la de cualquiera; el profesional ve
 * solo la suya, y por eso el filtro sale de la sesión y no de la dirección:
 * cambiar el parámetro no puede mostrar los pacientes de otro médico.
 */
export default async function MiAgenda({
  searchParams,
}: {
  searchParams: Promise<{ medico?: string }>;
}) {
  const sesion = await sesionActual();
  const { medico } = await searchParams;

  const esEquipo = sesion?.rol === "ADMINISTRADOR" || sesion?.rol === "RECEPCION";
  const donde = esEquipo
    ? medico
      ? { profesional: { slug: medico } }
      : {}
    : { profesionalId: sesion?.profesionalId ?? "sin-perfil" };

  const ahora = new Date();

  const [proximas, recientes, profesionales] = await Promise.all([
    prisma.cita.findMany({
      where: { ...donde, inicio: { gte: ahora }, estado: { not: "CANCELADA" } },
      orderBy: { inicio: "asc" },
      take: 30,
      include: { paciente: true, consultorio: true, profesional: true },
    }),
    prisma.cita.findMany({
      where: { ...donde, inicio: { lt: ahora } },
      orderBy: { inicio: "desc" },
      take: 10,
      include: { paciente: true, consultorio: true, profesional: true },
    }),
    esEquipo
      ? prisma.profesional.findMany({
          where: { estado: "PUBLICADO" },
          orderBy: { nombre: "asc" },
          select: { slug: true, nombre: true },
        })
      : Promise.resolve([]),
  ]);

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Agenda
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          {esEquipo && !medico ? "Agenda del directorio" : "Mi agenda"}
        </h1>
        <p className="intro">
          Las citas que vienen y las de los últimos días. Cancelar devuelve el
          horario al directorio para que otro paciente pueda tomarlo.
        </p>

        {esEquipo && profesionales.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <FiltroMedico medicos={profesionales} elegido={medico} />
          </div>
        ) : null}
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Próximas</h2>
          <span>{proximas.length} citas</span>
        </div>
        {proximas.length > 0 ? (
          <div style={{ display: "grid", gap: 14 }}>
            {proximas.map((c) => (
              <FilaCita
                key={c.id}
                id={c.id}
                cuando={enHoraLocal(c.inicio)}
                paciente={c.paciente.nombre ?? "Paciente sin nombre"}
                telefono={c.paciente.telefono}
                consultorio={
                  esEquipo && !medico
                    ? `${c.consultorio.nombre} · ${c.profesional.nombre}`
                    : c.consultorio.nombre
                }
                estado={c.estado}
                pasada={false}
              />
            ))}
          </div>
        ) : (
          <div className="nota-umbral">No hay citas próximas.</div>
        )}
      </section>

      {recientes.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Recientes</h2>
          </div>
          <div style={{ display: "grid", gap: 14 }}>
            {recientes.map((c) => (
              <FilaCita
                key={c.id}
                id={c.id}
                cuando={enHoraLocal(c.inicio)}
                paciente={c.paciente.nombre ?? "Paciente sin nombre"}
                telefono={c.paciente.telefono}
                consultorio={c.consultorio.nombre}
                estado={c.estado}
                pasada
              />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
