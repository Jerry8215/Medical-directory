"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Lupa, Pin } from "@/componentes/Iconos";

/**
 * El buscador de la portada.
 *
 * Lleva a la página de la ciudad con la consulta escrita, en lugar de
 * filtrar acá: esa página ya existe, está indexada y es la que el paciente
 * puede compartir o volver a abrir desde su historial.
 */
export function BuscadorPortada({
  ciudades,
}: {
  ciudades: { slug: string; nombre: string }[];
}) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [ciudad, setCiudad] = useState(ciudades[0]?.slug ?? "delicias");

  function buscar() {
    const destino = consulta.trim()
      ? `/${ciudad}?q=${encodeURIComponent(consulta.trim())}`
      : `/${ciudad}`;
    router.push(destino);
  }

  return (
    <form
      className="buscador"
      onSubmit={(e) => {
        e.preventDefault();
        buscar();
      }}
    >
      <label className="campo-busqueda">
        <Lupa />
        <span className="sr-only">Especialidad, padecimiento o nombre</span>
        <input
          id="busqueda-portada"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder="Especialidad, padecimiento o nombre del médico"
        />
      </label>

      <div className="separador" aria-hidden="true" />

      <label className="campo-busqueda" style={{ flex: "0 1 220px" }}>
        <Pin />
        <span className="sr-only">Ciudad</span>
        <select
          id="ciudad-portada"
          value={ciudad}
          onChange={(e) => setCiudad(e.target.value)}
        >
          {ciudades.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.nombre}, Chihuahua
            </option>
          ))}
        </select>
      </label>

      <button type="submit" className="boton-lleno">
        <Lupa size={17} />
        Buscar médico
      </button>
    </form>
  );
}
