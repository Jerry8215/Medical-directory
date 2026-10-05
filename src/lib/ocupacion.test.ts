/**
 * Lo que el médico apunta en Google tiene que bloquear el horario correcto
 * acá. Un error de seis horas acá significa ofrecerle a un paciente la hora
 * en la que el médico está operando.
 */

import { describe, expect, it } from "vitest";

import { huecos } from "./agenda";
import { comoOcupado } from "./ocupacion";

// Chihuahua es UTC−6: las 15:00 UTC son las 09:00 de la mañana allá.
const LUNES = "2026-10-05";

describe("compromisos de Google", () => {
  it("traduce el instante a la hora que ve el consultorio", () => {
    const [ocupado] = comoOcupado([
      {
        inicio: new Date("2026-10-05T15:00:00Z"),
        fin: new Date("2026-10-05T16:00:00Z"),
      },
    ]);

    expect(ocupado).toEqual({ fecha: LUNES, hora: "09:00", duracionMin: 60 });
  });

  it("bloquea de verdad ese horario en la agenda", () => {
    const ocupados = comoOcupado([
      {
        inicio: new Date("2026-10-05T15:00:00Z"), // 09:00 local
        fin: new Date("2026-10-05T16:00:00Z"),
      },
    ]);

    const libres = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "11:00" }],
      duracionMin: 30,
      ocupados,
      desde: LUNES,
      dias: 1,
    });

    expect(libres.map((h) => h.hora)).toEqual(["10:00", "10:30"]);
  });

  it("parte por día lo que cruza la medianoche", () => {
    const partes = comoOcupado([
      {
        inicio: new Date("2026-10-05T23:00:00Z"), // 17:00 del lunes
        fin: new Date("2026-10-06T18:00:00Z"), // 12:00 del martes
      },
    ]);

    expect(partes.map((p) => p.fecha)).toEqual(["2026-10-05", "2026-10-06"]);
    expect(partes[1].hora).toBe("00:00");
  });

  it("deja libre un día completo bloqueado en Google", () => {
    const ocupados = comoOcupado([
      {
        inicio: new Date("2026-10-05T06:00:00Z"), // 00:00 local
        fin: new Date("2026-10-06T06:00:00Z"),
      },
    ]);

    const libres = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "14:00" }],
      duracionMin: 30,
      ocupados,
      desde: LUNES,
      dias: 1,
    });

    expect(libres).toEqual([]);
  });

  it("ignora un compromiso sin duración", () => {
    expect(
      comoOcupado([
        { inicio: new Date("2026-10-05T15:00:00Z"), fin: new Date("2026-10-05T15:00:00Z") },
      ]),
    ).toEqual([]);
  });
});
