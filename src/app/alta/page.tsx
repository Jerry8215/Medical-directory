import type { Metadata } from "next";

import { FormularioAlta } from "@/componentes/FormularioAlta";
import { sitio } from "@/config/sitio";
import { ciudades, especialidades } from "@/lib/catalogo";

export const metadata: Metadata = {
  title: "Aparezca en el directorio",
  description:
    "Solicite su alta como profesional de la salud. Revisamos su cédula a mano en el Registro Nacional de Profesionistas y publicamos su perfil con agenda en línea.",
  alternates: { canonical: "/alta" },
};

export default async function Alta() {
  const [listaEspecialidades, listaCiudades] = await Promise.all([
    especialidades(),
    ciudades(),
  ]);
  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "40px 8px" }}>
        <p className="eyebrow">Para profesionales de la salud</p>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.5rem)", marginBlock: "10px 12px" }}>
          Aparezca en {sitio.nombre}
        </h1>
        <p className="intro">
          Publicar su perfil no tiene costo durante el lanzamiento. Lo que sí
          revisamos es su cédula: en este directorio solo aparecen profesionales
          verificados, y eso es lo que hace que el paciente confíe en lo que lee.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="rejilla" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          <div className="tarjeta">
            <h3>1 · Envía su solicitud</h3>
            <p className="meta">
              Tarda dos minutos. Solo necesita su cédula y la ciudad donde
              atiende.
            </p>
          </div>
          <div className="tarjeta">
            <h3>2 · Verificamos</h3>
            <p className="meta">
              Una persona del consultorio consulta su cédula en el Registro
              Nacional de Profesionistas y revisa, si es médico, su
              certificación de consejo. Es un paso manual: normalmente el
              mismo día hábil.
            </p>
          </div>
          <div className="tarjeta">
            <h3>3 · Se publica su perfil</h3>
            <p className="meta">
              Con sus consultorios, horarios y precios, y su agenda en línea para
              que el paciente reserve directamente.
            </p>
          </div>
        </div>
      </section>

      <section className="envoltura seccion" style={{ maxWidth: 760 }}>
        <FormularioAlta
          especialidades={listaEspecialidades.map((e) => ({
            slug: e.slug,
            nombre: e.nombre,
          }))}
          ciudades={listaCiudades.map((c) => ({ slug: c.slug, nombre: c.nombre }))}
        />
      </section>
    </main>
  );
}
