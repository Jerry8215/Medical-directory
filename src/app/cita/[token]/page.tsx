import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { MiCita } from "@/componentes/MiCita";
import { huecos, porDia } from "@/lib/agenda";
import { cuandoLegible } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Su cita",
  // La dirección lleva el identificador de una cita: no es para buscadores.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function Cita({ params }: Props) {
  const { token } = await params;

  const cita = await prisma.cita.findUnique({
    where: { token },
    include: {
      profesional: true,
      consultorio: { include: { ciudad: true, franjas: true } },
    },
  });

  if (!cita) notFound();

  const hoy = new Date(Date.now() - 6 * 60 * 60_000).toISOString().slice(0, 10);

  const otras = await prisma.cita.findMany({
    where: {
      consultorioId: cita.consultorioId,
      id: { not: cita.id },
      estado: { in: ["SOLICITADA", "AGENDADA", "CONFIRMADA"] },
      inicio: { gte: new Date() },
    },
    select: { inicio: true, fin: true },
  });

  const ocupados = otras.map((c) => {
    const local = new Date(c.inicio.getTime() - 6 * 60 * 60_000);
    return {
      fecha: local.toISOString().slice(0, 10),
      hora: local.toISOString().slice(11, 16),
      duracionMin: Math.round((c.fin.getTime() - c.inicio.getTime()) / 60_000),
    };
  });

  const dias = porDia(
    huecos({
      franjas: cita.consultorio.franjas.map((f) => ({
        dia: f.dia,
        desde: f.desde,
        hasta: f.hasta,
      })),
      duracionMin: cita.consultorio.duracionCitaMin,
      ocupados,
      desde: hoy,
      dias: 21,
      maximo: 24,
    }),
  );

  return (
    <main>
      <section
        className="envoltura"
        style={{ maxWidth: 620, paddingBlock: "44px 36px" }}
      >
        <p className="eyebrow">Su cita</p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 16px" }}>
          {cita.profesional.nombre}
        </h1>

        <MiCita
          token={token}
          cuando={cuandoLegible(cita.inicio)}
          profesional={cita.profesional.nombre}
          consultorio={cita.consultorio.nombre}
          direccion={`${cita.consultorio.direccion}, ${cita.consultorio.ciudad.nombre}`}
          estado={cita.estado}
          dias={dias}
        />

        <p className="meta" style={{ marginTop: 16 }}>
          <Link href={`/medico/${cita.profesional.slug}`} className="enlace-acento">
            Ver el perfil del médico
          </Link>
        </p>
      </section>
    </main>
  );
}
