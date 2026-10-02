import type { Metadata } from "next";
import Link from "next/link";

import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Términos de uso",
  description:
    "Qué es y qué no es la plataforma, qué se verifica de cada profesional y qué se espera de pacientes y médicos.",
  alternates: { canonical: "/terminos" },
};

/**
 * Términos de uso.
 *
 * Borrador para revisión del abogado del consultorio. Lo importante acá es
 * una frontera: la plataforma conecta y agenda, no atiende. Dejarlo escrito
 * protege al directorio y, sobre todo, evita que un paciente espere de este
 * sitio algo que no puede darle.
 */
export default function Terminos() {
  return (
    <main>
      <section className="envoltura" style={{ maxWidth: 760, paddingBlock: "44px 20px" }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.3rem)", marginBlock: "10px 12px" }}>
          Términos de uso
        </h1>
        <p className="intro">
          Qué hace {sitio.nombre}, qué verifica y qué se espera de quienes lo
          usan.
        </p>
      </section>

      <section className="envoltura seccion" style={{ maxWidth: 760 }}>
        <div className="ficha">
          <h2>Qué es esta plataforma</h2>
          <p style={{ color: "var(--suave)" }}>
            Un directorio que permite encontrar profesionales de la salud en la
            región y agendar consulta con ellos. La relación médico-paciente se
            establece entre usted y el profesional que elija; la plataforma no
            presta servicios médicos, no diagnostica, no receta y no interviene
            en el tratamiento.
          </p>
        </div>

        <div className="ficha">
          <h2>Qué verificamos</h2>
          <p style={{ color: "var(--suave)" }}>
            Antes de publicar un perfil cotejamos la cédula profesional contra
            el Registro Nacional de Profesionistas de la Secretaría de Educación
            Pública, y en el caso de los médicos registramos además la
            certificación del consejo de especialidad con su vigencia. Esa
            verificación se refiere a las credenciales declaradas, no a la
            calidad de la atención ni a los resultados de un tratamiento, que la
            plataforma no puede garantizar.
          </p>
        </div>

        <div className="ficha">
          <h2>Citas</h2>
          <ul className="lista-limpia" style={{ color: "var(--suave)" }}>
            <li>
              La disponibilidad proviene de la agenda de cada profesional, quien
              puede reprogramar o cancelar por causas propias de su consulta.
            </li>
            <li>
              El paciente puede cambiar o cancelar su cita desde el enlace que
              recibe. Avisar con tiempo libera el lugar para otro paciente.
            </li>
            <li>
              Los precios publicados corresponden a la valoración inicial y los
              fija cada profesional; cualquier otro costo se acuerda en consulta.
            </li>
          </ul>
        </div>

        <div className="ficha">
          <h2>Obligaciones de los profesionales</h2>
          <p style={{ color: "var(--suave)" }}>
            Quien aparece en el directorio se compromete a mantener vigentes sus
            credenciales, a publicar información veraz sobre sus consultorios,
            horarios y precios, y a atender o reprogramar las citas que reciba.
            Un perfil con datos falsos o con credenciales vencidas se suspende.
          </p>
        </div>

        <div className="ficha">
          <h2>Urgencias</h2>
          <p style={{ color: "var(--suave)" }}>
            Este sitio no atiende urgencias ni sustituye la atención médica
            inmediata. Ante un signo de alarma, acuda al servicio de urgencias
            más cercano.
          </p>
        </div>

        <div className="ficha">
          <h2>Opiniones</h2>
          <p style={{ color: "var(--suave)" }}>
            Las opiniones publicadas provienen de pacientes y se revisan antes
            de aparecer. No se publican las que contengan datos clínicos de una
            persona identificable, ofensas o afirmaciones sobre terceros.
          </p>
        </div>

        <p className="meta">
          Última actualización: octubre de 2026. Consulte también el{" "}
          <Link href="/privacidad" className="enlace-acento">
            aviso de privacidad
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
