import { describe, expect, it } from "vitest";

import {
  crearEnlace,
  emitirSesionPaciente,
  leerEnlace,
  leerSesionPaciente,
  VIGENCIA_ENLACE_MS,
} from "@/lib/sesion-paciente";

const LLAVE = "llave-del-sitio";
const AHORA = 1_800_000_000_000;

describe("el enlace del correo", () => {
  it("deja entrar a quien lo recibió", () => {
    const e = crearEnlace("p1", LLAVE, AHORA);
    expect(leerEnlace(e, LLAVE, AHORA + 1000)).toBe("p1");
  });

  it("caduca a la hora", () => {
    const e = crearEnlace("p1", LLAVE, AHORA);
    expect(leerEnlace(e, LLAVE, AHORA + VIGENCIA_ENLACE_MS - 1)).toBe("p1");
    expect(leerEnlace(e, LLAVE, AHORA + VIGENCIA_ENLACE_MS)).toBeNull();
  });

  it("no sirve con otra llave ni manipulado", () => {
    const e = crearEnlace("p1", LLAVE, AHORA);
    expect(leerEnlace(e, "otra", AHORA + 1000)).toBeNull();

    const [, firma] = e.split(".");
    const otro = Buffer.from(JSON.stringify({ id: "p2", expira: AHORA + 9e6 })).toString(
      "base64url",
    );
    expect(leerEnlace(`${otro}.${firma}`, LLAVE, AHORA + 1000)).toBeNull();
  });
});

describe("la cookie de sesión", () => {
  it("conserva quién es y por cuánto", () => {
    const c = emitirSesionPaciente({ id: "p1", nombre: "Ana" }, LLAVE, AHORA);
    const s = leerSesionPaciente(c, LLAVE, AHORA + 1000);
    expect(s?.id).toBe("p1");
    expect(s?.nombre).toBe("Ana");
  });

  it("no deja pasar nada sin llave o sin cookie", () => {
    const c = emitirSesionPaciente({ id: "p1", nombre: "Ana" }, LLAVE, AHORA);
    expect(leerSesionPaciente(c, undefined, AHORA)).toBeNull();
    expect(leerSesionPaciente(undefined, LLAVE, AHORA)).toBeNull();
    expect(leerSesionPaciente("basura", LLAVE, AHORA)).toBeNull();
  });
});

describe("las dos firmas no se confunden", () => {
  it("un enlace de una hora no sirve de sesión de un mes", () => {
    // Sin etiquetas distintas, reutilizar el enlace como cookie
    // convertiría una hora de vigencia en treinta días.
    const e = crearEnlace("p1", LLAVE, AHORA);
    expect(leerSesionPaciente(e, LLAVE, AHORA + 1000)).toBeNull();
  });

  it("ni una cookie sirve de enlace", () => {
    const c = emitirSesionPaciente({ id: "p1", nombre: "Ana" }, LLAVE, AHORA);
    expect(leerEnlace(c, LLAVE, AHORA + 1000)).toBeNull();
  });
});
