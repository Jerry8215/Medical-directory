import type { Metadata } from "next";
import Link from "next/link";

import { FilaCita } from "@/componentes/FilaCita";
import { FiltroMedico } from "@/componentes/FiltroMedico";
import {
  HorasApartadas,
  type ConsultorioConHuecos,
  type HoraFila,
} from "@/componentes/HorasApartadas";
import { PeriodosCerrados, type PeriodoFila } from "@/componentes/PeriodosCerrados";
import { diasDelPeriodo, huecos, porDia } from "@/lib/agenda";
import { ocupadosDe } from "@/lib/citas-lectura";
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
  const hoy = ahora.toISOString().slice(0, 10);

  // Los días cerrados son de un médico concreto: se muestran cuando la
  // pantalla está mirando a uno solo, no la agenda entera del directorio.
  const perfilEnFoco = esEquipo
    ? medico
      ? (await prisma.profesional.findUnique({
          where: { slug: medico },
          select: { id: true, nombre: true },
        })) ?? null
      : // El titular del sitio también pasa consulta. Si no eligió a
        // nadie en el filtro, la pantalla que se llama «Mi agenda» le
        // muestra la suya, no una en blanco que lo obliga a buscarse a
        // sí mismo en una lista.
        sesion?.profesionalId
        ? await prisma.profesional.findUnique({
            where: { id: sesion.profesionalId },
            select: { id: true, nombre: true },
          })
        : null
    : sesion?.profesionalId
      ? await prisma.profesional.findUnique({
          where: { id: sesion.profesionalId },
          select: { id: true, nombre: true },
        })
      : null;

  const cerrados: PeriodoFila[] = perfilEnFoco
    ? (
        await prisma.periodoCerrado.findMany({
          where: { profesionalId: perfilEnFoco.id },
          orderBy: { desde: "desc" },
          take: 20,
        })
      ).map((c) => ({
        id: c.id,
        desde: c.desde,
        hasta: c.hasta,
        motivo: c.motivo,
        pasado: c.hasta < hoy,
      }))
    : [];

  // Los huecos que el sitio todavía ofrece, para poder apartar de un clic
  // el que acaba de comprometerse por teléfono.
  const consultoriosConHuecos: ConsultorioConHuecos[] = perfilEnFoco
    ? await Promise.all(
        (
          await prisma.consultorio.findMany({
            where: { profesionalId: perfilEnFoco.id, activo: true },
            include: { franjas: true },
            orderBy: { nombre: "asc" },
          })
        ).map(async (c) => ({
          id: c.id,
          nombre: c.nombre,
          dias: porDia(
            huecos({
              franjas: c.franjas,
              duracionMin: c.duracionCitaMin,
              ocupados: await ocupadosDe(c.id, 60),
              // Los días de vacaciones tampoco se ofrecen aquí: apartar
              // una hora de un día ya cerrado no tendría sentido.
              bloqueados: cerrados
                .filter((p) => !p.pasado)
                .flatMap((p) => diasDelPeriodo(p.desde, p.hasta)),
              desde: hoy,
              dias: 60,
              maximo: 400,
            }),
          ),
        })),
      )
    : [];

  const horasApartadas: HoraFila[] = perfilEnFoco
    ? (
        await prisma.horaCerrada.findMany({
          where: {
            consultorio: { profesionalId: perfilEnFoco.id },
            fecha: { gte: hoy },
          },
          include: { consultorio: { select: { nombre: true } } },
          orderBy: [{ fecha: "asc" }, { hora: "asc" }],
          take: 60,
        })
      ).map((h) => ({
        id: h.id,
        consultorioId: h.consultorioId,
        consultorio: h.consultorio.nombre,
        fecha: h.fecha,
        hora: h.hora,
        motivo: h.motivo,
        pasada: h.fecha < hoy,
      }))
    : [];

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

      {perfilEnFoco ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Días cerrados</h2>
          </div>
          <p className="meta" style={{ marginBottom: 14 }}>
            Vacaciones, congresos o ausencias de {perfilEnFoco.nombre}. Esos días
            dejan de ofrecerse a pacientes nuevos; las citas ya agendadas no se
            cancelan solas.
          </p>
          <PeriodosCerrados profesionalId={perfilEnFoco.id} periodos={cerrados} />
        </section>
      ) : null}

      {perfilEnFoco ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Horas apartadas</h2>
          </div>
          <p className="meta" style={{ marginBottom: 14 }}>
            Cuando le agenden por teléfono, por WhatsApp o en el mostrador,
            aparte aquí ese hueco. Deja de ofrecerse al instante en el sitio y
            en el asistente, de modo que nadie más lo pueda tomar.
          </p>
          <HorasApartadas
            consultorios={consultoriosConHuecos}
            apartadas={horasApartadas}
          />
        </section>
      ) : null}
    </main>
  );
}
