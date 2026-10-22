import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MiPlan, type FichaDePlan } from "@/componentes/MiPlan";
import { CAPACIDADES, DESCRIPCIONES, NOMBRES, type Plan } from "@/lib/planes";
import { datosBancarios, precios } from "@/lib/precios";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import { hayCobroConTarjeta } from "@/lib/suscripcion-acciones";
import { importe, pesos } from "@/lib/suscripciones";

export const metadata: Metadata = {
  title: "Mi plan",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ORDEN: Plan[] = ["BASICO", "GOLD", "PREMIUM"];

/** Lo que cada plan agrega, dicho como lo entiende un médico. */
const INCLUYE: Record<Plan, string[]> = {
  BASICO: ["Su perfil con cédula verificada", "Su teléfono para que lo llamen"],
  GOLD: [
    "Su fotografía en el perfil y en los listados",
    "Botón de WhatsApp: el paciente le escribe directo",
    "Perfil completo con padecimientos y convenios",
    "Aparece antes que los perfiles básicos",
  ],
  PREMIUM: [
    "Todo lo del Gold",
    "Agenda en línea: el paciente elige su horario",
    "Recordatorio automático el día anterior",
    "Aviso en cuanto alguien agenda",
  ],
};

/**
 * El plan, desde el lado del médico.
 *
 * El plan solo se elegía al registrarse y solo lo movía el administrador.
 * Un médico en básico que quería su fotografía no tenía por dónde: la
 * única vía era pedirlo por teléfono, y una venta que depende de que el
 * cliente llame es una venta que casi nunca ocurre.
 */
export default async function MiPlanPagina({
  searchParams,
}: {
  searchParams: Promise<{ suscripcion?: string }>;
}) {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");
  if (!sesion.profesionalId) redirect("/panel");

  // De vuelta del procesador. El plan no se activa acá: lo activa el aviso
  // del procesador cuando el cobro entró. Decir «ya está» antes de eso
  // sería prometerle al médico algo que todavía puede fallar.
  const { suscripcion: deVuelta } = await searchParams;

  const [profesional, lista, banco, pendiente, hayTarjeta] = await Promise.all([
    prisma.profesional.findUnique({
      where: { id: sesion.profesionalId },
      select: {
        id: true,
        nombre: true,
        plan: true,
        planHasta: true,
        suscripcionEstado: true,
      },
    }),
    precios(),
    datosBancarios(),
    prisma.pago.findFirst({
      where: {
        profesionalId: sesion.profesionalId,
        estado: { in: ["PENDIENTE", "EN_REVISION"] },
      },
      orderBy: { creadoEn: "desc" },
    }),
    hayCobroConTarjeta(),
  ]);

  if (!profesional) redirect("/panel");

  const fichas: FichaDePlan[] = ORDEN.map((plan) => ({
    plan,
    nombre: NOMBRES[plan],
    descripcion: DESCRIPCIONES[plan],
    incluye: INCLUYE[plan],
    mensual:
      plan === "BASICO"
        ? "Sin costo"
        : `${pesos(importe(plan, "MENSUAL", lista))} al mes`,
    anual:
      plan === "BASICO"
        ? "Sin costo"
        : `${pesos(importe(plan, "ANUAL", lista))} al año`,
  }));

  return (
    <main>
      <div className="envoltura migas">
        <Link href="/panel/mi-perfil">Panel</Link> / Mi plan
      </div>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>Mi plan</h1>
        </div>
        <p className="intro" style={{ marginBottom: 18 }}>
          Su presencia en el directorio con la cédula verificada no depende del
          plan y no caduca. Lo que cambia son las herramientas que tiene para
          que el paciente llegue hasta su consultorio.
        </p>

        {deVuelta === "listo" ? (
          <div className="nota-umbral" style={{ marginBottom: 18 }}>
            Autorizó el cobro. El plan se enciende en cuanto el procesador
            confirme el pago, normalmente en un par de minutos; si al volver
            a cargar esta página todavía dice básico, dele un momento más.
          </div>
        ) : null}

        <MiPlan
          profesionalId={profesional.id}
          planActual={profesional.plan as Plan}
          vence={
            profesional.planHasta
              ? profesional.planHasta.toISOString().slice(0, 10)
              : null
          }
          fichas={fichas}
          datosBancarios={banco || null}
          hayTarjeta={hayTarjeta}
          suscripcion={profesional.suscripcionEstado}
          pago={
            pendiente
              ? {
                  id: pendiente.id,
                  plan: NOMBRES[pendiente.plan as Plan],
                  importe: pesos(pendiente.importe),
                  meses: pendiente.meses,
                  estado: pendiente.estado,
                  referencia: pendiente.referencia,
                  medio: pendiente.medio,
                }
              : null
          }
        />

        <p className="meta" style={{ marginTop: 18 }}>
          {hayTarjeta
            ? "Sin permanencia: el cobro automático se da de baja cuando quiera, y su tarjeta nunca pasa por este sitio. Al terminar el periodo el perfil vuelve al básico y nunca deja de aparecer en el directorio. "
            : "Sin permanencia y sin tarjeta guardada. Al terminar el periodo el perfil vuelve al básico y usted decide si continúa; nunca deja de aparecer en el directorio. "}
          {CAPACIDADES.PREMIUM.consultorios > 1
            ? `El Premium admite hasta ${CAPACIDADES.PREMIUM.consultorios} consultorios.`
            : null}
        </p>
      </section>
    </main>
  );
}
