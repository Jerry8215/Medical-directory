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

type Props = { params: Promise<{ token: string }> };

/**
 * Dejar la opinión desde el enlace que recibe el paciente.
 *
 * Va en su propia página y no en el perfil del médico porque el perfil se
 * sirve estático y cacheado para que Google lo muestre; recibir un
 * parámetro distinto por paciente lo volvería dinámico y le costaría esa
 * ventaja a cambio de nada.
 *
 * El token hace dos cosas a la vez: identifica la cita y demuestra que
 * hubo una. Por eso no se pide registro ni se pregunta quién es.
 */
export default async function Opinar({ params }: Props) {
  const { token } = await params;

  const cita = await prisma.cita.findUnique({
    where: { token },
    include: {
      profesional: { select: { slug: true, nombre: true } },
      paciente: { select: { nombre: true } },
    },
  });

  if (!cita) {
    return (
      <main className="envoltura seccion">
        <h1>No encontramos esa cita</h1>
        <div className="nota-umbral">
          El enlace no corresponde a ninguna cita. Si lo copió de un mensaje,
          revise que esté completo.
        </div>
      </main>
    );
  }

  // Lo mismo que comprueba la acción al guardar, para que el paciente no
  // llene el formulario y se entere después de que no cuenta.
  if (cita.estado === "CANCELADA") {
    return (
      <main className="envoltura seccion">
        <h1>Esa consulta quedó cancelada</h1>
        <div className="nota-umbral">
          Las opiniones son de consultas que ocurrieron. Si al final se
          atendió con {cita.profesional.nombre} por otra vía, escríbanos y
          le mandamos el enlace que corresponde.
        </div>
      </main>
    );
  }

  if (cita.inicio > new Date()) {
    return (
      <main className="envoltura seccion">
        <h1>Su consulta todavía no ocurre</h1>
        <div className="nota-umbral">
          Guarde este enlace: después de su cita con {cita.profesional.nombre}{" "}
          podrá dejar su opinión aquí mismo.
        </div>
      </main>
    );
  }

  const yaOpino = await prisma.opinion.findUnique({ where: { citaId: cita.id } });

  if (yaOpino) {
    return (
      <main className="envoltura seccion">
        <h1>Ya dejó su opinión</h1>
        <div className="nota-umbral">
          Gracias por tomarse el tiempo. Su opinión sobre {cita.profesional.nombre}{" "}
          ya está registrada y se publica una vez revisada.
        </div>
        <p style={{ marginTop: 14 }}>
          <Link href={`/medico/${cita.profesional.slug}`} className="enlace-acento">
            Ver el perfil de {cita.profesional.nombre} →
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Su consulta</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        ¿Cómo le fue con {cita.profesional.nombre}?
      </h1>
      <p className="intro">
        Su opinión le sirve al siguiente paciente que esté decidiendo. Se publica
        después de una revisión y solo pueden dejarla quienes tuvieron cita.
      </p>

      <div style={{ marginTop: 20 }}>
        <FormularioOpinion
          slug={cita.profesional.slug}
          profesional={cita.profesional.nombre}
          token={cita.token}
          autorSugerido={cita.paciente.nombre ?? ""}
          abiertoDeInicio
        />
      </div>
    </main>
  );
}
