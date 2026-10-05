"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Lupa } from "@/componentes/Iconos";

/**
 * Elegir de qué médico se ve la agenda.
 *
 * Antes era una pestaña por médico. Con cinco se leía bien; con cincuenta
 * sería una tira interminable, que fue justo lo que observó el consultorio.
 * Acá se escribe el nombre y la lista se reduce, así que da igual que el
 * padrón tenga diez o mil.
 */
export function FiltroMedico({
  medicos,
  elegido,
}: {
  medicos: { slug: string; nombre: string; especialidad?: string }[];
  elegido?: string;
}) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");

  const encontrados = useMemo(() => {
    const q = consulta.trim().toLowerCase();
    if (!q) return medicos.slice(0, 8);
    return medicos
      .filter((m) =>
        `${m.nombre} ${m.especialidad ?? ""}`.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [consulta, medicos]);

  const actual = medicos.find((m) => m.slug === elegido);

  return (
    <div className="filtro-medico">
      <label className="campo-busqueda">
        <Lupa size={17} />
        <span className="sr-only">Buscar médico</span>
        <input
          id="filtro-medico"
          type="search"
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          placeholder={
            actual ? `Viendo: ${actual.nombre}` : "Escriba el nombre de un médico"
          }
        />
      </label>

      <div className="chips" style={{ marginTop: 10 }}>
        <button
          type="button"
          className="chip"
          aria-current={!elegido ? "true" : undefined}
          onClick={() => router.push("/panel/mi-agenda")}
        >
          Todos
        </button>

        {encontrados.map((m) => (
          <button
            key={m.slug}
            type="button"
            className="chip"
            aria-current={m.slug === elegido ? "true" : undefined}
            onClick={() => router.push(`/panel/mi-agenda?medico=${m.slug}`)}
          >
            {m.nombre}
          </button>
        ))}

        {consulta.trim() && encontrados.length === 0 ? (
          <span className="meta">Ningún médico coincide con «{consulta}».</span>
        ) : null}
      </div>

      {!consulta.trim() && medicos.length > 8 ? (
        <p className="meta" style={{ marginTop: 8 }}>
          Mostrando 8 de {medicos.length} médicos. Escriba un nombre para
          encontrar el resto.
        </p>
      ) : null}
    </div>
  );
}
