"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Lupa } from "@/componentes/Iconos";
import {
  eliminarProfesional,
  suspenderProfesional,
} from "@/lib/profesionales-admin";

export type FilaProfesional = {
  slug: string;
  nombre: string;
  especialidad: string;
  especialidadSlug: string;
  ciudades: string;
  plan: string;
  publicado: boolean;
  verificado: boolean;
  citas: number;
};

/**
 * El padrón, con buscador y filtros.
 *
 * Con cinco médicos una lista alcanza; con cincuenta hay que poder llegar a
 * uno sin leerlos todos, que fue lo que pidió el consultorio. Se filtra en
 * el navegador porque la lista ya viene completa: responde al instante y
 * sin recargar la página.
 */
export function ListaProfesionales({
  profesionales,
  especialidades,
}: {
  profesionales: FilaProfesional[];
  especialidades: { slug: string; nombre: string }[];
}) {
  const [consulta, setConsulta] = useState("");
  const [especialidad, setEspecialidad] = useState("");
  const [estado, setEstado] = useState("");
  const [aviso, setAviso] = useState("");
  const [confirmando, setConfirmando] = useState("");
  const [quitados, setQuitados] = useState<string[]>([]);
  const [trabajando, iniciar] = useTransition();

  const encontrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    return profesionales
      .filter((p) => !quitados.includes(p.slug))
      .filter((p) => {
        const texto = `${p.nombre} ${p.especialidad} ${p.ciudades}`.toLowerCase();
        if (q && !texto.includes(q)) return false;
        if (especialidad && p.especialidadSlug !== especialidad) return false;
        if (estado === "publicados" && !p.publicado) return false;
        if (estado === "suspendidos" && p.publicado) return false;
        return true;
      });
  }, [consulta, especialidad, estado, profesionales, quitados]);

  function ejecutar(accion: () => Promise<{ ok: boolean; mensaje: string }>, slug?: string) {
    iniciar(async () => {
      const r = await accion();
      setAviso(r.mensaje);
      if (r.ok && slug) setQuitados((q) => [...q, slug]);
      setConfirmando("");
    });
  }

  return (
    <div>
      <div className="filtros">
        <label className="campo-busqueda">
          <Lupa size={17} />
          <span className="sr-only">Buscar profesional</span>
          <input
            id="buscar-profesional"
            type="search"
            value={consulta}
            onChange={(e) => setConsulta(e.target.value)}
            placeholder="Nombre, especialidad o ciudad"
          />
        </label>

        <select
          aria-label="Especialidad"
          value={especialidad}
          onChange={(e) => setEspecialidad(e.target.value)}
        >
          <option value="">Todas las especialidades</option>
          {especialidades.map((e) => (
            <option key={e.slug} value={e.slug}>
              {e.nombre}
            </option>
          ))}
        </select>

        <select
          aria-label="Estado"
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
        >
          <option value="">Publicados y suspendidos</option>
          <option value="publicados">Solo publicados</option>
          <option value="suspendidos">Solo suspendidos</option>
        </select>
      </div>

      {aviso ? <p className="aviso-accion">{aviso}</p> : null}

      <p className="meta" style={{ marginBlock: 10 }}>
        {encontrados.length === profesionales.length
          ? `${profesionales.length} profesionales`
          : `${encontrados.length} de ${profesionales.length} profesionales`}
      </p>

      <div className="tabla">
        <div className="tabla-fila tabla-cabeza">
          <span>Nombre</span>
          <span>Especialidad</span>
          <span>Ciudad</span>
          <span>Acciones</span>
        </div>

        {encontrados.map((p) => (
          <div className="tabla-fila" key={p.slug}>
            <span>
              <Link href={`/panel/profesionales/${p.slug}`}>{p.nombre}</Link>
              <br />
              <em className={`pastilla ${p.publicado ? "pastilla-bien" : "pastilla-espera"}`}>
                {p.publicado ? "Publicado" : "Suspendido"}
              </em>
            </span>
            <span>{p.especialidad}</span>
            <span>{p.ciudades}</span>
            <span className="acciones-fila">
              <Link href={`/panel/profesionales/${p.slug}`} className="enlace-boton">
                Editar
              </Link>
              <button
                type="button"
                className="enlace-boton"
                disabled={trabajando}
                onClick={() => ejecutar(() => suspenderProfesional(p.slug, p.publicado))}
              >
                {p.publicado ? "Suspender" : "Publicar"}
              </button>
              {confirmando === p.slug ? (
                <button
                  type="button"
                  className="enlace-boton enlace-peligro"
                  disabled={trabajando}
                  onClick={() => ejecutar(() => eliminarProfesional(p.slug), p.slug)}
                >
                  Confirmar
                </button>
              ) : (
                <button
                  type="button"
                  className="enlace-boton enlace-peligro"
                  disabled={trabajando}
                  onClick={() => setConfirmando(p.slug)}
                >
                  Eliminar
                </button>
              )}
            </span>
          </div>
        ))}

        {encontrados.length === 0 ? (
          <div className="tabla-fila">
            <span style={{ gridColumn: "1 / -1" }} className="meta">
              Ningún profesional coincide con esa búsqueda.
            </span>
          </div>
        ) : null}
      </div>

      <p className="meta" style={{ marginTop: 10 }}>
        Suspender lo quita del directorio y conserva su información; eliminar lo
        borra por completo y solo es posible si no tiene citas registradas.
      </p>
    </div>
  );
}
