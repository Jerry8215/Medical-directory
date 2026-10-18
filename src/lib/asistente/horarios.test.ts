/**
 * Qué horas le ofrece el asistente al paciente.
 *
 * La regla no es cosmética: si el chat ofrece las seis primeras horas
 * libres, las seis caen en la misma mañana y quien no puede por la mañana
 * se queda sin nada que elegir. Repartirlas entre los próximos días es lo
 * que hace que la lista sea una elección y no un trámite.
 */

import { describe, expect, it } from "vitest";

import { repartidas } from "./herramientas";

/** Horas corridas de un mismo día, como las devuelve la agenda. */
function corridas(fecha: string, desde: number, cuantas: number) {
  return Array.from({ length: cuantas }, (_, i) => ({
    fecha,
    hora: `${String(desde + i).padStart(2, "0")}:00`,
  }));
}

describe("repartidas", () => {
  it("no ofrece la misma mañana repetida", () => {
    const todas = [
      ...corridas("2026-10-19", 8, 8),
      ...corridas("2026-10-20", 8, 8),
      ...corridas("2026-10-21", 8, 8),
    ];

    const ofrecidas = repartidas(todas);

    expect(ofrecidas).toHaveLength(9);
    expect(new Set(ofrecidas.map((o) => o.fecha)).size).toBe(3);
    for (const fecha of ["2026-10-19", "2026-10-20", "2026-10-21"]) {
      expect(ofrecidas.filter((o) => o.fecha === fecha)).toHaveLength(3);
    }
  });

  it("no inventa días que no existen", () => {
    const ofrecidas = repartidas(corridas("2026-10-19", 8, 2));

    expect(ofrecidas.map((o) => o.hora)).toEqual(["08:00", "09:00"]);
    expect(ofrecidas.every((o) => o.dia === "lunes 19 de octubre")).toBe(true);
  });

  it("deja la hora dicha completa, para confirmar sin ambigüedad", () => {
    const [primera] = repartidas(corridas("2026-10-20", 9, 1));

    expect(primera.etiqueta).toBe("martes 20 de octubre a las 09:00");
    expect(primera.fecha).toBe("2026-10-20");
    expect(primera.hora).toBe("09:00");
  });

  it("sin huecos no ofrece nada", () => {
    expect(repartidas([])).toEqual([]);
  });

  it("conserva el orden en que la agenda los entregó", () => {
    const todas = [
      ...corridas("2026-10-19", 8, 1),
      ...corridas("2026-10-20", 8, 1),
      ...corridas("2026-10-19", 15, 1),
    ];

    expect(repartidas(todas).map((o) => `${o.fecha} ${o.hora}`)).toEqual([
      "2026-10-19 08:00",
      "2026-10-19 15:00",
      "2026-10-20 08:00",
    ]);
  });
});
