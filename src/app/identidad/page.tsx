import type { Metadata } from "next";

import { DIRECCIONES } from "@/componentes/Logotipos";
import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Propuestas de identidad",
  description:
    "Tres direcciones de identidad para el directorio, aplicadas al sitio.",
  robots: { index: false, follow: false },
};

/**
 * Las tres propuestas, cada una aplicada a la barra del sitio y a una
 * tarjeta de médico. Verlas en su contexto evita la discusión estéril
 * sobre un logotipo flotando en una lámina blanca.
 */
export default function Identidad() {
  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "40px 8px" }}>
        <p className="eyebrow">Para elegir</p>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", marginBlock: "10px 12px" }}>
          Tres direcciones de identidad
        </h1>
        <p className="intro">
          El nombre {sitio.nombre} es descriptivo, de modo que la marca se
          sostiene en el símbolo y en la tipografía. Cada propuesta está
          aplicada a la barra del sitio y a una ficha de médico, que es donde
          el logotipo va a vivir de verdad. Dígame cuál prefiere y le entrego
          los archivos vectoriales, el favicon y la versión para sus recetas y
          su papelería.
        </p>
      </section>

      {DIRECCIONES.map((d, i) => (
        <section key={d.id} className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>
              Propuesta {i + 1} · {d.nombre}
            </h2>
            <span>{d.idea}</span>
          </div>

          <div
            style={{
              border: "1px solid var(--borde)",
              borderRadius: "var(--radio)",
              overflow: "hidden",
              boxShadow: "var(--sombra)",
              background: "var(--papel)",
            }}
          >
            {/* la barra, como se vería en el sitio */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "16px 20px",
                background: d.paleta.tenue,
                borderBottom: `1px solid ${d.paleta.primario}22`,
              }}
            >
              <d.Marca size={38} color={d.paleta.primario} />
              <div>
                <strong
                  style={{
                    display: "block",
                    color: d.paleta.tinta,
                    fontSize: "1.2rem",
                    lineHeight: 1.15,
                    fontFamily:
                      d.tipografia === "serif"
                        ? "var(--fuente-titulo), Georgia, serif"
                        : "var(--fuente-texto), sans-serif",
                    fontWeight: 700,
                    letterSpacing: d.tipografia === "sans" ? "-0.02em" : "-0.01em",
                  }}
                >
                  {sitio.nombre}
                </strong>
                <span
                  style={{
                    fontSize: ".68rem",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: d.paleta.primario,
                    fontWeight: 600,
                  }}
                >
                  Directorio verificado
                </span>
              </div>
            </div>

            {/* una ficha, con los colores de la propuesta */}
            <div style={{ display: "grid", gap: 16, padding: 20 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  gap: 14,
                  alignItems: "start",
                  border: "1px solid var(--borde)",
                  borderRadius: 14,
                  padding: 18,
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: d.paleta.tenue,
                    color: d.paleta.primario,
                    fontFamily: "var(--fuente-titulo), Georgia, serif",
                    fontWeight: 700,
                  }}
                >
                  JP
                </div>
                <div>
                  <h3 style={{ color: "var(--tinta)" }}>Dr. José Guadalupe Padilla</h3>
                  <p style={{ color: d.paleta.primario, fontWeight: 600, fontSize: ".86rem" }}>
                    Cirugía General y Laparoscópica
                  </p>
                  <p className="meta">Hospital Vistas del Sol · valoración $800</p>
                  <span
                    style={{
                      display: "inline-block",
                      marginTop: 8,
                      background: d.paleta.tenue,
                      color: d.paleta.primario,
                      fontSize: ".72rem",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                    }}
                  >
                    Cédula verificada
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    background: d.paleta.primario,
                    color: "#fff",
                    padding: "10px 18px",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: ".92rem",
                  }}
                >
                  Agendar cita
                </span>
                <span
                  style={{
                    border: `1px solid ${d.paleta.acento}`,
                    color: d.paleta.acento,
                    padding: "10px 18px",
                    borderRadius: 999,
                    fontWeight: 600,
                    fontSize: ".92rem",
                  }}
                >
                  Soy médico
                </span>
              </div>

              {/* el símbolo solo, como lo verá en la pestaña y en WhatsApp */}
              <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                {[48, 32, 20].map((t) => (
                  <span
                    key={t}
                    style={{
                      width: t + 14,
                      height: t + 14,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: d.paleta.primario,
                    }}
                  >
                    <d.Marca size={t} color="#ffffff" />
                  </span>
                ))}
                <span className="meta">Reducciones: aplicación, pestaña y perfil.</span>
              </div>
            </div>
          </div>

          <p className="intro" style={{ marginTop: 14 }}>
            {d.razon}
          </p>
        </section>
      ))}
    </main>
  );
}
