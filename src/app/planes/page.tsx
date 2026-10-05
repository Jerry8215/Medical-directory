import type { Metadata } from "next";
import Link from "next/link";

import { sitio } from "@/config/sitio";
import { CAPACIDADES, DESCRIPCIONES, NOMBRES, type Plan } from "@/lib/planes";

export const metadata: Metadata = {
  title: "Planes para profesionales",
  description:
    "Aparezca en el directorio sin costo, o sume fotografía, contacto directo por WhatsApp y agenda en línea con los planes Gold y Premium.",
  alternates: { canonical: "/planes" },
};

const ORDEN: Plan[] = ["BASICO", "GOLD", "PREMIUM"];

/** Lo que cada plan agrega, dicho como lo entiende un médico. */
const INCLUYE: Record<Plan, string[]> = {
  BASICO: [
    "Su perfil con cédula profesional verificada",
    "Especialidad, ciudad y consultorio",
    "Su teléfono, para que el paciente lo llame",
    "Aparece en las búsquedas del directorio y de Google",
    "Opiniones de sus pacientes",
  ],
  GOLD: [
    "Todo lo del plan Básico",
    "Su fotografía en el perfil y en los listados",
    "Botón de WhatsApp: el paciente le escribe directo",
    "Perfil completo con padecimientos, convenios y precios",
    "Hasta dos consultorios",
    "Aparece antes que los perfiles básicos",
  ],
  PREMIUM: [
    "Todo lo del plan Gold",
    "Agenda en línea: el paciente elige horario y queda confirmado",
    "Recordatorio automático al paciente el día anterior",
    "Aviso a usted en cuanto alguien agenda",
    "Su propio acceso al panel para administrar su agenda",
    "Hasta cinco consultorios",
  ],
};

export default function Planes() {
  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "44px 8px" }}>
        <p className="eyebrow">Para profesionales de la salud</p>
        <h1 style={{ fontSize: "clamp(1.9rem, 4vw, 2.6rem)", marginBlock: "10px 12px" }}>
          Elija cómo quiere aparecer
        </h1>
        <p className="intro">
          Todos los perfiles de {sitio.nombre} llevan la cédula verificada: eso
          no se cobra ni se negocia. Lo que cambia entre un plan y otro son las
          herramientas que tiene para que el paciente llegue hasta su
          consultorio.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="rejilla" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {ORDEN.map((plan) => (
            <div
              className="tarjeta"
              key={plan}
              style={
                plan === "PREMIUM"
                  ? { borderColor: "var(--primario)", borderWidth: 2 }
                  : undefined
              }
            >
              <h3 style={{ fontSize: "1.3rem" }}>{NOMBRES[plan]}</h3>
              <p className="meta" style={{ marginTop: 6 }}>
                {DESCRIPCIONES[plan]}
              </p>

              <ul className="lista-limpia" style={{ marginTop: 14 }}>
                {INCLUYE[plan].map((linea) => (
                  <li key={linea}>
                    <svg width="14" height="14" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path
                        d="M2 6.2 4.6 8.8 10 3.4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {linea}
                  </li>
                ))}
              </ul>

              <p className="meta" style={{ marginTop: 14 }}>
                {CAPACIDADES[plan].consultorios === 1
                  ? "Un consultorio"
                  : `Hasta ${CAPACIDADES[plan].consultorios} consultorios`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="envoltura seccion">
        <div className="nota-umbral">
          Durante el lanzamiento, aparecer en el directorio no tiene costo. Si
          le interesa el Gold o el Premium, solicite su alta y el equipo del
          directorio le comparte las condiciones vigentes.
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href="/alta" className="boton-lleno" style={{ display: "inline-block", width: "auto" }}>
            Solicitar mi alta
          </Link>
        </p>
      </section>
    </main>
  );
}
