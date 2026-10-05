/**
 * Lo que cada plan incluye, y lo que ningún plan compra.
 */

import { describe, expect, it } from "vitest";

import { capacidades, CAPACIDADES, planVigente } from "./planes";

const EN_UN_MES = new Date(Date.now() + 30 * 86_400_000);
const HACE_UN_MES = new Date(Date.now() - 30 * 86_400_000);

describe("qué trae cada plan", () => {
  it("el básico aparece y deja su teléfono, nada más", () => {
    const c = CAPACIDADES.BASICO;
    expect(c.fotografia).toBe(false);
    expect(c.whatsapp).toBe(false);
    expect(c.agenda).toBe(false);
  });

  it("el gold agrega fotografía y contacto directo, pero no agenda", () => {
    const c = CAPACIDADES.GOLD;
    expect(c.fotografia).toBe(true);
    expect(c.whatsapp).toBe(true);
    expect(c.agenda).toBe(false);
  });

  it("el premium agrega la agenda en línea y los recordatorios", () => {
    const c = CAPACIDADES.PREMIUM;
    expect(c.agenda).toBe(true);
    expect(c.recordatorios).toBe(true);
  });

  it("cada plan admite más consultorios que el anterior", () => {
    expect(CAPACIDADES.BASICO.consultorios).toBeLessThan(CAPACIDADES.GOLD.consultorios);
    expect(CAPACIDADES.GOLD.consultorios).toBeLessThan(CAPACIDADES.PREMIUM.consultorios);
  });
});

describe("vencimiento", () => {
  it("un plan pagado conserva sus herramientas", () => {
    expect(planVigente("PREMIUM", EN_UN_MES)).toBe("PREMIUM");
    expect(capacidades("PREMIUM", EN_UN_MES).agenda).toBe(true);
  });

  it("un plan vencido vuelve al básico, sin quitar el perfil", () => {
    expect(planVigente("PREMIUM", HACE_UN_MES)).toBe("BASICO");
    expect(capacidades("GOLD", HACE_UN_MES).whatsapp).toBe(false);
  });

  it("sin fecha de vencimiento, el plan sigue vigente", () => {
    expect(planVigente("GOLD", null)).toBe("GOLD");
  });

  it("el básico nunca vence", () => {
    expect(planVigente("BASICO", HACE_UN_MES)).toBe("BASICO");
  });
});
