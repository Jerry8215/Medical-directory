import { describe, expect, it } from "vitest";

import { manana } from "@/lib/avisos";

/**
 * La ventana del recordatorio.
 *
 * El plan de alojamiento solo deja correr la tarea una vez al día, así que
 * esa única corrida tiene que abarcar el día de mañana completo. La versión
 * anterior miraba de 20 a 28 horas hacia adelante, que corriendo de
 * madrugada dejaba fuera todas las citas de la tarde.
 */
describe("manana", () => {
  it("empieza a la medianoche de Chihuahua, no a la del meridiano", () => {
    // 06-10-2026, 08:00 en Chihuahua.
    const { desde } = manana(new Date("2026-10-06T14:00:00.000Z"));
    expect(desde.toISOString()).toBe("2026-10-07T06:00:00.000Z");
  });

  it("dura exactamente un día", () => {
    const { desde, hasta } = manana(new Date("2026-10-06T14:00:00.000Z"));
    expect(hasta.getTime() - desde.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("alcanza las citas de la tarde, que la ventana vieja perdía", () => {
    const ahora = new Date("2026-10-06T14:00:00.000Z");
    const { desde, hasta } = manana(ahora);
    // Mañana a las 18:00 de Chihuahua.
    const citaDeLaTarde = new Date("2026-10-08T00:00:00.000Z");
    expect(citaDeLaTarde >= desde).toBe(true);
    expect(citaDeLaTarde < hasta).toBe(true);
  });

  it("antes de medianoche local sigue apuntando al día siguiente", () => {
    // 05-10-2026, 23:00 en Chihuahua, que en UTC ya es día 6.
    const { desde } = manana(new Date("2026-10-06T05:00:00.000Z"));
    expect(desde.toISOString()).toBe("2026-10-06T06:00:00.000Z");
  });

  it("cruza el fin de mes", () => {
    const { desde } = manana(new Date("2026-10-31T14:00:00.000Z"));
    expect(desde.toISOString()).toBe("2026-11-01T06:00:00.000Z");
  });

  it("cruza el fin de año", () => {
    const { desde } = manana(new Date("2026-12-31T14:00:00.000Z"));
    expect(desde.toISOString()).toBe("2027-01-01T06:00:00.000Z");
  });
});
