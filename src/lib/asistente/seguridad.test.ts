/**
 * El invariante del asistente: lo que suena a urgencia no se conversa.
 *
 * Estas pruebas son las que impiden que una mejora de redacción abra un
 * hueco por el que un paciente con un cuadro grave termine esperando una
 * cita de la semana que viene.
 */

import { describe, expect, it } from "vitest";

import { evaluar, normalizar } from "./seguridad";

describe("signos de alarma", () => {
  const urgencias = [
    "Tengo un dolor muy fuerte del lado derecho",
    "no aguanto el dolor",
    "traigo 39 de fiebre desde ayer",
    "estoy sangrando y no para",
    "vomité sangre en la madrugada",
    "no puedo respirar bien",
    "se me puso la piel amarilla",
    "la herida se abrió",
  ];

  it.each(urgencias)("manda a urgencias: %s", (mensaje) => {
    const v = evaluar(mensaje);
    expect(v.accion).toBe("urgencias");
    if (v.accion === "urgencias") {
      expect(v.respuesta).toContain("urgencias más cercano");
      // Un directorio no tiene médico de guardia: no puede prometer llamadas.
      expect(v.respuesta).not.toContain("lo contactamos");
    }
  });
});

describe("consultas clínicas", () => {
  const clinicas = [
    "me salió una bolita en la ingle",
    "¿será grave lo que tengo?",
    "¿qué me recomienda para la acidez?",
    "¿qué medicamento puedo tomar?",
    "tengo náuseas desde hace días",
  ];

  it.each(clinicas)("deriva a consulta: %s", (mensaje) => {
    const v = evaluar(mensaje);
    expect(v.accion).toBe("derivar");
    if (v.accion === "derivar") {
      expect(v.respuesta).toContain("valorarlo un médico");
    }
  });
});

describe("lo que sí puede contestar el asistente", () => {
  const rutinarias = [
    "busco un cirujano general en Delicias",
    "¿cuánto cuesta la consulta?",
    "¿quién atiende vesícula en Camargo?",
    "quiero agendar una cita el viernes",
    "¿dónde está el consultorio?",
    "hola, buenas tardes",
  ];

  it.each(rutinarias)("sigue la conversación: %s", (mensaje) => {
    expect(evaluar(mensaje).accion).toBe("continuar");
  });
});

describe("normalización", () => {
  it("entiende sin acentos y con mayúsculas, como escribe la gente", () => {
    expect(normalizar("  TENGO  Fiebre ALTA ")).toBe("tengo fiebre alta");
    expect(evaluar("TENGO FIEBRE ALTA").accion).toBe("urgencias");
  });
});
