import type { Metadata } from "next";
import Link from "next/link";

import { SalaConsulta } from "@/componentes/SalaConsulta";
import {
  admiteMensajes,
  MINUTOS_PARA_ACEPTAR,
  minutosRestantes,
  situacion,
} from "@/lib/consulta-reglas";
import { pacienteActual } from "@/lib/paciente-acceso";
import { prisma } from "@/lib/prisma";
import { enHoraLocal } from "@/lib/panel-datos";
import { pesos } from "@/lib/suscripciones";

export const metadata: Metadata = {
  title: "Su consulta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

/**
 * La consulta desde el lado del paciente.
 *
 * El enlace es la llave: quien lo tiene entra a su sala, sin contraseña.
 * Aun así se comprueba la sesión cuando la hay, para que el nombre y el
 * historial sean los suyos y no los de quien le reenviaron el enlace.
 */
export default async function MiConsulta({ params }: Props) {
  const { token } = await params;

  const consulta = await prisma.consulta.findUnique({
    where: { token },
    include: {
      profesional: { select: { nombre: true, slug: true } },
      mensajes: { orderBy: { creadoEn: "asc" } },
    },
  });

  if (!consulta) {
    return (
      <main className="envoltura seccion" style={{ maxWidth: 680 }}>
        <h1>No encontramos esa consulta</h1>
        <div className="nota-umbral">
          El enlace no corresponde a ninguna consulta. Si lo copió de un
          mensaje, revise que esté completo.
        </div>
      </main>
    );
  }

  const paciente = await pacienteActual();
  const ahora = new Date();
  const donde = situacion(consulta, ahora);
  const quedan = minutosRestantes(consulta.cierraEn, ahora);

  return (
    <main className="envoltura seccion" style={{ maxWidth: 680 }}>
      <p className="eyebrow">Su consulta en línea</p>
      <h1 style={{ fontSize: "clamp(1.5rem, 4vw, 1.9rem)", marginBlock: "10px 6px" }}>
        {consulta.profesional.nombre}
      </h1>
      <p className="meta">
        Abierta el {enHoraLocal(consulta.creadaEn)} ·{" "}
        <Link href={`/medico/${consulta.profesional.slug}`} className="enlace-acento">
          Ver su perfil
        </Link>{" "}
        ·{" "}
        <Link href="/paciente" className="enlace-acento">
          Mis citas y consultas
        </Link>
      </p>

      {donde === "por-pagar" ? (
        <div className="nota-umbral" style={{ marginTop: 16 }}>
          Su consulta quedó registrada por {pesos(consulta.precio)}. En cuanto
          se confirme el pago, el médico recibe el aviso y tiene{" "}
          {MINUTOS_PARA_ACEPTAR} minutos para entrar. Guarde este enlace: es
          por donde va a conversar con él.
        </div>
      ) : null}

      {donde === "esperando-medico" ? (
        <div className="nota-umbral" style={{ marginTop: 16 }}>
          Ya avisamos a {consulta.profesional.nombre}. Si no entra dentro del
          plazo, se le devuelve el importe completo y le ofrecemos otro
          médico, sin que tenga que escribir todo de nuevo.
        </div>
      ) : null}

      {donde === "sin-respuesta" ? (
        <div className="nota-umbral" style={{ marginTop: 16 }}>
          {consulta.profesional.nombre} no alcanzó a entrar. Se le devuelve el
          importe completo. Si quiere, elija otro médico: su descripción se
          conserva.
        </div>
      ) : null}

      <section style={{ marginTop: 18 }}>
        <div className="ficha" style={{ padding: 16, marginBottom: 14 }}>
          <p className="rotulo">Lo que escribió al abrirla</p>
          <p style={{ whiteSpace: "pre-line" }}>{consulta.motivo}</p>
        </div>

        <SalaConsulta
          consultaId={consulta.id}
          quienSoy="PACIENTE"
          abierta={Boolean(paciente) && admiteMensajes(consulta, ahora)}
          minutosRestantes={quedan}
          avisoDeCierre={donde === "por-cerrar"}
          mensajes={consulta.mensajes.map((m) => ({
            id: m.id,
            autor: m.autor,
            texto: m.texto,
            cuando: enHoraLocal(m.creadoEn),
          }))}
        />

        {!paciente && admiteMensajes(consulta, ahora) ? (
          <div className="nota-umbral" style={{ marginTop: 12 }}>
            Para escribir, entre con su correo.{" "}
            <Link href="/paciente/entrar" className="enlace-acento">
              Entrar
            </Link>
          </div>
        ) : null}
      </section>

      {donde === "terminada" && consulta.estado === "CERRADA" ? (
        <p style={{ marginTop: 16 }}>
          <Link href={`/opinar/consulta/${consulta.token}`} className="boton-lleno">
            Dejar mi opinión
          </Link>
        </p>
      ) : null}
    </main>
  );
}
