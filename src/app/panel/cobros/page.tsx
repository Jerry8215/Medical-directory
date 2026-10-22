import type { Metadata } from "next";
import Link from "next/link";

import { AjustesCobro } from "@/componentes/AjustesCobro";
import { TablaCobros, type FilaPago } from "@/componentes/TablaCobros";
import { datosBancarios, precios } from "@/lib/precios";
import { exigirAdministrador } from "@/lib/guardia-panel";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";
import {
  diasRestantes,
  estadoSuscripcion,
  pesos,
} from "@/lib/suscripciones";

export const metadata: Metadata = {
  title: "Cobros",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FECHA = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * La caja del directorio: quién pagó, quién está por vencer y quién debe.
 *
 * Es la pantalla que responde la pregunta con la que el consultorio
 * empieza el mes, así que el dinero del mes va arriba y lo que exige una
 * decisión —un depósito por aprobar— va antes que la historia.
 */
export default async function Cobros() {
  const sesion = await exigirAdministrador();
  if (sesion?.rol !== "ADMINISTRADOR" && sesion?.rol !== "RECEPCION") {
    return (
      <main className="envoltura seccion">
        <h1>Cobros</h1>
        <div className="nota-umbral">
          Esta pantalla es del equipo del consultorio.
        </div>
      </main>
    );
  }

  const ahora = new Date();
  const inicioDeMes = new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1),
  );

  const [pagos, delMes, suscriptores, tarifa, banco] = await Promise.all([
    prisma.pago.findMany({
      orderBy: { creadoEn: "desc" },
      take: 80,
      include: { profesional: { select: { nombre: true } } },
    }),
    prisma.pago.aggregate({
      _sum: { importe: true },
      where: { estado: "ACREDITADO", revisadoEn: { gte: inicioDeMes } },
    }),
    prisma.profesional.findMany({
      where: { plan: { not: "BASICO" } },
      select: { id: true, slug: true, nombre: true, plan: true, planHasta: true },
      orderBy: { planHasta: "asc" },
    }),
    precios(),
    datosBancarios(),
  ]);

  const filas: FilaPago[] = pagos.map((p) => ({
    id: p.id,
    medico: p.profesional.nombre,
    plan: p.plan,
    importe: p.medio === "CORTESIA" ? "Cortesía" : pesos(p.importe),
    medio: p.medio,
    estado: p.estado,
    referencia: p.referencia,
    folio: p.folio,
    cuando: FECHA.format(p.creadoEn),
    vigencia: p.periodoHasta ? FECHA.format(p.periodoHasta) : null,
  }));

  const porVencer = suscriptores
    .map((s) => ({ ...s, situacion: estadoSuscripcion(s.plan, s.planHasta, ahora) }))
    .filter((s) => s.situacion === "POR_VENCER" || s.situacion === "VENCIDA");

  const enRevision = pagos.filter((p) => p.estado === "EN_REVISION").length;

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Cobros
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          Cobros de las suscripciones
        </h1>
        <p className="intro">
          Lo que entró este mes, lo que está por vencer y lo que falta aprobar.
          Un plan vencido nunca quita el perfil del directorio: solo le retira
          las herramientas.
        </p>
      </section>

      <section className="envoltura seccion">
        <div className="cifras">
          <div className="cifra">
            <b>{pesos(delMes._sum.importe ?? 0)}</b>
            <span>Acreditado este mes</span>
          </div>
          <div className="cifra">
            <b>{suscriptores.length}</b>
            <span>Perfiles con plan de pago</span>
          </div>
          <div className="cifra">
            <b>{enRevision}</b>
            <span>Depósitos por aprobar</span>
          </div>
          <div className="cifra">
            <b>{porVencer.length}</b>
            <span>Por vencer o vencidos</span>
          </div>
        </div>
      </section>

      {porVencer.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Por vencer y vencidos</h2>
          </div>
          <div className="tabla">
            <div className="tabla-fila tabla-cabeza">
              <span>Médico</span>
              <span>Plan</span>
              <span>Vence</span>
              <span>Situación</span>
            </div>
            {porVencer.map((s) => {
              const dias = diasRestantes(s.planHasta, ahora) ?? 0;
              return (
                <div className="tabla-fila" key={s.id}>
                  <span>
                    <Link href={`/panel/profesionales/${s.slug}`}>{s.nombre}</Link>
                  </span>
                  <span>{s.plan}</span>
                  <span className="meta">
                    {s.planHasta ? FECHA.format(s.planHasta) : "—"}
                  </span>
                  <span>
                    <em
                      className={`pastilla ${
                        s.situacion === "VENCIDA" ? "pastilla-mal" : "pastilla-espera"
                      }`}
                    >
                      {s.situacion === "VENCIDA"
                        ? `Venció hace ${Math.abs(dias)} día(s)`
                        : `Faltan ${dias} día(s)`}
                    </em>
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="envoltura seccion">
        <TablaCobros pagos={filas} />
      </section>

      {sesion.rol === "ADMINISTRADOR" ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Precios y datos de depósito</h2>
          </div>
          <p className="meta" style={{ marginBottom: 14 }}>
            Lo que se cobra por cada plan y a dónde deposita el médico. Cambiarlo
            aquí no requiere tocar el programa.
          </p>
          <AjustesCobro
            gold={tarifa.GOLD}
            premium={tarifa.PREMIUM}
            bancarios={banco}
          />
        </section>
      ) : null}
    </main>
  );
}
