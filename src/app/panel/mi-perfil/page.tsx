import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Mi perfil",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * La puerta del médico a su propio perfil.
 *
 * El permiso para que cada quien edite lo suyo existía desde el principio,
 * pero no había ningún enlace que llevara al médico hasta ahí: tenía que
 * conocer la dirección de memoria. Esta página es esa puerta, y lleva a la
 * misma pantalla de edición de siempre.
 */
export default async function MiPerfil() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");

  if (sesion.profesionalId) {
    const suyo = await prisma.profesional.findUnique({
      where: { id: sesion.profesionalId },
      select: { slug: true },
    });
    if (suyo) redirect(`/panel/profesionales/${suyo.slug}`);
  }

  return (
    <main className="envoltura seccion">
      <p className="eyebrow">
        <Link href="/panel">Panel</Link> · Mi perfil
      </p>
      <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
        Su cuenta no está ligada a un perfil
      </h1>
      <div className="nota-umbral">
        Esta cuenta es del equipo del consultorio y no administra un perfil
        propio. Los perfiles de los médicos se administran desde{" "}
        <Link href="/panel" className="enlace-acento">
          el padrón del panel
        </Link>
        .
      </div>
    </main>
  );
}
