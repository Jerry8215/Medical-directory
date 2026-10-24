import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { situacion } from "@/lib/consulta-reglas";
import { pacienteActual } from "@/lib/paciente-acceso";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Mis consultas",
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

export default async function MisConsultas() {
  const paciente = await pacienteActual();
  if (!paciente) redirect("/paciente/entrar");

  const consultas = await prisma.consulta.findMany({
    where: { pacienteId: paciente.id },
    orderBy: { creadaEn: "desc" },
    include: { profesional: { select: { nombre: true } } },
    take: 50,
  });

  const ahora = new Date();

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Pacientes</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        Mis consultas
      </h1>

      {consultas.length === 0 ? (
        <div className="nota-umbral">
          Todavía no tiene consultas.{" "}
          <Link href="/medicos" className="enlace-acento">
            Busque un médico
          </Link>{" "}
          y ábrale una, o agende una cita presencial.
        </div>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          {consultas.map((c) => {
            const donde = situacion(c, ahora);
            return (
              <Link key={c.id} href={`/consulta/${c.token}`} className="ficha consulta-fila">
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
      )}
    </main>
  );
}
