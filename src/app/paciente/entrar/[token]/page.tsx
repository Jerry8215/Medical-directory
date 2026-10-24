import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { entrarConEnlace } from "@/lib/paciente-acceso";

export const metadata: Metadata = {
  title: "Entrando",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/**
 * Canjear el enlace del correo por una sesión.
 *
 * Se resuelve en el servidor y se redirige: el paciente no tiene por qué
 * ver una pantalla intermedia con un botón que diga «continuar» para
 * algo que ya decidió al abrir el correo.
 */
export default async function EntrarConEnlace({ params }: Props) {
  const { token } = await params;
  const r = await entrarConEnlace(token);

  if (r.ok) redirect("/paciente");

  return (
    <main className="envoltura seccion" style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: "1.6rem", marginBlock: "10px 10px" }}>
        Ese enlace ya no sirve
      </h1>
      <div className="nota-umbral">{r.mensaje}</div>
      <p style={{ marginTop: 16 }}>
        <Link href="/paciente/entrar" className="boton-lleno">
          Pedir uno nuevo
        </Link>
      </p>
    </main>
  );
}
