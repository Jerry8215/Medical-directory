import type { Metadata } from "next";
import { Fraunces, Public_Sans } from "next/font/google";
import Link from "next/link";

import { sitio, urlAbsoluta } from "@/config/sitio";
import { ciudades } from "@/lib/catalogo";

import "./globals.css";

const titulo = Fraunces({
  variable: "--fuente-titulo",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

const texto = Public_Sans({
  variable: "--fuente-texto",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(urlAbsoluta("/")),
  title: {
    default: `${sitio.nombre} · Médicos verificados con cita en línea`,
    template: `%s · ${sitio.nombre}`,
  },
  description:
    "Directorio de médicos con cédula verificada en Delicias, Meoqui, Saucillo, Rosales y Camargo. Consulte horarios y precios reales, y agende su cita en línea.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const listaCiudades = await ciudades();
  return (
    <html lang="es" className={`${titulo.variable} ${texto.variable}`}>
      <body>
        <p className="aviso-borrador">
          Versión en construcción · avance del proyecto
        </p>

        <header className="barra">
          <div className="envoltura">
            <Link href="/" className="marca">
              <b>{sitio.nombre}</b>
              <span>Directorio verificado</span>
            </Link>
            <nav>
              {listaCiudades.map((c) => (
                <Link key={c.slug} href={`/${c.slug}`}>
                  {c.nombre}
                </Link>
              ))}
              <Link href="/alta" className="enlace-acento">
                Soy médico
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <footer className="pie">
          <div className="envoltura">
            <p>
              <strong>{sitio.nombre}</strong> {sitio.bajada}.
            </p>
            <p>
              Cada perfil publicado tiene su cédula profesional cotejada contra
              el Registro Nacional de Profesionistas.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
