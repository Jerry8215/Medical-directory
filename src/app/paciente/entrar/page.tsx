import type { Metadata } from "next";

import { EntrarPaciente } from "@/componentes/EntrarPaciente";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Entrar",
  robots: { index: false, follow: false },
};

export default function Entrar() {
  return (
    <main>
      <section
        className="envoltura"
        style={{ maxWidth: 440, paddingBlock: "56px 40px" }}
      >
        <p className="eyebrow">Pacientes</p>
        <h1 style={{ fontSize: "1.8rem", marginBlock: "10px 8px" }}>
          Entrar a {sitio.nombre}
        </h1>
        <p className="intro" style={{ marginBottom: 20 }}>
          Para abrir una consulta en línea y ver sus conversaciones. Es la
          misma pantalla la primera vez y todas las demás.
        </p>
        <EntrarPaciente />
      </section>
    </main>
  );
}
