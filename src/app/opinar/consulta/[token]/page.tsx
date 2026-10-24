import type { Metadata } from "next";
import Link from "next/link";

import { FormularioOpinion } from "@/componentes/FormularioOpinion";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Dejar su opinión",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/**
 * La opinión que nace de una consulta en línea.
 *
 * Es la procedencia más firme de las tres: aquí el sistema no tiene solo
 * el registro de que hubo una consulta, tiene la conversación entera. Y
 * es la que hace que las reseñas dejen de ser algo que hay que
 * perseguir, porque llega sola al cerrarse la sala.
 */
export default async function OpinarDeConsulta({ params }: Props) {
  const { token } = await params;

  const consulta = await prisma.consulta.findUnique({
    where: { token },
    include: {
      profesional: { select: { slug: true, nombre: true } },
      paciente: { select: { nombre: true } },
      opinion: { select: { id: true } },
    },
  });

  if (!consulta) {
    return (
      <main className="envoltura seccion">
        <h1>No encontramos esa consulta</h1>
        <div className="nota-umbral">
          El enlace no corresponde a ninguna consulta. Si lo copió de un
          mensaje, revise que esté completo.
        </div>
      </main>
    );
  }

  if (consulta.estado !== "CERRADA") {
    return (
      <main className="envoltura seccion">
        <h1>Su consulta todavía no termina</h1>
        <div className="nota-umbral">
          Guarde este enlace: en cuanto la sala cierre podrá dejar su
          opinión aquí mismo.
        </div>
        <p style={{ marginTop: 14 }}>
          <Link href={`/consulta/${token}`} className="enlace-acento">
            Volver a mi consulta →
          </Link>
        </p>
      </main>
    );
  }

  if (consulta.opinion) {
    return (
      <main className="envoltura seccion">
        <h1>Ya dejó su opinión</h1>
        <div className="nota-umbral">
          Gracias por tomarse el tiempo. Su opinión sobre{" "}
          {consulta.profesional.nombre} ya está registrada y se publica una
          vez revisada.
        </div>
      </main>
    );
  }

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Su consulta en línea</p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        ¿Cómo le fue con {consulta.profesional.nombre}?
      </h1>
      <p className="intro">
        Su opinión le sirve al siguiente paciente que esté decidiendo. Se
        publica después de una revisión.
      </p>

      <div style={{ marginTop: 20 }}>
        <FormularioOpinion
          slug={consulta.profesional.slug}
          profesional={consulta.profesional.nombre}
          consulta={token}
          autorSugerido={consulta.paciente.nombre ?? ""}
          abiertoDeInicio
        />
      </div>
    </main>
  );
}
