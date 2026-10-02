/**
 * Qué contesta el directorio y qué contesta el modelo.
 *
 * Es la lección del asistente del consultorio: contestar «esto es lo que
 * encontré» a quien preguntó en qué consiste una cirugía es exactamente lo
 * que hizo decir al cliente que el asistente «responde siempre lo mismo».
 */

import { describe, expect, it } from "vitest";

import { esBusqueda } from "./conversar";
import { normalizar } from "./seguridad";

const busquedas = [
  "busco un cirujano para vesicula",
  "necesito un pediatra en Meoqui",
  "quien atiende hernias",
  "quiero agendar una cita",
  "cuanto cuesta la consulta",
  "horarios del doctor Padilla",
  "ginecologo",
];

const preguntas = [
  "en que consiste la cirugia de vesicula",
  "que diferencia hay entre un internista y un medico general",
  "el doctor Padilla opera por laparoscopia o abierto",
  "cuanto dura la recuperacion de una hernia",
  "por que me piden estudios antes de operar",
  "es necesario ayunar antes de la consulta",
];

describe("a quién le toca contestar", () => {
  it.each(busquedas)("el directorio busca: %s", (mensaje) => {
    expect(esBusqueda(normalizar(mensaje))).toBe(true);
  });

  it.each(preguntas)("el modelo conversa: %s", (mensaje) => {
    expect(esBusqueda(normalizar(mensaje))).toBe(false);
  });
});
