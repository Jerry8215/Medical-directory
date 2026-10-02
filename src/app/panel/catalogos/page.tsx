import type { Metadata } from "next";
import Link from "next/link";

import { PanelCatalogos } from "@/componentes/PanelCatalogos";
import { umbral } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Catálogos",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Catalogos() {
  const [ciudades, especialidades, profesiones, umbralGeneral] = await Promise.all([
    prisma.ciudad.findMany({
      orderBy: { orden: "asc" },
      include: { _count: { select: { consultorios: true } } },
    }),
    prisma.especialidad.findMany({
      orderBy: { orden: "asc" },
      include: { _count: { select: { padecimientos: true } } },
    }),
    prisma.profesion.findMany({ orderBy: { nombre: "asc" } }),
    umbral(),
  ]);

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Catálogos
        </p>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.1rem)", marginBlock: "10px 10px" }}>
          Ciudades, especialidades y padecimientos
        </h1>
        <p className="intro">
          Todo lo que define la estructura del sitio se administra desde acá.
          Cada entrada nueva genera su propia página, su dirección y su entrada
          en el mapa del sitio, y se publica sola al reunir el mínimo de
          profesionales.
        </p>
      </section>

      <section className="envoltura seccion">
        <PanelCatalogos
          ciudades={ciudades.map((c) => ({
            slug: c.slug,
            nombre: c.nombre,
            umbral: c.umbralMinimo,
            activa: c.activa,
            profesionales: c._count.consultorios,
          }))}
          especialidades={especialidades.map((e) => ({
            slug: e.slug,
            nombre: e.nombre,
            padecimientos: e._count.padecimientos,
          }))}
          profesiones={profesiones.map((p) => ({
            slug: p.slug,
            nombre: p.nombre,
            exigeConsejo: p.exigeConsejo,
          }))}
          umbralGeneral={umbralGeneral}
        />
      </section>
    </main>
  );
}
