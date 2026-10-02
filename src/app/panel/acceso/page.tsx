import type { Metadata } from "next";

import { FormularioAcceso } from "@/componentes/FormularioAcceso";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Entrar al panel",
  robots: { index: false, follow: false },
};

export default function Acceso() {
  return (
    <main>
      <section
        className="envoltura"
        style={{ maxWidth: 440, paddingBlock: "56px 40px" }}
      >
        <p className="eyebrow">Administración</p>
        <h1 style={{ fontSize: "1.8rem", marginBlock: "10px 8px" }}>
          Entrar al panel
        </h1>
        <p className="intro" style={{ marginBottom: 20 }}>
          Acceso para el equipo de {sitio.nombre}.
        </p>
        <FormularioAcceso />
      </section>
    </main>
  );
}
