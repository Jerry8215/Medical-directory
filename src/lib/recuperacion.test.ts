import { describe, expect, it } from "vitest";

import {
  crearToken,
  revisarToken,
  usuarioDelToken,
  VIGENCIA_MS,
} from "@/lib/recuperacion";

const SECRETO = "secreto-del-sitio";
const HASH = "scrypt$aabb$ccdd";
const AHORA = 1_800_000_000_000;

describe("crearToken y revisarToken", () => {
  it("acepta el enlace que acaba de emitirse", () => {
    const t = crearToken("u1", HASH, SECRETO, AHORA);
    expect(revisarToken(t, HASH, SECRETO, AHORA + 1000)).toEqual({ ok: true, id: "u1" });
  });

  it("deja de servir al cambiar la contraseña", () => {
    // Es lo que lo vuelve de un solo uso sin necesidad de una tabla: el
    // resumen de la clave entra en la llave de la firma.
    const t = crearToken("u1", HASH, SECRETO, AHORA);
    const otroHash = "scrypt$eeff$0011";
    expect(revisarToken(t, otroHash, SECRETO, AHORA + 1000)).toEqual({
      ok: false,
      motivo: "usado",
    });
  });

  it("caduca a la hora", () => {
    const t = crearToken("u1", HASH, SECRETO, AHORA);
    expect(revisarToken(t, HASH, SECRETO, AHORA + VIGENCIA_MS - 1).ok).toBe(true);
    expect(revisarToken(t, HASH, SECRETO, AHORA + VIGENCIA_MS)).toEqual({
      ok: false,
      motivo: "vencido",
    });
  });

  it("rechaza una firma de otro secreto", () => {
    const t = crearToken("u1", HASH, SECRETO, AHORA);
    expect(revisarToken(t, HASH, "otro-secreto", AHORA + 1000).ok).toBe(false);
  });

  it("no acepta un token manipulado", () => {
    const t = crearToken("u1", HASH, SECRETO, AHORA);
    const [texto, firma] = t.split(".");
    // Cambiar a quién apunta sin poder rehacer la firma.
    const otro = Buffer.from(JSON.stringify({ id: "u2", expira: AHORA + VIGENCIA_MS }))
      .toString("base64url");
    expect(revisarToken(`${otro}.${firma}`, HASH, SECRETO, AHORA + 1000).ok).toBe(false);
    expect(revisarToken(`${texto}.xx`, HASH, SECRETO, AHORA + 1000).ok).toBe(false);
  });

  it("no dice «vencido» de un token que ni siquiera está firmado", () => {
    // Responder «vencido» a una firma falsa ya sería decir algo de ella.
    const viejo = crearToken("u1", HASH, SECRETO, AHORA - 2 * VIGENCIA_MS);
    const [texto] = viejo.split(".");
    expect(revisarToken(`${texto}.falsa`, HASH, SECRETO, AHORA)).toEqual({
      ok: false,
      motivo: "usado",
    });
  });

  it("no se traga cualquier cosa", () => {
    for (const basura of ["", ".", "sinpunto", "a.b", "%%%.%%%"]) {
      expect(revisarToken(basura, HASH, SECRETO, AHORA).ok).toBe(false);
    }
  });
});

describe("usuarioDelToken", () => {
  it("lee a quién apunta sin comprobar la firma", () => {
    // Hace falta para poder buscar el hash con el que se comprueba.
    const t = crearToken("abc123", HASH, SECRETO, AHORA);
    expect(usuarioDelToken(t)).toBe("abc123");
  });

  it("devuelve nada si no se puede leer", () => {
    expect(usuarioDelToken("")).toBeNull();
    expect(usuarioDelToken("%%%.firma")).toBeNull();
  });
});
