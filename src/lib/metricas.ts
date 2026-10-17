/**
 * Métricas de un perfil: cuántos lo vieron y cuántos quisieron contactarlo.
 *
 * El número suelto no le dice nada al médico. «Cuarenta vistas» puede ser
 * mucho o poco según la especialidad y según el mes; lo que sí le dice
 * algo es «cuarenta, y el promedio de Cirugía General es noventa y
 * cinco». Por eso todo lo de acá termina en una comparación y no en un
 * dato aislado.
 *
 * Las funciones puras viven en este archivo y las consultas en
 * `metricas-datos.ts`, para poder probar el cálculo sin base de datos.
 */

const ZONA = 6 * 60 * 60_000; // Chihuahua, UTC−6 todo el año

export type Tipo = "vista" | "telefono" | "whatsapp";

export const TIPOS: Tipo[] = ["vista", "telefono", "whatsapp"];

export function esTipo(valor: unknown): valor is Tipo {
  return typeof valor === "string" && (TIPOS as string[]).includes(valor);
}

/**
 * La medianoche del día al que pertenece un instante, en hora local.
 *
 * Agrupar por el día UTC partiría la tarde de Chihuahua en dos: a las
 * seis de la tarde ya es el día siguiente en Greenwich, y el médico vería
 * sus visitas de la tarde contadas en el día equivocado.
 */
export function diaLocal(instante: Date): Date {
  const local = new Date(instante.getTime() - ZONA);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) + ZONA,
  );
}

/** El primer día del mes al que pertenece un instante, en hora local. */
export function inicioDeMes(instante: Date): Date {
  const local = new Date(instante.getTime() - ZONA);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) + ZONA);
}

export type Conteo = {
  vistas: number;
  telefono: number;
  whatsapp: number;
  citas: number;
};

export const EN_CERO: Conteo = { vistas: 0, telefono: 0, whatsapp: 0, citas: 0 };

export function sumar(filas: Omit<Conteo, "citas">[], citas = 0): Conteo {
  return filas.reduce<Conteo>(
    (a, f) => ({
      vistas: a.vistas + f.vistas,
      telefono: a.telefono + f.telefono,
      whatsapp: a.whatsapp + f.whatsapp,
      citas: a.citas,
    }),
    { ...EN_CERO, citas },
  );
}

/**
 * Cuántos de los que vieron el perfil hicieron algo.
 *
 * Es el número que de verdad importa: un perfil muy visto que nadie
 * contacta tiene un problema de contenido, no de visibilidad.
 */
export function conversion(c: Conteo): number | null {
  if (c.vistas === 0) return null;
  return Math.round(((c.telefono + c.whatsapp + c.citas) / c.vistas) * 1000) / 10;
}

export type Comparacion = {
  /** Cuánto se separa del promedio, en por ciento. Positivo es mejor. */
  diferencia: number | null;
  /** Lo que se le dice al médico, en una línea. */
  frase: string;
};

/**
 * Comparar contra el promedio de la especialidad.
 *
 * Con un solo médico en la especialidad no hay con quién compararse, y
 * decir «está un cero por ciento por encima del promedio» sería una forma
 * elegante de mentir. En ese caso se dice que todavía no hay comparación.
 */
export function compararVistas(
  mias: number,
  promedio: number | null,
  cuantosEnLaEspecialidad: number,
): Comparacion {
  if (promedio === null || cuantosEnLaEspecialidad < 2) {
    return {
      diferencia: null,
      frase: "Todavía no hay otros médicos de su especialidad con quienes comparar.",
    };
  }
  if (promedio === 0) {
    return {
      diferencia: null,
      frase: "Su especialidad todavía no registra visitas este mes.",
    };
  }

  const diferencia = Math.round(((mias - promedio) / promedio) * 100);
  const media = Math.round(promedio);

  if (diferencia >= 10) {
    return {
      diferencia,
      frase: `Lo buscaron ${diferencia}% más que al promedio de su especialidad, que está en ${media}.`,
    };
  }
  if (diferencia <= -10) {
    return {
      diferencia,
      frase: `Lo buscaron ${Math.abs(diferencia)}% menos que al promedio de su especialidad, que está en ${media}.`,
    };
  }
  return {
    diferencia,
    frase: `Está en el promedio de su especialidad, que es de ${media} visitas.`,
  };
}

/**
 * Qué conviene hacer, según lo que muestran los números.
 *
 * Es lo que convierte un reporte en una razón para mejorar el perfil o
 * para subir de plan, y está escrito con lo que el médico puede hacer hoy,
 * no con lo que quisiéramos venderle.
 */
export function sugerencia(c: Conteo, puedeWhatsapp: boolean, tieneFoto: boolean): string | null {
  if (c.vistas === 0) {
    return "Su perfil todavía no recibe visitas. Cargar sus padecimientos lo hace aparecer en más búsquedas.";
  }
  if (!tieneFoto) {
    return "Su perfil no tiene fotografía. Es lo primero que mira el paciente al comparar.";
  }
  if (!puedeWhatsapp && c.vistas >= 20) {
    return "Lo están viendo, pero no tiene botón de WhatsApp: el paciente tiene que copiar su número para escribirle.";
  }
  const tasa = conversion(c);
  if (tasa !== null && tasa < 5 && c.vistas >= 30) {
    return "Muchos ven su perfil y pocos lo contactan. Revise que su teléfono, horarios y precio estén completos.";
  }
  return null;
}
