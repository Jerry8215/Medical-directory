import { describe, expect, it } from "vitest";

import {
  admiteMensajes,
  cierraLaSalaEn,
  COMISION_POR_CIENTO,
  MINUTOS_DE_AVISO,
  MINUTOS_DE_SALA,
  MINUTOS_PARA_ACEPTAR,
  minutosRestantes,
  puedeAtenderEnLinea,
  reparto,
  situacion,
  venceLaEsperaEn,
} from "@/lib/consulta-reglas";

const MINUTO = 60_000;
const T0 = new Date("2026-10-24T18:00:00.000Z");
const en = (minutos: number) => new Date(T0.getTime() + minutos * MINUTO);

describe("los plazos", () => {
  it("la espera del médico vence a los veinte minutos", () => {
    expect(venceLaEsperaEn(T0)).toEqual(en(MINUTOS_PARA_ACEPTAR));
  });

  it("la sala dura dos horas desde que acepta", () => {
    expect(cierraLaSalaEn(T0)).toEqual(en(MINUTOS_DE_SALA));
  });
});

describe("reparto", () => {
  it("se queda la comisión y el resto es del médico", () => {
    expect(reparto(50000)).toEqual({ plataforma: 5000, medico: 45000 });
  });

  it("nunca pierde ni inventa un centavo", () => {
    for (const precio of [1, 99, 33333, 50000, 78999, 123457]) {
      const r = reparto(precio);
      expect(r.medico + r.plataforma).toBe(precio);
      expect(r.plataforma).toBeGreaterThanOrEqual(0);
      expect(r.medico).toBeGreaterThanOrEqual(0);
    }
  });

  it("el centavo suelto se va para quien puso el trabajo", () => {
    // 999 al 10 % son 99.9: la plataforma se queda 99 y el médico 900.
    expect(reparto(999)).toEqual({ plataforma: 99, medico: 900 });
  });

  it("admite otra comisión sin tocar nada más", () => {
    expect(reparto(50000, 0)).toEqual({ plataforma: 0, medico: 50000 });
    expect(reparto(50000, 20)).toEqual({ plataforma: 10000, medico: 40000 });
  });

  it("la comisión de partida es la del documento", () => {
    expect(COMISION_POR_CIENTO).toBe(10);
  });
});

describe("situacion", () => {
  const pagada = { estado: "PAGADA", creadaEn: T0 };

  it("sin cobrar, espera el cobro", () => {
    expect(situacion({ estado: "SOLICITADA", creadaEn: T0 }, en(5))).toBe("por-pagar");
  });

  it("cobrada, espera al médico mientras le quede plazo", () => {
    expect(situacion(pagada, en(1))).toBe("esperando-medico");
    expect(situacion(pagada, en(MINUTOS_PARA_ACEPTAR - 1))).toBe("esperando-medico");
  });

  it("al vencer el plazo hay que devolver", () => {
    // Es el riesgo principal del cobro por delante: el paciente pagó y
    // nadie apareció.
    expect(situacion(pagada, en(MINUTOS_PARA_ACEPTAR))).toBe("sin-respuesta");
    expect(situacion(pagada, en(60))).toBe("sin-respuesta");
  });

  it("aceptada, la sala está abierta hasta el aviso", () => {
    const abierta = {
      estado: "ACEPTADA",
      creadaEn: T0,
      aceptadaEn: T0,
      cierraEn: cierraLaSalaEn(T0),
    };
    expect(situacion(abierta, en(1))).toBe("abierta");
    expect(situacion(abierta, en(MINUTOS_DE_SALA - MINUTOS_DE_AVISO - 1))).toBe("abierta");
    expect(situacion(abierta, en(MINUTOS_DE_SALA - MINUTOS_DE_AVISO))).toBe("por-cerrar");
    expect(situacion(abierta, en(MINUTOS_DE_SALA - 1))).toBe("por-cerrar");
    expect(situacion(abierta, en(MINUTOS_DE_SALA))).toBe("se-acabo");
  });

  it("una sala sin fecha de cierre se deja abierta", () => {
    // Preferible a cerrarle la sala a alguien a mitad de una frase por un
    // dato que falta.
    expect(
      situacion({ estado: "ACEPTADA", creadaEn: T0, aceptadaEn: T0, cierraEn: null }, en(999)),
    ).toBe("abierta");
  });

  it("lo que ya terminó no vuelve a moverse", () => {
    for (const estado of ["CERRADA", "CANCELADA", "VENCIDA"]) {
      expect(situacion({ estado, creadaEn: T0 }, en(1))).toBe("terminada");
      expect(situacion({ estado, creadaEn: T0 }, en(99999))).toBe("terminada");
    }
  });
});

describe("admiteMensajes", () => {
  const abierta = {
    estado: "ACEPTADA",
    creadaEn: T0,
    aceptadaEn: T0,
    cierraEn: cierraLaSalaEn(T0),
  };

  it("se escribe mientras la sala está abierta, aviso incluido", () => {
    expect(admiteMensajes(abierta, en(1))).toBe(true);
    expect(admiteMensajes(abierta, en(MINUTOS_DE_SALA - 1))).toBe(true);
  });

  it("no se escribe antes de que acepten ni después de cerrar", () => {
    expect(admiteMensajes({ estado: "PAGADA", creadaEn: T0 }, en(1))).toBe(false);
    expect(admiteMensajes(abierta, en(MINUTOS_DE_SALA))).toBe(false);
    expect(admiteMensajes({ estado: "CERRADA", creadaEn: T0 }, en(1))).toBe(false);
  });
});

describe("minutosRestantes", () => {
  it("cuenta hacia abajo y se detiene en cero", () => {
    expect(minutosRestantes(en(30), T0)).toBe(30);
    expect(minutosRestantes(en(0), T0)).toBe(0);
    expect(minutosRestantes(en(-10), T0)).toBe(0);
    expect(minutosRestantes(null, T0)).toBe(0);
  });
});

describe("puedeAtenderEnLinea", () => {
  const listo = { estado: "PUBLICADO", enLinea: true, precioConsultaLinea: 50000 };

  it("hacen falta las tres condiciones", () => {
    expect(puedeAtenderEnLinea(listo)).toBe(true);
    expect(puedeAtenderEnLinea({ ...listo, estado: "SUSPENDIDO" })).toBe(false);
    expect(puedeAtenderEnLinea({ ...listo, enLinea: false })).toBe(false);
    expect(puedeAtenderEnLinea({ ...listo, precioConsultaLinea: null })).toBe(false);
  });

  it("un precio en cero no es un precio", () => {
    // Ofrecerlo gratis por un campo sin llenar sería cobrarle al médico
    // su trabajo.
    expect(puedeAtenderEnLinea({ ...listo, precioConsultaLinea: 0 })).toBe(false);
  });
});
