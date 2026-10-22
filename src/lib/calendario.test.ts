import { describe, expect, it } from "vitest";

import {
  INICIALES,
  mesCorrido,
  mesDe,
  nombreDelMes,
  porFranja,
  rejillaDelMes,
} from "@/lib/calendario";

describe("rejillaDelMes", () => {
  it("coloca el día 1 bajo su columna", () => {
    // El 1 de octubre de 2026 es jueves: tres huecos antes.
    const celdas = rejillaDelMes("2026-10");
    expect(celdas.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
  });

  it("completa semanas enteras", () => {
    for (const mes of ["2026-01", "2026-02", "2026-10", "2024-02"]) {
      expect(rejillaDelMes(mes).length % 7).toBe(0);
    }
  });

  it("no pierde ni inventa días", () => {
    expect(rejillaDelMes("2026-10").filter(Boolean)).toHaveLength(31);
    expect(rejillaDelMes("2026-02").filter(Boolean)).toHaveLength(28);
    // Año bisiesto.
    expect(rejillaDelMes("2024-02").filter(Boolean)).toHaveLength(29);
  });

  it("no corre el día por la zona horaria", () => {
    // Construir las fechas con un Date local las desplazaría seis horas
    // en Chihuahua y el mes empezaría el día anterior.
    expect(rejillaDelMes("2026-10").filter(Boolean)[0]).toBe("2026-10-01");
    expect(rejillaDelMes("2026-03").filter(Boolean)).toContain("2026-03-31");
  });
});

describe("mesCorrido", () => {
  it("cambia de año en los extremos", () => {
    expect(mesCorrido("2026-12", 1)).toBe("2027-01");
    expect(mesCorrido("2026-01", -1)).toBe("2025-12");
    expect(mesCorrido("2026-10", 3)).toBe("2027-01");
  });
});

describe("nombreDelMes y mesDe", () => {
  it("se leen como los dice un paciente", () => {
    expect(nombreDelMes("2026-10")).toBe("octubre de 2026");
    expect(mesDe("2026-10-22")).toBe("2026-10");
  });
});

describe("porFranja", () => {
  it("parte el día en mañana y tarde", () => {
    expect(porFranja(["09:00", "12:30", "13:00", "17:00"])).toEqual([
      { franja: "mañana", horas: ["09:00", "12:30"] },
      { franja: "tarde", horas: ["13:00", "17:00"] },
    ]);
  });

  it("no muestra una franja vacía", () => {
    expect(porFranja(["16:00", "18:00"])).toEqual([
      { franja: "tarde", horas: ["16:00", "18:00"] },
    ]);
    expect(porFranja([])).toEqual([]);
  });
});

describe("INICIALES", () => {
  it("distingue martes de miércoles", () => {
    expect(INICIALES).toEqual(["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"]);
  });
});
