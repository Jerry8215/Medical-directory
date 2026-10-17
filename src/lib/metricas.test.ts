import { describe, expect, it } from "vitest";

import {
  compararVistas,
  conversion,
  diaLocal,
  EN_CERO,
  esTipo,
  inicioDeMes,
  sugerencia,
  sumar,
} from "@/lib/metricas";

describe("diaLocal", () => {
  it("agrupa la tarde de Chihuahua en su propio día", () => {
    // Las 18:00 del 9 de marzo en Chihuahua son el 10 en Greenwich. Si se
    // agrupara por día UTC, esa visita se contaría al día siguiente.
    const tarde = new Date("2026-03-10T00:30:00.000Z"); // 18:30 del 9, local
    expect(diaLocal(tarde).toISOString()).toBe("2026-03-09T06:00:00.000Z");
  });

  it("la mañana cae en el mismo día", () => {
    const manana = new Date("2026-03-10T15:00:00.000Z"); // 09:00 del 10, local
    expect(diaLocal(manana).toISOString()).toBe("2026-03-10T06:00:00.000Z");
  });

  it("dos visitas del mismo día local caen en el mismo cajón", () => {
    const a = diaLocal(new Date("2026-03-10T15:00:00.000Z"));
    const b = diaLocal(new Date("2026-03-11T03:00:00.000Z")); // 21:00 del 10
    expect(a.getTime()).toBe(b.getTime());
  });
});

describe("inicioDeMes", () => {
  it("arranca el día uno en hora local", () => {
    expect(inicioDeMes(new Date("2026-03-18T20:00:00.000Z")).toISOString()).toBe(
      "2026-03-01T06:00:00.000Z",
    );
  });

  it("el primero de madrugada todavía pertenece a su mes", () => {
    // 20:00 del 28 de febrero local es el 1 de marzo en UTC.
    expect(inicioDeMes(new Date("2026-03-01T02:00:00.000Z")).toISOString()).toBe(
      "2026-02-01T06:00:00.000Z",
    );
  });
});

describe("sumar y conversion", () => {
  it("suma los días del periodo y conserva las citas", () => {
    const c = sumar(
      [
        { vistas: 10, telefono: 2, whatsapp: 1 },
        { vistas: 5, telefono: 0, whatsapp: 3 },
      ],
      4,
    );
    expect(c).toEqual({ vistas: 15, telefono: 2, whatsapp: 4, citas: 4 });
  });

  it("sin visitas no hay conversión que calcular", () => {
    expect(conversion(EN_CERO)).toBeNull();
  });

  it("mide qué parte de las visitas terminó en contacto", () => {
    expect(conversion({ vistas: 100, telefono: 5, whatsapp: 3, citas: 2 })).toBe(10);
  });
});

describe("compararVistas", () => {
  it("no compara cuando es el único de su especialidad", () => {
    const c = compararVistas(40, 40, 1);
    expect(c.diferencia).toBeNull();
    expect(c.frase).toContain("Todavía no hay otros médicos");
  });

  it("no inventa una comparación contra cero", () => {
    expect(compararVistas(0, 0, 5).diferencia).toBeNull();
  });

  it("dice cuánto está por encima", () => {
    const c = compararVistas(150, 100, 4);
    expect(c.diferencia).toBe(50);
    expect(c.frase).toContain("50% más");
    expect(c.frase).toContain("100");
  });

  it("dice cuánto está por debajo, sin rodeos", () => {
    const c = compararVistas(40, 95, 4);
    expect(c.diferencia).toBe(-58);
    expect(c.frase).toContain("58% menos");
  });

  it("una diferencia pequeña es estar en el promedio", () => {
    expect(compararVistas(103, 100, 4).frase).toContain("en el promedio");
  });
});

describe("sugerencia", () => {
  it("sin visitas, propone cargar padecimientos", () => {
    expect(sugerencia(EN_CERO, false, true)).toContain("padecimientos");
  });

  it("la fotografía va antes que cualquier otra cosa", () => {
    const c = { vistas: 50, telefono: 1, whatsapp: 0, citas: 0 };
    expect(sugerencia(c, true, false)).toContain("fotografía");
  });

  it("con visitas y sin WhatsApp, lo señala", () => {
    const c = { vistas: 50, telefono: 1, whatsapp: 0, citas: 0 };
    expect(sugerencia(c, false, true)).toContain("WhatsApp");
  });

  it("muchas visitas y pocos contactos apunta al contenido del perfil", () => {
    const c = { vistas: 100, telefono: 1, whatsapp: 1, citas: 0 };
    expect(sugerencia(c, true, true)).toContain("pocos lo contactan");
  });

  it("si todo va bien no inventa un consejo", () => {
    const c = { vistas: 100, telefono: 10, whatsapp: 10, citas: 5 };
    expect(sugerencia(c, true, true)).toBeNull();
  });
});

describe("esTipo", () => {
  it("acepta solo lo que el contador conoce", () => {
    expect(esTipo("vista")).toBe(true);
    expect(esTipo("whatsapp")).toBe(true);
    expect(esTipo("borrar-todo")).toBe(false);
    expect(esTipo(42)).toBe(false);
  });
});
