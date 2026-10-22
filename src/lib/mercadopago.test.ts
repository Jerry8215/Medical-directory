import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  aMonto,
  firmaValida,
  frecuencia,
  manifiesto,
  partesDeFirma,
} from "@/lib/mercadopago";

const SECRETO = "clave-de-prueba";

function firmar(dataId: string, requestId: string | null, ts: string): string {
  const v1 = createHmac("sha256", SECRETO)
    .update(manifiesto(dataId, requestId, ts))
    .digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("aMonto", () => {
  it("convierte centavos a pesos con dos decimales", () => {
    expect(aMonto(29900)).toBe(299);
    expect(aMonto(30050)).toBe(300.5);
    expect(aMonto(1)).toBe(0.01);
    expect(aMonto(0)).toBe(0);
  });

  it("no arrastra la basura de la coma flotante", () => {
    // El caso que importa: el importe que se manda tiene que poder
    // escribirse exacto, no 300.49999999999994.
    for (const centavos of [30050, 59900, 199999, 123457]) {
      const monto = aMonto(centavos);
      expect(Number(monto.toFixed(2))).toBe(monto);
      expect(Math.round(monto * 100)).toBe(centavos);
    }
  });
});

describe("frecuencia", () => {
  it("traduce la periodicidad al vocabulario del procesador", () => {
    expect(frecuencia("MENSUAL")).toEqual({ frequency: 1, frequency_type: "months" });
    expect(frecuencia("ANUAL")).toEqual({ frequency: 12, frequency_type: "months" });
  });
});

describe("partesDeFirma", () => {
  it("lee las partes por nombre y no por posición", () => {
    // El procesador no garantiza el orden, y confiar en él es lo que
    // funciona en las pruebas y falla el día del primer cobro.
    expect(partesDeFirma("ts=123,v1=abc")).toEqual({ ts: "123", v1: "abc" });
    expect(partesDeFirma("v1=abc,ts=123")).toEqual({ ts: "123", v1: "abc" });
    expect(partesDeFirma(" ts = 123 , v1 = abc ")).toEqual({ ts: "123", v1: "abc" });
  });

  it("no inventa partes que no vinieron", () => {
    expect(partesDeFirma(null)).toBeNull();
    expect(partesDeFirma("")).toBeNull();
    expect(partesDeFirma("ts=123")).toBeNull();
    expect(partesDeFirma("cualquier cosa")).toBeNull();
  });
});

describe("manifiesto", () => {
  it("respeta el formato exacto, puntos y comas incluidos", () => {
    expect(manifiesto("12345", "req-1", "1700000000")).toBe(
      "id:12345;request-id:req-1;ts:1700000000;",
    );
  });

  it("baja a minúsculas el identificador con letras", () => {
    expect(manifiesto("AbC123", "r", "1")).toBe("id:abc123;request-id:r;ts:1;");
    // Uno solo de dígitos se deja tal cual.
    expect(manifiesto("987", "r", "1")).toBe("id:987;request-id:r;ts:1;");
  });

  it("tolera que no venga el identificador de petición", () => {
    expect(manifiesto("987", null, "1")).toBe("id:987;request-id:;ts:1;");
  });
});

describe("firmaValida", () => {
  it("acepta un aviso firmado con el secreto", () => {
    const cabecera = firmar("12345", "req-1", "1700000000");
    expect(firmaValida("12345", "req-1", cabecera, SECRETO)).toBe(true);
  });

  it("rechaza al que inventa la firma", () => {
    // Sin esto, cualquiera que adivine la dirección del webhook se regala
    // un plan Premium con un POST.
    expect(firmaValida("12345", "req-1", "ts=1700000000,v1=00ff", SECRETO)).toBe(false);
  });

  it("rechaza si cambió cualquier parte de lo firmado", () => {
    const cabecera = firmar("12345", "req-1", "1700000000");
    expect(firmaValida("99999", "req-1", cabecera, SECRETO)).toBe(false);
    expect(firmaValida("12345", "otro", cabecera, SECRETO)).toBe(false);
  });

  it("rechaza si el secreto no coincide", () => {
    const cabecera = firmar("12345", "req-1", "1700000000");
    expect(firmaValida("12345", "req-1", cabecera, "otro-secreto")).toBe(false);
  });

  it("no deja pasar nada cuando no hay secreto configurado", () => {
    // Lo contrario sería que un despliegue sin configurar aceptara todo.
    const cabecera = firmar("12345", "req-1", "1700000000");
    expect(firmaValida("12345", "req-1", cabecera, undefined)).toBe(false);
    expect(firmaValida("12345", "req-1", null, SECRETO)).toBe(false);
  });
});
