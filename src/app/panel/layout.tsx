import { BotonSalir } from "@/componentes/BotonSalir";
import { RailDelPanel } from "@/componentes/RailDelPanel";
import { enlacesDelPanel } from "@/lib/navegacion-panel";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const dynamic = "force-dynamic";

const ROLES: Record<string, string> = {
  ADMINISTRADOR: "Administrador",
  RECEPCION: "Recepción",
  PROFESIONAL: "Profesional",
};

/**
 * El armazón del panel.
 *
 * Todas las pantallas comparten rail, de modo que la navegación se
 * escribe una vez y ninguna se queda sin ella. La de acceso no tiene
 * sesión y por eso cae de largo: un rail de secciones para quien todavía
 * no entró no sirve de nada.
 */
export default async function ArmazonDelPanel({
  children,
}: {
  children: React.ReactNode;
}) {
  const sesion = await sesionActual();
  if (!sesion) return <>{children}</>;

  const pendientes =
    sesion.rol === "ADMINISTRADOR" || sesion.rol === "RECEPCION"
      ? await prisma.solicitudAlta.count({
          where: { estado: { in: ["RECIBIDA", "EN_VERIFICACION"] } },
        })
      : 0;

  return (
    <div className="panel-armazon envoltura">
      <aside className="panel-lado">
        <RailDelPanel
          enlaces={enlacesDelPanel(sesion.rol, Boolean(sesion.profesionalId))}
          nombre={sesion.nombre}
          rol={ROLES[sesion.rol] ?? sesion.rol}
          pendientes={pendientes}
        />
        <div className="rail-pie">
          <BotonSalir />
        </div>
      </aside>

      <div className="panel-contenido">{children}</div>
    </div>
  );
}
