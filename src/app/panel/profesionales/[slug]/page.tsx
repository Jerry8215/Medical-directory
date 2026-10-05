import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EditorProfesional } from "@/componentes/EditorProfesional";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Editar profesional",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export default async function EditarProfesional({ params }: Props) {
  const { slug } = await params;

  const [profesional, ciudades] = await Promise.all([
    prisma.profesional.findUnique({
      where: { slug },
      include: {
        consultorios: { include: { ciudad: true, franjas: { orderBy: { dia: "asc" } } } },
        verificaciones: true,
      },
    }),
    prisma.ciudad.findMany({ where: { activa: true }, orderBy: { orden: "asc" } }),
  ]);

  if (!profesional) notFound();

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Profesional
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          {profesional.nombre}
        </h1>
        <p className="intro">
          Lo que guarde acá es lo que lee el paciente y lo que ofrece la
          agenda.{" "}
          <Link href={`/medico/${slug}`} className="enlace-acento">
            Ver su perfil público
          </Link>
          .
        </p>
        <p className="meta" style={{ marginTop: 8 }}>
          Verificaciones:{" "}
          {profesional.verificaciones.length > 0
            ? profesional.verificaciones
                .map((v) => `${v.tipo.replace(/_/g, " ").toLowerCase()} (${v.estado.toLowerCase()})`)
                .join(" · ")
            : "sin credenciales registradas"}
        </p>
      </section>

      <section className="envoltura seccion">
        <EditorProfesional
          slug={slug}
          perfil={{
            nombre: profesional.nombre,
            semblanza: profesional.semblanza ?? "",
            convenios: profesional.convenios ?? "",
            correo: profesional.correo ?? "",
            telefono: profesional.telefono ?? "",
            avisoCorreo: profesional.avisoCorreo,
            avisoWhatsapp: profesional.avisoWhatsapp,
            publicado: profesional.estado === "PUBLICADO",
          }}
          consultorios={profesional.consultorios.map((c) => ({
            id: c.id,
            ciudadSlug: c.ciudad.slug,
            nombre: c.nombre,
            direccion: c.direccion,
            referencias: c.referencias ?? "",
            calendarioGoogleId: c.calendarioGoogleId ?? "",
            precioValoracion: c.precioValoracion ?? undefined,
            duracionCitaMin: c.duracionCitaMin,
            franjas: c.franjas.map((f) => ({ dia: f.dia, desde: f.desde, hasta: f.hasta })),
          }))}
          ciudades={ciudades.map((c) => ({ slug: c.slug, nombre: c.nombre }))}
          plan={profesional.plan}
          planHasta={profesional.planHasta ? profesional.planHasta.toISOString().slice(0, 10) : ""}
        />
      </section>
    </main>
  );
}
