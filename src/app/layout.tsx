import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Image from "next/image";
import Link from "next/link";

import { Asistente } from "@/componentes/Asistente";
import { Calendario } from "@/componentes/Iconos";
import { sitio, urlAbsoluta } from "@/config/sitio";
import { ciudades, especialidades } from "@/lib/catalogo";

import "./globals.css";

const inter = Inter({
  variable: "--fuente",
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
    "Directorio de médicos con cédula verificada en Delicias, Meoqui, Saucillo, Rosales y Camargo. Compare perfiles, consulte horarios y precios, y agende su cita en línea.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [listaCiudades, listaEspecialidades] = await Promise.all([
    ciudades(),
    especialidades(),
  ]);

  return (
    <html lang="es" className={inter.variable}>
      <body>
        <p className="aviso-borrador">Versión en construcción · avance del proyecto</p>

        <header className="barra">
          <div className="envoltura">
            <Link href="/" className="marca" aria-label={`${sitio.nombre}, inicio`}>
              <Image
                src="/logotipo.png"
                alt={sitio.nombre}
                width={960}
                height={406}
                priority
              />
            </Link>

            <nav>
              <Link href="/" className="oculta-movil">
                Inicio
              </Link>
              <Link href="/delicias" className="oculta-movil">
                Especialidades
              </Link>
              <Link href="/delicias" className="oculta-movil">
                Médicos
              </Link>
              <Link href="/planes">¿Eres médico?</Link>
              <Link href="/delicias" className="boton-lleno">
                <Calendario size={17} />
                Agendar cita
              </Link>
            </nav>
          </div>
        </header>

        {children}

        <Asistente />

        <footer className="pie">
          <div className="envoltura">
            <div className="columnas">
              <div>
                <div className="marca-pie">
                  <Image
                    src="/logotipo-claro.png"
                    alt={sitio.nombre}
                    width={960}
                    height={406}
                    style={{ height: 44, width: "auto" }}
                  />
                </div>
                <p style={{ marginTop: 12, maxWidth: "34ch" }}>
                  Profesionales con cédula verificada en la región centro-sur de
                  Chihuahua. Compare perfiles, consulte horarios y agende en
                  línea.
                </p>
              </div>

              <div>
                <h3>Ciudades</h3>
                {listaCiudades.map((c) => (
                  <Link key={c.slug} href={`/${c.slug}`}>
                    {c.nombre}
                  </Link>
                ))}
              </div>

              <div>
                <h3>Especialidades</h3>
                {listaEspecialidades.slice(0, 6).map((e) => (
                  <Link key={e.slug} href={`/delicias/${e.slug}`}>
                    {e.nombre}
                  </Link>
                ))}
              </div>

              <div>
                <h3>Para médicos</h3>
                <Link href="/planes">Planes</Link>
                <Link href="/alta">Aparecer en el directorio</Link>
                <Link href="/panel">Entrar al panel</Link>
              </div>
            </div>

            <div className="legal">
              <span>
                © {new Date().getFullYear()} {sitio.nombre}. Todos los derechos
                reservados.
              </span>
              <span>
                <Link href="/privacidad">Aviso de privacidad</Link> ·{" "}
                <Link href="/terminos">Términos de uso</Link>
              </span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
