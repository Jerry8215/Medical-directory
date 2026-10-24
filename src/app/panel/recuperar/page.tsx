import type { Metadata } from "next";
import Link from "next/link";

import { PedirRecuperacion } from "@/componentes/PedirRecuperacion";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Recuperar mi contraseña",
  robots: { index: false, follow: false },
};

export default function Recuperar() {
  return (
    <main>
      <section
        className="envoltura"
        style={{ maxWidth: 440, paddingBlock: "56px 40px" }}
      >
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: "1.8rem", marginBlock: "10px 8px" }}>
          Recuperar mi contraseña
        </h1>
        <p className="intro" style={{ marginBottom: 20 }}>
          Escriba el correo con el que entra a {sitio.nombre} y le mandamos un
          enlace para elegir una nueva. Su contraseña actual sigue funcionando
          hasta que la cambie.
        </p>

        <PedirRecuperacion />

        <p className="meta" style={{ marginTop: 16, textAlign: "center" }}>
          <Link href="/panel/acceso" className="enlace-acento">
            Volver a entrar
          </Link>
        </p>
      </section>
    </main>
  );
}
