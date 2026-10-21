import { BotonSalir } from "@/componentes/BotonSalir";
import { RailDelPanel } from "@/componentes/RailDelPanel";
import Link from "next/link";

import { Llave } from "@/componentes/Iconos";
import { enlacesDelPanel, esEquipo } from "@/lib/navegacion-panel";
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
          enlaces={enlacesDelPanel(sesion.rol)}
          nombre={sesion.nombre}
          rol={ROLES[sesion.rol] ?? sesion.rol}
          pendientes={pendientes}
          pie={
            <>
              {/* La contraseña es de la cuenta, no una sección de gestión:
                  queda a mano sin ocupar un lugar en el menú. */}
              {esEquipo(sesion.rol) ? (
                <Link href="/panel/mi-clave" className="rail-enlace rail-cuenta">
                  <span className="rail-icono" aria-hidden="true">
                    <Llave size={17} />
                  </span>
                  Contraseña
                </Link>
              ) : null}
              <BotonSalir />
            </>
          }
        />
      </aside>

      <div className="panel-contenido">{children}</div>
    </div>
  );
}
