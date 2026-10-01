/**
 * Pruebas del motor de agenda.
 *
 * Cada una corresponde a algo que, si falla, se nota en la sala de espera:
 * dos pacientes a la misma hora, una cita ofrecida en un día que el médico
 * no atiende, o un horario de hoy que ya pasó.
 */

import { describe, expect, it } from "vitest";

import { diaDeLaSemana, disponible, etiquetaDe, huecos, porDia } from "./agenda";

// 2026-10-05 es lunes.
const LUNES = "2026-10-05";

const MANANA_LUNES_Y_MIERCOLES = [
  { dia: 0, desde: "09:00", hasta: "11:00" },
  { dia: 2, desde: "09:00", hasta: "10:00" },
];

describe("el calendario", () => {
  it("cuenta el lunes como día cero, igual que el consultorio", () => {
    expect(diaDeLaSemana(LUNES)).toBe(0);
    expect(diaDeLaSemana("2026-10-11")).toBe(6); // domingo
  });

  it("escribe la fecha como la lee una persona", () => {
    expect(etiquetaDe(LUNES)).toBe("lunes 5 de octubre");
  });
});

describe("huecos disponibles", () => {
  it("parte la franja en citas del largo que dura la consulta", () => {
    const lista = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "10:00" }],
      duracionMin: 30,
      desde: LUNES,
      dias: 1,
    });

    expect(lista.map((h) => h.hora)).toEqual(["09:00", "09:30"]);
  });

  it("no ofrece un horario que no cabe completo antes de cerrar", () => {
    const lista = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "09:50" }],
      duracionMin: 30,
      desde: LUNES,
      dias: 1,
    });

    expect(lista.map((h) => h.hora)).toEqual(["09:00"]);
  });

  it("solo ofrece los días en que el médico atiende", () => {
    const lista = huecos({
      franjas: MANANA_LUNES_Y_MIERCOLES,
      duracionMin: 60,
      desde: LUNES,
      dias: 7,
    });

    const dias = [...new Set(lista.map((h) => h.fecha))];
    expect(dias).toEqual(["2026-10-05", "2026-10-07"]);
  });

  it("descuenta lo que ya está ocupado", () => {
    const lista = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "11:00" }],
      duracionMin: 30,
      ocupados: [{ fecha: LUNES, hora: "09:30" }],
      desde: LUNES,
      dias: 1,
    });

    expect(lista.map((h) => h.hora)).toEqual(["09:00", "10:00", "10:30"]);
  });

  it("descuenta también lo que se empalma a medias", () => {
    // Una cita de una hora cargada desde el panel tapa dos huecos de media.
    const lista = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "11:00" }],
      duracionMin: 30,
      ocupados: [{ fecha: LUNES, hora: "09:15", duracionMin: 60 }],
      desde: LUNES,
      dias: 1,
    });

    expect(lista.map((h) => h.hora)).toEqual(["10:30"]);
  });

  it("no ofrece hoy lo que ya pasó ni lo que empieza en un rato", () => {
    const lista = huecos({
      franjas: [{ dia: 0, desde: "09:00", hasta: "12:00" }],
      duracionMin: 30,
      desde: LUNES,
      dias: 1,
      horaActual: "09:40",
      anticipacionMin: 60,
    });

    // A las 09:40, con una hora de anticipación, lo primero es 11:00.
    expect(lista[0].hora).toBe("11:00");
  });

  it("la anticipación solo aplica a hoy, no a los días siguientes", () => {
    const lista = huecos({
      franjas: MANANA_LUNES_Y_MIERCOLES,
      duracionMin: 60,
      desde: LUNES,
      dias: 7,
      horaActual: "23:00",
    });

    expect(lista[0].fecha).toBe("2026-10-07");
    expect(lista[0].hora).toBe("09:00");
  });

  it("se detiene en el máximo pedido, para no abrumar al paciente", () => {
    const lista = huecos({
      franjas: [{ dia: 0, desde: "08:00", hasta: "20:00" }],
      duracionMin: 15,
      desde: LUNES,
      dias: 14,
      maximo: 6,
    });

    expect(lista).toHaveLength(6);
  });

  it("sin franjas cargadas no promete nada", () => {
    expect(huecos({ franjas: [], duracionMin: 30, desde: LUNES })).toEqual([]);
  });

  it("agrupa por día para mostrarlo", () => {
    const lista = huecos({
      franjas: MANANA_LUNES_Y_MIERCOLES,
      duracionMin: 60,
      desde: LUNES,
      dias: 7,
    });

    const dias = porDia(lista);
    expect(dias[0].etiqueta).toBe("lunes 5 de octubre");
    expect(dias[0].horas).toEqual(["09:00", "10:00"]);
    expect(dias[1].horas).toEqual(["09:00"]);
  });
});

describe("confirmar una cita", () => {
  it("acepta un horario que sigue libre", () => {
    expect(
      disponible({
        franjas: MANANA_LUNES_Y_MIERCOLES,
        duracionMin: 30,
        fecha: LUNES,
        hora: "09:30",
      }),
    ).toBe(true);
  });

  it("rechaza el horario que alguien tomó mientras el paciente elegía", () => {
    expect(
      disponible({
        franjas: MANANA_LUNES_Y_MIERCOLES,
        duracionMin: 30,
        ocupados: [{ fecha: LUNES, hora: "09:30" }],
        fecha: LUNES,
        hora: "09:30",
      }),
    ).toBe(false);
  });

  it("rechaza un horario fuera del tramo de atención", () => {
    expect(
      disponible({
        franjas: MANANA_LUNES_Y_MIERCOLES,
        duracionMin: 30,
        fecha: LUNES,
        hora: "18:00",
      }),
    ).toBe(false);
  });

  it("rechaza un día en que el médico no atiende", () => {
    expect(
      disponible({
        franjas: MANANA_LUNES_Y_MIERCOLES,
        duracionMin: 30,
        fecha: "2026-10-06", // martes
        hora: "09:00",
      }),
    ).toBe(false);
  });
});
