import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BandejaConsultas } from "@/componentes/BandejaConsultas";
import {
  MINUTOS_PARA_ACEPTAR,
  minutosRestantes,
  situacion,
  venceLaEsperaEn,
} from "@/lib/consulta-reglas";
import { enHoraLocal } from "@/lib/panel-datos";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { pesos } from "@/lib/suscripciones";

export const metadata: Metadata = {
  title: "Consultas en línea",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Las que esperan van primero: son las que tienen un reloj corriendo. */
const ORDEN: Record<string, number> = {
  "esperando-medico": 0,
  "por-cerrar": 1,
  abierta: 2,
  "por-pagar": 3,
  "se-acabo": 4,
  "sin-respuesta": 5,
  terminada: 6,
};

export default async function Consultas() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");

  const esEquipo = sesion.rol === "ADMINISTRADOR" || sesion.rol === "RECEPCION";

  const consultas = await prisma.consulta.findMany({
    where: esEquipo ? {} : { profesionalId: sesion.profesionalId ?? "" },
    orderBy: { creadaEn: "desc" },
    include: {
      paciente: { select: { nombre: true, telefono: true } },
      profesional: { select: { nombre: true } },
      mensajes: { orderBy: { creadoEn: "asc" } },
    },
    take: 60,
  });

  const ahora = new Date();

  const lista = consultas
    .map((c) => {
      const donde = situacion(c, ahora);
      return {
        id: c.id,
        paciente: c.paciente.nombre ?? "Un paciente",
        telefono: c.paciente.telefono,
        motivo: c.motivo,
        cuando: enHoraLocal(c.creadaEn),
        precio: c.precio > 0 ? pesos(c.precio) : "Sin costo",
        situacion: donde,
        minutosRestantes:
          donde === "esperando-medico"
            ? minutosRestantes(venceLaEsperaEn(c.creadaEn), ahora)
            : minutosRestantes(c.cierraEn, ahora),
        mensajes: c.mensajes.map((m) => ({
          id: m.id,
          autor: m.autor,
          texto: m.texto,
          cuando: enHoraLocal(m.creadoEn),
        })),
      };
    })
    .sort((a, b) => (ORDEN[a.situacion] ?? 9) - (ORDEN[b.situacion] ?? 9));

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Consultas en línea
        </p>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.1rem)", marginBlock: "10px 10px" }}>
          Consultas en línea
        </h1>
        <p className="intro">
          El paciente paga antes de que la sala se abra. Usted tiene{" "}
          {MINUTOS_PARA_ACEPTAR} minutos para aceptar; si no, se le devuelve el
          importe y se le ofrece a otro médico. La sala dura dos horas desde
          que entra, y al cerrarse se le pide su opinión al paciente.
        </p>
      </section>

      <section className="envoltura seccion">
        <BandejaConsultas consultas={lista} puedeAbrirSinCobro={esEquipo} />
      </section>
    </main>
  );
}
