import type { Metadata } from "next";
import Link from "next/link";

import { FormularioClave } from "@/componentes/FormularioClave";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Mi contraseña",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MiClave() {
  const sesion = await sesionActual();

  return (
    <main>
      <section className="envoltura" style={{ maxWidth: 480, paddingBlock: "44px 36px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Cuenta
        </p>
        <h1 style={{ fontSize: "1.7rem", marginBlock: "10px 8px" }}>Mi contraseña</h1>
        <p className="intro" style={{ marginBottom: 20 }}>
          Sesión de {sesion?.nombre ?? ""}. Si la contraseña se la entregaron
          por mensaje, conviene cambiarla ahora.
        </p>
        <FormularioClave />
      </section>
    </main>
  );
}
