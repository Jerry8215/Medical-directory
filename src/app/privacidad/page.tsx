import type { Metadata } from "next";

import { sitio } from "@/config/sitio";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description:
    "Qué datos recaba la plataforma, para qué se usan, con quién se comparten y cómo solicitar su eliminación.",
  alternates: { canonical: "/privacidad" },
};

/**
 * Aviso de privacidad.
 *
 * Borrador para revisión del abogado del consultorio antes de publicar el
 * sitio. Está escrito para que lo entienda un paciente, no para cubrir al
 * desarrollador: la ley pide informar, y un texto que nadie puede leer no
 * informa.
 */
export default function Privacidad() {
  return (
    <main>
      <section className="envoltura" style={{ maxWidth: 760, paddingBlock: "44px 20px" }}>
        <p className="eyebrow">Legal</p>
        <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.3rem)", marginBlock: "10px 12px" }}>
          Aviso de privacidad
        </h1>
        <p className="intro">
          Qué guardamos cuando usted usa {sitio.nombre}, para qué, con quién se
          comparte y cómo pedir que lo borremos.
        </p>
      </section>

      <section className="envoltura seccion" style={{ maxWidth: 760 }}>
        <div className="ficha">
          <h2>Quién es responsable</h2>
          <p style={{ color: "var(--suave)" }}>
            {sitio.nombre} es un directorio de profesionales de la salud de la
            región centro-sur de Chihuahua. El responsable del tratamiento de
            sus datos es el titular de la plataforma, conforme a la Ley Federal
            de Protección de Datos Personales en Posesión de los Particulares.
            Cada médico es, a su vez, responsable de la información clínica que
            genera en su consulta, que no pasa por esta plataforma.
          </p>
        </div>

        <div className="ficha">
          <h2>Qué datos recabamos</h2>
          <ul className="lista-limpia" style={{ color: "var(--suave)" }}>
            <li>De un paciente que agenda: su nombre, su teléfono y, si lo deja, su correo.</li>
            <li>La cita que agenda: con qué médico, en qué consultorio, qué día y a qué hora.</li>
            <li>Lo que escribe en el asistente del sitio, para poder responderle.</li>
            <li>
              De un profesional que solicita su alta: nombre, cédula, especialidad,
              consultorios, horarios, precios y datos de contacto.
            </li>
          </ul>
          <p style={{ color: "var(--suave)", marginTop: 10 }}>
            No pedimos diagnósticos, estudios ni antecedentes clínicos. Si usted
            los escribe por su cuenta en el asistente, quedan en esa conversación
            y le pedimos no hacerlo: ese no es el lugar para su información
            clínica.
          </p>
        </div>

        <div className="ficha">
          <h2>Para qué los usamos</h2>
          <ul className="lista-limpia" style={{ color: "var(--suave)" }}>
            <li>Agendar su cita y avisar al médico que usted la solicitó.</li>
            <li>Enviarle la confirmación y el recordatorio del día anterior.</li>
            <li>Permitirle cambiar o cancelar su cita desde el enlace que recibe.</li>
            <li>Verificar la cédula de los profesionales antes de publicar su perfil.</li>
          </ul>
          <p style={{ color: "var(--suave)", marginTop: 10 }}>
            No vendemos su información, no la usamos para publicidad de terceros
            y no tomamos decisiones clínicas automatizadas.
          </p>
        </div>

        <div className="ficha">
          <h2>Con quién se comparte</h2>
          <p style={{ color: "var(--suave)" }}>
            Con el médico con el que usted agenda, que necesita saber quién
            viene y cuándo. Además, para poder operar, la plataforma se apoya en
            proveedores que procesan datos por nuestra cuenta y bajo obligación
            de confidencialidad: el alojamiento del sitio, la base de datos, el
            servicio de correo y, cuando esté activo, el proveedor del modelo de
            lenguaje que redacta las respuestas del asistente. Cuando la ley o
            una autoridad competente lo exija, la información se entregará en los
            términos que corresponda.
          </p>
        </div>

        <div className="ficha" id="eliminacion">
          <h2>Cómo acceder, corregir o eliminar sus datos</h2>
          <p style={{ color: "var(--suave)" }}>
            Puede cancelar su cita en cualquier momento desde el enlace que
            recibió, sin crear ninguna cuenta. Para solicitar el acceso, la
            rectificación, la cancelación de sus datos o la oposición a su
            tratamiento, escriba al correo de contacto de la plataforma
            indicando su nombre y el teléfono con el que agendó. Atendemos su
            solicitud en un plazo máximo de veinte días hábiles.
          </p>
          <p style={{ color: "var(--suave)", marginTop: 10 }}>
            Conservamos sus datos mientras exista una relación de atención y por
            el plazo que la normatividad aplicable exija. Después se eliminan o
            se anonimizan.
          </p>
        </div>

        <div className="ficha">
          <h2>Este sitio no atiende urgencias</h2>
          <p style={{ color: "var(--suave)" }}>
            {sitio.nombre} sirve para encontrar médico y agendar consulta. No
            sustituye la atención médica. Si presenta dolor intenso, fiebre alta,
            sangrado, dificultad para respirar o cualquier otro signo de alarma,
            acuda al servicio de urgencias más cercano sin esperar.
          </p>
        </div>

        <p className="meta">
          Cualquier modificación a este aviso se publicará en esta misma
          dirección. Última actualización: octubre de 2026.
        </p>
      </section>
    </main>
  );
}
