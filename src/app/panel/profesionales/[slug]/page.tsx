import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DisponibleEnLinea } from "@/componentes/DisponibleEnLinea";
import { EditorProfesional } from "@/componentes/EditorProfesional";
import { InvitarAOpinar } from "@/componentes/InvitarAOpinar";
import { MetricasPerfil } from "@/componentes/MetricasPerfil";
import { SubirFoto } from "@/componentes/SubirFoto";
import { capacidades } from "@/lib/planes";
import { panoramaDelMes } from "@/lib/metricas-datos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

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

  // Un médico solo entra a su propio perfil. Las acciones de guardado ya
  // lo comprobaban, pero la página se dejaba ver, y con ella el correo y
  // el teléfono de un colega.
  const sesion = await sesionActual();
  const esEquipo = sesion?.rol === "ADMINISTRADOR" || sesion?.rol === "RECEPCION";
  if (!esEquipo && sesion?.profesionalId !== profesional.id) notFound();

  const panorama = await panoramaDelMes(profesional.id);

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
        <div className="seccion-cabeza">
          <h2>Su mes en el directorio</h2>
        </div>
        <MetricasPerfil
          panorama={panorama}
          puedeWhatsapp={capacidades(profesional.plan, profesional.planHasta).whatsapp}
          tieneFoto={Boolean(profesional.fotografia)}
        />
      </section>

      <section className="envoltura seccion">
        <DisponibleEnLinea
          slug={slug}
          enLinea={profesional.enLinea}
          precio={
            profesional.precioConsultaLinea
              ? profesional.precioConsultaLinea / 100
              : 0
          }
        />
      </section>

      <section className="envoltura seccion">
        <InvitarAOpinar profesionalId={profesional.id} profesional={profesional.nombre} />
      </section>

      <section className="envoltura seccion">
        <div className="ficha formulario">
          <h2>Fotografía</h2>
          <SubirFoto
            slug={slug}
            fotografia={profesional.fotografia}
            nombre={profesional.nombre}
            seVePublicada={
              capacidades(profesional.plan, profesional.planHasta).fotografia
            }
          />
        </div>
      </section>

      <section className="envoltura seccion">
        <EditorProfesional
          slug={slug}
          esAdministrador={sesion?.rol === "ADMINISTRADOR"}
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
