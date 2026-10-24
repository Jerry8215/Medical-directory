import type { Metadata } from "next";
import Link from "next/link";

import { FormularioOpinion } from "@/componentes/FormularioOpinion";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dejar su opinión",
  // No es una página para buscadores: es un enlace personal del paciente.
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

/**
 * Dejar la opinión desde la invitación que emitió el consultorio.
 *
 * Es la puerta para el paciente que se atendió de verdad pero agendó por
 * teléfono, por WhatsApp o en el mostrador. Sin ella, atar la opinión al
 * enlace de la cita dejaba fuera a la mayoría de los pacientes y el
 * consultorio no tenía forma de pedirles su reseña.
 */
export default async function OpinarPorInvitacion({ params }: Props) {
  const { id } = await params;

  const invitacion = await prisma.invitacionOpinion.findUnique({
    where: { id },
    include: { profesional: { select: { slug: true, nombre: true } } },
  });

  if (!invitacion) {
    return (
      <main className="envoltura seccion">
        <h1>No encontramos esa invitación</h1>
        <div className="nota-umbral">
          El enlace no corresponde a ninguna invitación. Si lo copió de un
          mensaje, revise que esté completo.
        </div>
      </main>
    );
  }

  if (invitacion.usadaEn) {
    return (
      <main className="envoltura seccion">
        <h1>Ya dejó su opinión</h1>
        <div className="nota-umbral">
          Gracias por tomarse el tiempo. Su opinión sobre{" "}
          {invitacion.profesional.nombre} ya está registrada y se publica una
          vez revisada.
        </div>
        <p style={{ marginTop: 14 }}>
          <Link
            href={`/medico/${invitacion.profesional.slug}`}
            className="enlace-acento"
          >
            Ver el perfil de {invitacion.profesional.nombre} →
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Su consulta</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        ¿Cómo le fue con {invitacion.profesional.nombre}?
      </h1>
      <p className="intro">
        Su opinión le sirve al siguiente paciente que esté decidiendo. Se
        publica después de una revisión, y este enlace es suyo: sirve una
        sola vez.
      </p>

      <div style={{ marginTop: 20 }}>
        <FormularioOpinion
          slug={invitacion.profesional.slug}
          profesional={invitacion.profesional.nombre}
          invitacion={invitacion.id}
          autorSugerido={invitacion.paciente}
          abiertoDeInicio
        />
      </div>
    </main>
  );
}
