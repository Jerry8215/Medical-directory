import { describe, expect, it, vi } from "vitest";

import { intentar, SIN_RESPUESTA } from "@/lib/intentar";

describe("intentar", () => {
  it("devuelve tal cual lo que contestó la acción", async () => {
    const r = await intentar(async () => ({ ok: true as const, mensaje: "Guardado." }));
    expect(r).toEqual({ ok: true, mensaje: "Guardado." });
  });

  it("no se come un «no se pudo» legítimo", async () => {
    const r = await intentar(async () => ({ ok: false as const, mensaje: "Esa cita no es suya." }));
    expect(r.ok).toBe(false);
    expect(r.mensaje).toBe("Esa cita no es suya.");
  });

  it("convierte el fallo en un mensaje en lugar de dejar la pantalla igual", async () => {
    // Esto es lo que pasaba con la base caída: la promesa se rompía dentro
    // del startTransition y no aparecía nada.
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await intentar(async () => {
      throw new Error("503");
    });
    expect(r.ok).toBe(false);
    expect(r.mensaje).toBe(SIN_RESPUESTA);
    expect(consola).toHaveBeenCalled();
    consola.mockRestore();
  });

  it("deja usar el mensaje propio de cada pantalla", async () => {
    const consola = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await intentar(
      async () => {
        throw new Error("sin red");
      },
      "No se pudo subir la fotografía.",
    );
    expect(r.mensaje).toBe("No se pudo subir la fotografía.");
    consola.mockRestore();
  });
});
