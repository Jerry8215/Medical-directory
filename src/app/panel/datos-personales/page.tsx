import type { Metadata } from "next";
import Link from "next/link";

import { AtencionArco } from "@/componentes/AtencionArco";
import { PLAZO_DIAS_HABILES } from "@/lib/arco";
import { exigirEquipo } from "@/lib/guardia-panel";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Datos personales",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const FECHA = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const NOMBRES: Record<string, string> = {
  "arco.acceso": "Acceso",
  "arco.rectificacion": "Rectificación",
  "arco.cancelacion": "Cancelación",
  "arco.oposicion": "Oposición",
  "arco.oposicion.retirada": "Oposición retirada",
};

/**
 * Atención de solicitudes sobre datos personales.
 *
 * Además de resolverlas, esta pantalla deja constancia: la ley no pregunta
 * si se atendió, pregunta si se puede demostrar. Por eso abajo va el
 * registro de lo que se ha hecho, con fecha y responsable.
 */
export default async function DatosPersonales() {
  const sesion = await exigirEquipo();
  if (sesion?.rol !== "ADMINISTRADOR" && sesion?.rol !== "RECEPCION") {
    return (
      <main className="envoltura seccion">
        <h1>Datos personales</h1>
        <div className="nota-umbral">Esta pantalla es del equipo del consultorio.</div>
      </main>
    );
  }

  const registro = await prisma.registroAuditoria.findMany({
    where: { accion: { startsWith: "arco." } },
    orderBy: { cuando: "desc" },
    take: 40,
  });

  return (
    <main>
      <section className="envoltura" style={{ paddingBlock: "36px 4px" }}>
        <p className="eyebrow">
          <Link href="/panel">Panel</Link> · Datos personales
        </p>
        <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2rem)", marginBlock: "10px 10px" }}>
          Solicitudes sobre datos personales
        </h1>
        <p className="intro">
          Si un paciente pide ver, corregir o borrar lo que el sitio guarda de
          él, se atiende desde aquí. El aviso de privacidad compromete una
          respuesta en un máximo de {PLAZO_DIAS_HABILES} días hábiles.
        </p>
      </section>

      <section className="envoltura seccion">
        <AtencionArco />
      </section>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h2>Constancia de lo atendido</h2>
          <span>{registro.length}</span>
        </div>
        <p className="meta" style={{ marginBottom: 12 }}>
          La ley no pregunta si se atendió la solicitud, pregunta si puede
          demostrarse. Esto es esa prueba.
        </p>

        <div className="tabla">
          <div className="tabla-fila tabla-cabeza">
            <span>Cuándo</span>
            <span>Derecho</span>
            <span>Quién lo atendió</span>
            <span>Detalle</span>
          </div>
          {registro.map((r) => (
            <div className="tabla-fila" key={r.id}>
              <span className="meta">{FECHA.format(r.cuando)}</span>
              <span>{NOMBRES[r.accion] ?? r.accion}</span>
              <span className="meta">{r.actor}</span>
              <span className="meta">{r.detalle ?? "—"}</span>
            </div>
          ))}
          {registro.length === 0 ? (
            <div className="tabla-fila">
              <span style={{ gridColumn: "1 / -1" }} className="meta">
                Todavía no se ha atendido ninguna solicitud.
              </span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
