import { describe, expect, it } from "vitest";

import {
  concepto,
  diasRestantes,
  estadoSuscripcion,
  folio,
  importe,
  mesesDe,
  nuevoVencimiento,
  pesos,
  PRECIOS_POR_OMISION,
} from "@/lib/suscripciones";

describe("importe", () => {
  it("cobra el precio del mes en la mensualidad", () => {
    expect(importe("GOLD", "MENSUAL")).toBe(29900);
    expect(importe("PREMIUM", "MENSUAL")).toBe(59900);
  });

  it("regala dos meses en la anualidad", () => {
    expect(importe("GOLD", "ANUAL")).toBe(29900 * 10);
    expect(importe("PREMIUM", "ANUAL")).toBe(59900 * 10);
  });

  it("no cobra el básico, que es la presencia en el directorio", () => {
    expect(importe("BASICO", "MENSUAL")).toBe(0);
    expect(importe("BASICO", "ANUAL")).toBe(0);
  });

  it("respeta los precios que fije el consultorio", () => {
    const suyos = { ...PRECIOS_POR_OMISION, GOLD: 45000 };
    expect(importe("GOLD", "MENSUAL", suyos)).toBe(45000);
  });

  it("muestra el importe en pesos", () => {
    expect(pesos(29900)).toContain("299");
    expect(pesos(0)).toContain("0");
  });
});

describe("nuevoVencimiento", () => {
  it("arranca hoy cuando no había suscripción", () => {
    const ahora = new Date("2026-03-10T12:00:00.000Z");
    expect(nuevoVencimiento(null, 1, ahora).toISOString()).toBe(
      "2026-04-10T12:00:00.000Z",
    );
  });

  it("suma al final de lo pagado si todavía está vigente", () => {
    // Renueva el 10 y le quedaban días hasta el 25: no los pierde.
    const ahora = new Date("2026-03-10T12:00:00.000Z");
    const hasta = new Date("2026-03-25T12:00:00.000Z");
    expect(nuevoVencimiento(hasta, 1, ahora).toISOString()).toBe(
      "2026-04-25T12:00:00.000Z",
    );
  });

  it("arranca hoy si la suscripción ya había vencido", () => {
    const ahora = new Date("2026-03-10T12:00:00.000Z");
    const vencio = new Date("2026-02-01T12:00:00.000Z");
    expect(nuevoVencimiento(vencio, 1, ahora).toISOString()).toBe(
      "2026-04-10T12:00:00.000Z",
    );
  });

  it("no regala días al pasar por un mes más corto", () => {
    // Del 31 de enero, un mes es el 28 de febrero y no el 3 de marzo.
    const ahora = new Date("2026-01-31T12:00:00.000Z");
    const fin = nuevoVencimiento(null, 1, ahora);
    expect(fin.getUTCMonth()).toBe(1);
    expect(fin.getUTCDate()).toBe(28);
  });

  it("la anualidad cae el mismo día del año siguiente", () => {
    const ahora = new Date("2026-06-15T12:00:00.000Z");
    expect(nuevoVencimiento(null, 12, ahora).toISOString()).toBe(
      "2027-06-15T12:00:00.000Z",
    );
  });

  it("mesesDe traduce la periodicidad", () => {
    expect(mesesDe("MENSUAL")).toBe(1);
    expect(mesesDe("ANUAL")).toBe(12);
  });
});

describe("estadoSuscripcion", () => {
  const ahora = new Date("2026-03-10T12:00:00.000Z");

  it("el básico no tiene suscripción que vencer", () => {
    expect(estadoSuscripcion("BASICO", null, ahora)).toBe("BASICO");
    expect(estadoSuscripcion("BASICO", new Date("2020-01-01"), ahora)).toBe("BASICO");
  });

  it("un plan de pago sin fecha es cortesía y está activo", () => {
    expect(estadoSuscripcion("GOLD", null, ahora)).toBe("ACTIVA");
  });

  it("avisa cuando faltan siete días o menos", () => {
    expect(estadoSuscripcion("GOLD", new Date("2026-03-15T12:00:00.000Z"), ahora))
      .toBe("POR_VENCER");
    expect(estadoSuscripcion("GOLD", new Date("2026-03-30T12:00:00.000Z"), ahora))
      .toBe("ACTIVA");
  });

  it("marca vencida la que ya pasó", () => {
    expect(estadoSuscripcion("PREMIUM", new Date("2026-03-09T12:00:00.000Z"), ahora))
      .toBe("VENCIDA");
  });

  it("cuenta los días que faltan", () => {
    expect(diasRestantes(new Date("2026-03-17T12:00:00.000Z"), ahora)).toBe(7);
    expect(diasRestantes(null, ahora)).toBeNull();
  });
});

describe("folio y concepto", () => {
  it("numera con ceros a la izquierda", () => {
    expect(folio(2026, 1)).toBe("MD-2026-00001");
    expect(folio(2026, 142)).toBe("MD-2026-00142");
  });

  it("describe lo que se pagó", () => {
    expect(concepto("GOLD", "MENSUAL")).toBe("Plan Gold, un mes");
    expect(concepto("PREMIUM", "ANUAL")).toBe("Plan Premium, doce meses");
  });
});
