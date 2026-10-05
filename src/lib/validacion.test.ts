/**
 * Lo que entra al directorio y lo que no.
 *
 * El consultorio lo notó al probarlo: se podía solicitar un alta con
 * cualquier cosa, incluso con números y mayúsculas mezcladas. Un nombre mal
 * escrito queda publicado en el perfil y en la agenda del médico.
 */

import { describe, expect, it } from "vitest";

import {
  cedulaProfesional,
  correoElectronico,
  nombreDePersona,
  telefonoMexicano,
} from "./validacion";

describe("nombre de una persona", () => {
  const validos = [
    "José Guadalupe Padilla",
    "Ana Serrano Mota",
    "María de los Ángeles Pérez",
    "Jean-Pierre Guzmán",
    "Dr. Luis Quintero",
    "Ma. Teresa Núñez",
    "O’Connor Treviño",
  ];

  it.each(validos)("acepta: %s", (nombre) => {
    const r = nombreDePersona(nombre);
    expect(r.ok).toBe(true);
  });

  const invalidos: [string, string][] = [
    ["asdf123", "números"],
    ["Juan23 Pérez", "números en medio"],
    ["aaaa bbbb", "letras repetidas"],
    ["qwrtpl zxcvb", "teclado"],
    ["Juan", "una sola palabra"],
    ["<script>alert(1)</script>", "etiquetas"],
    ["   ", "vacío"],
    ["José@Padilla", "símbolos"],
  ];

  it.each(invalidos)("rechaza %s (%s)", (nombre) => {
    expect(nombreDePersona(nombre).ok).toBe(false);
  });

  it("limpia los espacios de más y devuelve lo que se debe guardar", () => {
    const r = nombreDePersona("  José   Guadalupe   Padilla  ");
    expect(r.ok && r.valor).toBe("José Guadalupe Padilla");
  });

  it("para un paciente basta un nombre", () => {
    expect(nombreDePersona("Rodrigo", { minimoPalabras: 1 }).ok).toBe(true);
    expect(nombreDePersona("Rodrigo1", { minimoPalabras: 1 }).ok).toBe(false);
  });
});

describe("teléfono", () => {
  it("acepta diez dígitos, con o sin lada y con separadores", () => {
    expect(telefonoMexicano("6391227780").ok).toBe(true);
    expect(telefonoMexicano("+52 639 122 7780").ok).toBe(true);
    expect(telefonoMexicano("639-122-7780").ok).toBe(true);
  });

  it("devuelve siempre los diez dígitos limpios", () => {
    const r = telefonoMexicano("+52 639 122 7780");
    expect(r.ok && r.valor).toBe("6391227780");
  });

  it("rechaza lo que no es un teléfono", () => {
    expect(telefonoMexicano("12345").ok).toBe(false);
    expect(telefonoMexicano("0000000000").ok).toBe(false);
  });
});

describe("correo y cédula", () => {
  it("acepta lo correcto y lo guarda en minúsculas", () => {
    const r = correoElectronico("  Doctor@Ejemplo.MX ");
    expect(r.ok && r.valor).toBe("doctor@ejemplo.mx");
  });

  it("rechaza correos mal escritos", () => {
    expect(correoElectronico("doctor@ejemplo").ok).toBe(false);
    expect(correoElectronico("doctor.ejemplo.mx").ok).toBe(false);
  });

  it("la cédula son de seis a nueve dígitos", () => {
    expect(cedulaProfesional("9961014").ok).toBe(true);
    expect(cedulaProfesional("12345").ok).toBe(false);
    expect(cedulaProfesional("99610-14").ok).toBe(false);
  });
});
