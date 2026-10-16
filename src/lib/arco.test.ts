import { describe, expect, it } from "vitest";

import {
  comoTexto,
  esAnonimo,
  nombreDelArchivo,
  PREFIJO_ANONIMO,
  telefonoAnonimo,
  type Expediente,
} from "@/lib/arco";

const EMITIDO = new Date("2026-10-16T09:00:00.000Z");

function expediente(cambios: Partial<Expediente> = {}): Expediente {
  return {
    nombre: "Ana López",
    telefono: "6391234567",
    correo: "ana@example.com",
    alta: new Date("2026-05-02T18:30:00.000Z"),
    consentimiento: new Date("2026-05-02T18:30:00.000Z"),
    bajaEn: null,
    citas: [
      {
        cuando: new Date("2026-06-10T16:00:00.000Z"),
        profesional: "Dr. Ejemplo",
        consultorio: "Consultorio Centro",
        estado: "ATENDIDA",
        origen: "web",
        motivo: "dolor abdominal",
      },
    ],
    opiniones: [
      {
        fecha: new Date("2026-06-12T10:00:00.000Z"),
        profesional: "Dr. Ejemplo",
        calificacion: 5,
        texto: "Muy buena atención.",
        publicada: true,
      },
    ],
    ...cambios,
  };
}

describe("telefonoAnonimo", () => {
  it("conserva la unicidad sin identificar a nadie", () => {
    const a = telefonoAnonimo("abc123");
    expect(a).toBe(PREFIJO_ANONIMO + "abc123");
    expect(a).not.toContain("639");
    expect(esAnonimo(a)).toBe(true);
  });

  it("dos cancelaciones no chocan entre sí", () => {
    expect(telefonoAnonimo("uno")).not.toBe(telefonoAnonimo("dos"));
  });

  it("un teléfono real no se confunde con uno cancelado", () => {
    expect(esAnonimo("6391234567")).toBe(false);
  });
});

describe("comoTexto", () => {
  it("entrega todo lo que se guarda del paciente", () => {
    const t = comoTexto(expediente(), "Médicos de Delicias", EMITIDO);
    expect(t).toContain("Ana López");
    expect(t).toContain("6391234567");
    expect(t).toContain("ana@example.com");
    expect(t).toContain("Dr. Ejemplo");
    expect(t).toContain("dolor abdominal");
    expect(t).toContain("Muy buena atención.");
  });

  it("cuenta las citas y las opiniones", () => {
    const t = comoTexto(expediente(), "Médicos de Delicias", EMITIDO);
    expect(t).toContain("SUS CITAS (1)");
    expect(t).toContain("SUS OPINIONES (1)");
  });

  it("dice con todas sus letras cuando no hay nada", () => {
    const t = comoTexto(
      expediente({ citas: [], opiniones: [] }),
      "Médicos de Delicias",
      EMITIDO,
    );
    expect(t).toContain("No hay citas registradas.");
    expect(t).toContain("No hay opiniones registradas.");
  });

  it("no inventa datos que no se tienen", () => {
    const t = comoTexto(
      expediente({ nombre: null, correo: null, consentimiento: null }),
      "Médicos de Delicias",
      EMITIDO,
    );
    expect(t).toContain("Nombre: (no registrado)");
    expect(t).toContain("Correo: (no registrado)");
    expect(t).toContain("Consentimiento: (no registrado)");
  });

  it("informa si la oposición está activa", () => {
    const sin = comoTexto(expediente(), "Médicos de Delicias", EMITIDO);
    expect(sin).toContain("no solicitada");

    const con = comoTexto(
      expediente({ bajaEn: new Date("2026-07-01T12:00:00.000Z") }),
      "Médicos de Delicias",
      EMITIDO,
    );
    expect(con).toContain("activa desde");
  });

  it("oculta el teléfono de un expediente ya cancelado", () => {
    const t = comoTexto(
      expediente({ telefono: telefonoAnonimo("xyz") }),
      "Médicos de Delicias",
      EMITIDO,
    );
    expect(t).toContain("(cancelado)");
    expect(t).not.toContain("anonimo-xyz");
  });

  it("explica el plazo y los derechos que quedan", () => {
    const t = comoTexto(expediente(), "Médicos de Delicias", EMITIDO);
    expect(t).toContain("20 días hábiles");
    expect(t).toContain("rectificación");
    expect(t).toContain("cancelación");
  });
});

describe("nombreDelArchivo", () => {
  it("no lleva datos personales en el nombre", () => {
    const n = nombreDelArchivo(EMITIDO);
    expect(n).toBe("datos-personales-2026-10-16.txt");
    expect(n).not.toContain("Ana");
  });
});
