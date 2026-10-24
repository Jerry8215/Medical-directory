import { describe, expect, it } from "vitest";

import {
  apareceEnElListado,
  esSuya,
  puedeEntrar,
  veAlPaciente,
  type ConsultaMirada,
  type QuienMira,
} from "@/lib/visibilidad-consulta";

const PUBLICA: ConsultaMirada = { pacienteId: "p1", profesionalId: "m1", publica: true };
const PRIVADA: ConsultaMirada = { pacienteId: "p1", profesionalId: "m1", publica: false };

const CUALQUIERA: QuienMira = { esEquipo: false };
const SU_PACIENTE: QuienMira = { esEquipo: false, pacienteId: "p1" };
const OTRO_PACIENTE: QuienMira = { esEquipo: false, pacienteId: "p2" };
const SU_MEDICO: QuienMira = { esEquipo: false, profesionalId: "m1" };
const OTRO_MEDICO: QuienMira = { esEquipo: false, profesionalId: "m2" };
const EQUIPO: QuienMira = { esEquipo: true };

describe("esSuya", () => {
  it("reconoce al paciente y al médico de la sala", () => {
    expect(esSuya(SU_PACIENTE, PUBLICA)).toBe(true);
    expect(esSuya(SU_MEDICO, PUBLICA)).toBe(true);
  });

  it("no confunde a los de otras salas", () => {
    expect(esSuya(OTRO_PACIENTE, PUBLICA)).toBe(false);
    expect(esSuya(OTRO_MEDICO, PUBLICA)).toBe(false);
    expect(esSuya(CUALQUIERA, PUBLICA)).toBe(false);
  });

  it("no toma por suyo lo que tiene identificadores vacíos", () => {
    // Un `null` en los dos lados no puede significar «coinciden».
    expect(esSuya({ esEquipo: false, pacienteId: null }, PUBLICA)).toBe(false);
    expect(esSuya({ esEquipo: false, profesionalId: "" }, { ...PUBLICA, profesionalId: "" })).toBe(
      false,
    );
  });
});

describe("apareceEnElListado", () => {
  it("cualquiera ve las publicadas", () => {
    expect(apareceEnElListado(CUALQUIERA, PUBLICA)).toBe(true);
    expect(apareceEnElListado(OTRO_PACIENTE, PUBLICA)).toBe(true);
  });

  it("las que el paciente no quiso publicar no se listan a extraños", () => {
    expect(apareceEnElListado(CUALQUIERA, PRIVADA)).toBe(false);
    expect(apareceEnElListado(OTRO_PACIENTE, PRIVADA)).toBe(false);
    expect(apareceEnElListado(OTRO_MEDICO, PRIVADA)).toBe(false);
  });

  it("lo propio aparece siempre, publicado o no", () => {
    // Nadie debería perder de vista su consulta por no publicarla.
    expect(apareceEnElListado(SU_PACIENTE, PRIVADA)).toBe(true);
    expect(apareceEnElListado(SU_MEDICO, PRIVADA)).toBe(true);
  });

  it("el consultorio ve todas", () => {
    expect(apareceEnElListado(EQUIPO, PRIVADA)).toBe(true);
    expect(apareceEnElListado(EQUIPO, PUBLICA)).toBe(true);
  });
});

describe("puedeEntrar", () => {
  it("solo entran los de la sala y el consultorio", () => {
    expect(puedeEntrar(SU_PACIENTE, PUBLICA)).toBe(true);
    expect(puedeEntrar(SU_MEDICO, PUBLICA)).toBe(true);
    expect(puedeEntrar(EQUIPO, PUBLICA)).toBe(true);
  });

  it("publicar el título no abre la puerta", () => {
    // Es la confusión que hay que impedir: que algo se liste no
    // significa que se pueda leer.
    expect(puedeEntrar(CUALQUIERA, PUBLICA)).toBe(false);
    expect(puedeEntrar(OTRO_PACIENTE, PUBLICA)).toBe(false);
    expect(puedeEntrar(OTRO_MEDICO, PUBLICA)).toBe(false);
  });
});

describe("veAlPaciente", () => {
  it("el nombre no sale de la sala", () => {
    expect(veAlPaciente(CUALQUIERA, PUBLICA)).toBe(false);
    expect(veAlPaciente(OTRO_PACIENTE, PUBLICA)).toBe(false);
    expect(veAlPaciente(OTRO_MEDICO, PUBLICA)).toBe(false);
  });

  it("lo ve quien está adentro", () => {
    expect(veAlPaciente(SU_PACIENTE, PUBLICA)).toBe(true);
    expect(veAlPaciente(SU_MEDICO, PUBLICA)).toBe(true);
    expect(veAlPaciente(EQUIPO, PUBLICA)).toBe(true);
  });
});

describe("la regla que no puede romperse", () => {
  it("nadie ve un nombre sin poder entrar, ni entra sin ver el nombre", () => {
    const miradas = [CUALQUIERA, SU_PACIENTE, OTRO_PACIENTE, SU_MEDICO, OTRO_MEDICO, EQUIPO];
    for (const quien of miradas) {
      for (const c of [PUBLICA, PRIVADA]) {
        expect(veAlPaciente(quien, c)).toBe(puedeEntrar(quien, c));
      }
    }
  });

  it("todo el que entra tiene la sala en su listado", () => {
    // Lo contrario dejaría una sala a la que se puede entrar pero que no
    // aparece en ningún lado.
    const miradas = [CUALQUIERA, SU_PACIENTE, OTRO_PACIENTE, SU_MEDICO, OTRO_MEDICO, EQUIPO];
    for (const quien of miradas) {
      for (const c of [PUBLICA, PRIVADA]) {
        if (puedeEntrar(quien, c)) expect(apareceEnElListado(quien, c)).toBe(true);
      }
    }
  });
});
