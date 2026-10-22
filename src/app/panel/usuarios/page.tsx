import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PanelUsuarios } from "@/componentes/PanelUsuarios";
import { exigirAdministrador } from "@/lib/guardia-panel";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Accesos al panel",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function Usuarios() {
  const sesion = await exigirAdministrador();
  if (sesion.rol !== "ADMINISTRADOR") redirect("/panel");

  const cuentas = await prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { creadoEn: "asc" }],
    select: {
      id: true,
      nombre: true,
      correo: true,
      rol: true,
      activo: true,
      profesionalId: true,
    },
  });

  const yo = await prisma.usuario.findUnique({
    where: { id: sesion.id },
    select: { correo: true },
  });

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Accesos
        </p>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.1rem)", marginBlock: "10px 10px" }}>
          Quién entra al panel y hasta dónde
        </h1>
        <p className="intro">
          Recepción atiende el día a día: agendas, lista de espera, depósitos y
          solicitudes de datos personales. Administrador puede además tocar
          precios, catálogos, verificación de cédulas, planes y estos mismos
          accesos. Los accesos de los médicos no aparecen aquí: cada uno cuelga
          de su perfil.
        </p>
      </section>

      <section className="envoltura seccion">
        <PanelUsuarios
          cuentas={cuentas.map((c) => ({
            id: c.id,
            nombre: c.nombre,
            correo: c.correo,
            rol: c.rol,
            activo: c.activo,
            esMedico: Boolean(c.profesionalId),
          }))}
          yo={yo?.correo ?? ""}
        />
      </section>
    </main>
  );
}
