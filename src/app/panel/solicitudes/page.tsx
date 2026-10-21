import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { FilaSolicitud } from "@/componentes/FilaSolicitud";
import { ciudades, especialidades } from "@/lib/catalogo";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export const metadata: Metadata = {
  title: "Solicitudes de alta",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Las solicitudes de alta, con su pantalla propia.
 *
 * Esto es a donde lleva el aviso de «solicitud de alta» del panel, y es
 * la primera parada del médico que quiere entrar al directorio: aquí se
 * coteja su cédula y se decide si se publica. Antes la lista vivía
 * encajada al final del tablero, de modo que el aviso no tenía a dónde
 * llevar y quien revisaba tenía que pasar por encima de todo lo demás
 * para llegar a ella.
 *
 * Las ya resueltas se quedan abajo a propósito. Quien aprueba o rechaza
 * el alta de un colega necesita poder volver a ver qué decidió y cuándo,
 * sobre todo cuando quien pregunta es el propio interesado.
 */
export default async function Solicitudes() {
  const sesion = await sesionActual();
  if (!sesion) redirect("/panel/acceso");
  if (sesion.rol !== "ADMINISTRADOR" && sesion.rol !== "RECEPCION") redirect("/panel");

  const [pendientes, resueltas, listaCiudades, listaEspecialidades] =
    await Promise.all([
      prisma.solicitudAlta.findMany({
        where: { estado: { in: ["RECIBIDA", "EN_VERIFICACION"] } },
        orderBy: { creadaEn: "desc" },
        take: 60,
      }),
      prisma.solicitudAlta.findMany({
        where: { estado: { in: ["PUBLICADA", "RECHAZADA"] } },
        orderBy: { revisadaEn: "desc" },
        take: 25,
      }),
      ciudades(),
      especialidades(),
    ]);

  const nombreEspecialidad = (slug: string) =>
    listaEspecialidades.find((e) => e.slug === slug)?.nombre ?? slug;
  const nombreCiudad = (slug: string) =>
    listaCiudades.find((c) => c.slug === slug)?.nombre ?? slug;

  return (
    <main>
      <div className="envoltura migas">
        <Link href="/panel">Panel</Link> / Solicitudes de alta
      </div>

      <section className="envoltura seccion">
        <div className="seccion-cabeza">
          <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2rem)" }}>Solicitudes de alta</h1>
          <span>
            {pendientes.length === 1
              ? "1 por revisar"
              : `${pendientes.length} por revisar`}
          </span>
        </div>

        {pendientes.length > 0 ? (
          <div style={{ display: "grid", gap: 14 }}>
            {pendientes.map((s) => (
              <FilaSolicitud
                key={s.id}
                id={s.id}
                nombre={s.nombre}
                correo={s.correo}
                telefono={s.telefono}
                especialidad={nombreEspecialidad(s.especialidad)}
                ciudad={nombreCiudad(s.ciudadSlug)}
                cedula={s.cedula}
                consejo={s.consejo}
                consultorio={s.consultorio}
                estado={s.estado}
                puedeBorrar={sesion.rol === "ADMINISTRADOR"}
              />
            ))}
          </div>
        ) : (
          <div className="nota-umbral">
            No hay solicitudes esperando. Las que lleguen por{" "}
            <Link href="/alta">la página de alta</Link> aparecerán acá para
            cotejar la cédula y publicar el perfil.
          </div>
        )}
      </section>

      {resueltas.length > 0 ? (
        <section className="envoltura seccion">
          <div className="seccion-cabeza">
            <h2>Ya resueltas</h2>
            <span>las {resueltas.length} más recientes</span>
          </div>

          <div className="tabla">
            <div className="tabla-fila tabla-cabeza">
              <span>Profesional</span>
              <span>Especialidad</span>
              <span>Resultado</span>
              <span>Revisó</span>
            </div>
            {resueltas.map((s) => (
              <div className="tabla-fila" key={s.id}>
                <span>
                  {s.nombre}
                  <br />
                  <em className="meta">cédula {s.cedula}</em>
                </span>
                <span>
                  {nombreEspecialidad(s.especialidad)}
                  <br />
                  <em className="meta">{nombreCiudad(s.ciudadSlug)}</em>
                </span>
                <span>
                  <em
                    className={`pastilla ${
                      s.estado === "PUBLICADA" ? "pastilla-bien" : "pastilla-mal"
                    }`}
                  >
                    {s.estado === "PUBLICADA" ? "Publicada" : "Rechazada"}
                  </em>
                </span>
                <span className="meta">{s.revisadaPor ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
