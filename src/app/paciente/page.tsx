import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SalirPaciente } from "@/componentes/SalirPaciente";
import { situacion } from "@/lib/consulta-reglas";
import { pacienteActual } from "@/lib/paciente-acceso";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mis citas y consultas",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Cómo se dice cada situación cuando quien lee es el paciente. */
const COMO_VA: Record<string, string> = {
  "por-pagar": "Falta el pago",
  "esperando-medico": "Esperando al médico",
  "sin-respuesta": "Sin respuesta · se devuelve",
  abierta: "Abierta",
  "por-cerrar": "Por cerrarse",
  "se-acabo": "Se acabó el tiempo",
  terminada: "Terminada",
};

const COMO_VA_LA_CITA: Record<string, string> = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  ATENDIDA: "Atendida",
  CANCELADA: "Cancelada",
  NO_ASISTIO: "No asistió",
};

/**
 * Todo lo del paciente en un solo lugar.
 *
 * Sus citas presenciales y sus consultas escritas conviven acá a
 * propósito: para él no son dos productos, son dos maneras de haberse
 * atendido con un médico. Tenerlas en pantallas distintas lo obligaría a
 * recordar por cuál vía fue cada vez, que es justo lo que no recuerda.
 *
 * Las dos se identifican con la misma persona porque el paciente existe
 * una sola vez en la plataforma, atado a su teléfono.
 */
export default async function MisCasos() {
  const paciente = await pacienteActual();
  if (!paciente) redirect("/paciente/entrar");

  const [consultas, citas] = await Promise.all([
    prisma.consulta.findMany({
      where: { pacienteId: paciente.id },
      orderBy: { creadaEn: "desc" },
      include: { profesional: { select: { nombre: true } } },
      take: 40,
    }),
    prisma.cita.findMany({
      where: { pacienteId: paciente.id },
      orderBy: { inicio: "desc" },
      include: {
        profesional: { select: { nombre: true } },
        consultorio: { select: { nombre: true, ciudad: { select: { nombre: true } } } },
      },
      take: 40,
    }),
  ]);

  const ahora = new Date();
  const vacio = consultas.length === 0 && citas.length === 0;

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Pacientes</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        Mis citas y consultas
      </h1>

      {vacio ? (
        <div className="nota-umbral">
          Todavía no tiene nada aquí.{" "}
          <Link href="/medicos" className="enlace-acento">
            Busque un médico
          </Link>{" "}
          y agende una cita, o ábrale una consulta en línea si está
          disponible.
        </div>
      ) : null}

      {consultas.length > 0 ? (
        <section style={{ marginTop: 18 }}>
          <div className="seccion-cabeza">
            <h2>Consultas en línea</h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {consultas.map((c) => {
              const donde = situacion(c, ahora);
              return (
                <Link
                  key={c.id}
                  href={`/consulta/${c.token}`}
                  className="ficha consulta-fila"
                >
                  <div>
                    <b>{c.profesional.nombre}</b>
                    <p className="meta">{enHoraLocal(c.creadaEn)}</p>
                    <p style={{ fontSize: "0.92rem", marginTop: 4 }}>
                      {c.motivo.length > 110 ? `${c.motivo.slice(0, 110)}…` : c.motivo}
                    </p>
                  </div>
                  <em
                    className={`pastilla ${
                      donde === "abierta" || donde === "por-cerrar"
                        ? "pastilla-bien"
                        : donde === "terminada"
                          ? "pastilla-espera"
                          : "pastilla-aviso"
                    }`}
                  >
                    {COMO_VA[donde] ?? donde}
                  </em>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {citas.length > 0 ? (
        <section style={{ marginTop: 22 }}>
          <div className="seccion-cabeza">
            <h2>Citas en consultorio</h2>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {citas.map((c) => (
              <Link key={c.id} href={`/cita/${c.token}`} className="ficha consulta-fila">
                <div>
                  <b>{c.profesional.nombre}</b>
                  <p className="meta">
                    {enHoraLocal(c.inicio)} · {c.consultorio.nombre},{" "}
                    {c.consultorio.ciudad.nombre}
                  </p>
                  {c.motivo ? (
                    <p style={{ fontSize: "0.92rem", marginTop: 4 }}>{c.motivo}</p>
                  ) : null}
                </div>
                <em
                  className={`pastilla ${
                    c.estado === "CANCELADA" || c.estado === "NO_ASISTIO"
                      ? "pastilla-espera"
                      : c.estado === "ATENDIDA"
                        ? "pastilla-aviso"
                        : "pastilla-bien"
                  }`}
                >
                  {COMO_VA_LA_CITA[c.estado] ?? c.estado}
                </em>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div
        className="acciones"
        style={{ marginTop: 24, alignItems: "center", gap: 14 }}
      >
        <span className="meta">Entró como {paciente.nombre || "paciente"}.</span>
        <Link href="/medicos" className="enlace-acento">
          Buscar otro médico
        </Link>
        <SalirPaciente />
      </div>
    </main>
  );
}
