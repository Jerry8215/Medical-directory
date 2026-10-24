import { describe, expect, it } from "vitest";

import {
  bandera,
  normalizarTelefono,
  PAISES,
  paisDe,
  paraWhatsapp,
  separar,
  telefonoInternacional,
  telefonoLegible,
} from "@/lib/telefono";

describe("normalizarTelefono", () => {
  it("deja el número en E.164", () => {
    expect(normalizarTelefono("52", "6391227780")).toEqual({
      ok: true,
      valor: "+526391227780",
    });
  });

  it("acepta números más largos de diez dígitos fuera de México", () => {
    // Es el caso que el formulario rechazaba: un número que está bien.
    expect(normalizarTelefono("34", "612345678").ok).toBe(true);
    expect(normalizarTelefono("57", "3001234567").ok).toBe(true);
    expect(normalizarTelefono("55", "11987654321").ok).toBe(true);
  });

  it("limpia lo que la gente escribe de verdad", () => {
    for (const escrito of [
      "639 122 7780",
      "(639) 122-7780",
      "639.122.7780",
      " 6391227780 ",
    ]) {
      expect(normalizarTelefono("52", escrito)).toEqual({
        ok: true,
        valor: "+526391227780",
      });
    }
  });

  it("perdona la lada escrita dos veces", () => {
    // Mucha gente escribe su número completo aunque ya eligió el país.
    expect(normalizarTelefono("52", "526391227780")).toEqual({
      ok: true,
      valor: "+526391227780",
    });
    expect(normalizarTelefono("34", "34612345678")).toEqual({
      ok: true,
      valor: "+34612345678",
    });
  });

  it("quita el cero que se marca solo dentro del país", () => {
    expect(normalizarTelefono("34", "0612345678")).toEqual({
      ok: true,
      valor: "+34612345678",
    });
  });

  it("en México exige diez dígitos y lo dice", () => {
    const r = normalizarTelefono("52", "639122");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.motivo).toContain("diez");
  });

  it("rechaza lo que no es un teléfono", () => {
    expect(normalizarTelefono("52", "").ok).toBe(false);
    expect(normalizarTelefono("", "6391227780").ok).toBe(false);
    expect(normalizarTelefono("52", "1111111111").ok).toBe(false);
    // Más de quince dígitos no existe en E.164.
    expect(normalizarTelefono("57", "12345678901234567").ok).toBe(false);
  });
});

describe("paisDe", () => {
  it("prefiere la lada más larga", () => {
    // Puerto Rico es 1787 y Estados Unidos es 1: por orden alfabético
    // ganaría el equivocado.
    expect(paisDe("+17871234567")?.iso).toBe("PR");
    expect(paisDe("+12125551234")?.iso).toBe("US");
  });

  it("no inventa un país que no está en la lista", () => {
    expect(paisDe("+999123456")).toBeUndefined();
  });
});

describe("separar", () => {
  it("devuelve el número a sus dos campos", () => {
    const r = separar("+526391227780");
    expect(r.pais.iso).toBe("MX");
    expect(r.nacional).toBe("6391227780");
  });

  it("lo guardado sin lada se trata como mexicano", () => {
    const r = separar("6391227780");
    expect(r.pais.iso).toBe("MX");
    expect(r.nacional).toBe("6391227780");
  });
});

describe("telefonoInternacional", () => {
  it("acepta lo que ya está en E.164", () => {
    expect(telefonoInternacional("+526391227780")).toEqual({
      ok: true,
      valor: "+526391227780",
    });
    expect(telefonoInternacional("+34612345678")).toEqual({
      ok: true,
      valor: "+34612345678",
    });
  });

  it("trata como mexicano lo que se guardó antes de que hubiera lada", () => {
    expect(telefonoInternacional("6391227780")).toEqual({
      ok: true,
      valor: "+526391227780",
    });
  });
});

describe("bandera", () => {
  it("sale del código del país, sin tabla aparte", () => {
    expect(bandera("MX")).toBe("🇲🇽");
    expect(bandera("ES")).toBe("🇪🇸");
    expect(bandera("us")).toBe("🇺🇸");
  });

  it("todos los países de la lista tienen la suya", () => {
    for (const p of PAISES) {
      expect(bandera(p.iso)).toHaveLength(4);
    }
  });
});

describe("para mostrar y para WhatsApp", () => {
  it("se lee por grupos", () => {
    expect(telefonoLegible("+526391227780")).toBe("+52 639 122 7780");
  });

  it("WhatsApp quiere dígitos y nada más", () => {
    expect(paraWhatsapp("+52 639 122 7780")).toBe("526391227780");
  });

  it("le pone la lada a lo que se guardó sin ella", () => {
    // Mandar diez dígitos mexicanos a wa.me sin el 52 abre una
    // conversación con un número que no existe.
    expect(paraWhatsapp("6391227780")).toBe("526391227780");
  });
});

describe("la lista de países", () => {
  it("abre con México, que es donde está el consultorio", () => {
    expect(PAISES[0].iso).toBe("MX");
  });

  it("no repite países", () => {
    expect(new Set(PAISES.map((p) => p.iso)).size).toBe(PAISES.length);
  });
});
