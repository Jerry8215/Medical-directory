/**
 * Teléfonos con lada internacional.
 *
 * El formulario exigía diez dígitos y nada más, porque al principio todo
 * el mundo era de Delicias. En cuanto la consulta en línea deja de tener
 * frontera, esa regla se vuelve un muro: un paciente de Bogotá, de Madrid
 * o de Houston escribe su número entero y el sitio le dice que revise el
 * teléfono, que es lo último que uno quiere leer cuando el número está
 * bien.
 *
 * Se guarda en formato E.164 —el `+` y los dígitos, sin espacios ni
 * paréntesis— porque es el único que no depende de desde dónde se mire:
 * el mismo número escrito por un mexicano y por un español queda igual, y
 * es el que entiende WhatsApp.
 *
 * La validación es deliberadamente permisiva fuera de México. Conocer la
 * longitud exacta de cada país es una tabla que envejece mal y que, al
 * equivocarse, rechaza números buenos; aquí se comprueba lo que la norma
 * garantiza —entre ocho y quince dígitos contando la lada— y se deja que
 * el mensaje que no llegue sea el que delate un número mal escrito. Para
 * México sí se sabe la regla y sí se aplica: son diez.
 */

export type Pais = {
  /** ISO 3166-1 alfa-2, que es de donde sale la bandera. */
  iso: string;
  nombre: string;
  /** Sin el `+`. */
  lada: string;
};

/**
 * Los países que vale la pena ofrecer, en el orden en que conviene.
 *
 * México primero porque es donde está el consultorio; después el resto de
 * América y España, que es de donde vendrá un paciente hispanohablante
 * que busque consulta en su idioma. No pretende ser la lista completa del
 * mundo: una lista de doscientos países obliga a buscar entre doscientos.
 */
export const PAISES: Pais[] = [
  { iso: "MX", nombre: "México", lada: "52" },
  { iso: "US", nombre: "Estados Unidos", lada: "1" },
  { iso: "CA", nombre: "Canadá", lada: "1" },
  { iso: "ES", nombre: "España", lada: "34" },
  { iso: "AR", nombre: "Argentina", lada: "54" },
  { iso: "BO", nombre: "Bolivia", lada: "591" },
  { iso: "BR", nombre: "Brasil", lada: "55" },
  { iso: "CL", nombre: "Chile", lada: "56" },
  { iso: "CO", nombre: "Colombia", lada: "57" },
  { iso: "CR", nombre: "Costa Rica", lada: "506" },
  { iso: "CU", nombre: "Cuba", lada: "53" },
  { iso: "DO", nombre: "República Dominicana", lada: "1809" },
  { iso: "EC", nombre: "Ecuador", lada: "593" },
  { iso: "SV", nombre: "El Salvador", lada: "503" },
  { iso: "GT", nombre: "Guatemala", lada: "502" },
  { iso: "HN", nombre: "Honduras", lada: "504" },
  { iso: "NI", nombre: "Nicaragua", lada: "505" },
  { iso: "PA", nombre: "Panamá", lada: "507" },
  { iso: "PY", nombre: "Paraguay", lada: "595" },
  { iso: "PE", nombre: "Perú", lada: "51" },
  { iso: "PR", nombre: "Puerto Rico", lada: "1787" },
  { iso: "UY", nombre: "Uruguay", lada: "598" },
  { iso: "VE", nombre: "Venezuela", lada: "58" },
];

export const MEXICO = PAISES[0];

/**
 * La bandera, a partir del código del país.
 *
 * Se calcula en lugar de escribirse: cada letra se desplaza al bloque de
 * «indicadores regionales» de Unicode y el par resultante se dibuja como
 * bandera. Así no hay una tabla de emojis que mantener al lado de la de
 * países, que es donde las dos se desincronizan.
 */
export function bandera(iso: string): string {
  const BASE = 0x1f1e6;
  return [...iso.toUpperCase()]
    .map((letra) => String.fromCodePoint(BASE + letra.charCodeAt(0) - 65))
    .join("");
}

export type Revision =
  | { ok: true; valor: string }
  | { ok: false; motivo: string };

/** Lo que la norma E.164 garantiza, contando la lada. */
const MINIMO = 8;
const MAXIMO = 15;

/**
 * Deja un número en E.164, o explica por qué no se puede.
 *
 * Acepta que la parte nacional venga con la lada repetida al principio,
 * porque mucha gente escribe su número completo aunque ya haya elegido su
 * país en la lista de al lado.
 */
export function normalizarTelefono(lada: string, nacional: string): Revision {
  const codigo = lada.replace(/\D/g, "");
  let digitos = nacional.replace(/\D/g, "");

  if (!codigo) return { ok: false, motivo: "Elija el país de su teléfono." };
  if (!digitos) return { ok: false, motivo: "Escriba su número." };

  // «+52 52 639…» o «5263912…»: la lada escrita dos veces.
  if (digitos.length > codigo.length && digitos.startsWith(codigo)) {
    digitos = digitos.slice(codigo.length);
  }
  // En varios países se marca un 0 antes del número al llamar dentro del
  // país; fuera no se usa.
  digitos = digitos.replace(/^0+/, "");

  if (!digitos) return { ok: false, motivo: "Escriba su número." };

  // Un número de un solo dígito repetido no es un teléfono, es alguien
  // saliendo del paso.
  if (/^(\d)\1+$/.test(digitos) && digitos.length >= 7) {
    return { ok: false, motivo: "Revise el número." };
  }

  if (codigo === MEXICO.lada && digitos.length !== 10) {
    return { ok: false, motivo: "En México el teléfono tiene diez dígitos." };
  }

  const total = codigo.length + digitos.length;
  if (total < MINIMO) return { ok: false, motivo: "El número está incompleto." };
  if (total > MAXIMO) return { ok: false, motivo: "El número tiene demasiados dígitos." };

  return { ok: true, valor: `+${codigo}${digitos}` };
}

/** ¿Está ya en E.164? Para lo que llega guardado de antes. */
export function telefonoInternacional(valor: string): Revision {
  const limpio = valor.trim();
  if (!limpio.startsWith("+")) {
    // Sin `+` no se sabe de dónde es. Lo que se guardó antes de que
    // existiera la lada es mexicano, y así se trata.
    return normalizarTelefono(MEXICO.lada, limpio);
  }
  const digitos = limpio.slice(1).replace(/\D/g, "");
  const pais = paisDe(`+${digitos}`);
  return normalizarTelefono(pais?.lada ?? "", digitos.slice((pais?.lada ?? "").length));
}

/** De qué país es un número E.164, si está en la lista. */
export function paisDe(e164: string): Pais | undefined {
  const digitos = e164.replace(/\D/g, "");
  // La más larga primero: 1787 (Puerto Rico) antes que 1 (Estados Unidos).
  return [...PAISES]
    .sort((a, b) => b.lada.length - a.lada.length)
    .find((p) => digitos.startsWith(p.lada));
}

/** Separa un E.164 en su país y su parte nacional, para volver a editarlo. */
export function separar(e164: string): { pais: Pais; nacional: string } {
  const digitos = e164.replace(/\D/g, "");
  const pais = paisDe(e164) ?? MEXICO;
  const nacional = digitos.startsWith(pais.lada)
    ? digitos.slice(pais.lada.length)
    : digitos;
  return { pais, nacional };
}

/**
 * «+52 639 122 7780», para enseñarlo sin que parezca un número de serie.
 *
 * Grupos de tres, y si al final queda un dígito suelto se pega al grupo
 * anterior: «639 122 778 0» se lee peor que no agrupar nada.
 */
export function telefonoLegible(e164: string): string {
  const { pais, nacional } = separar(e164);
  const grupos = nacional.match(/\d{1,3}/g) ?? [nacional];
  if (grupos.length > 1 && grupos[grupos.length - 1].length === 1) {
    grupos[grupos.length - 2] += grupos.pop();
  }
  return `+${pais.lada} ${grupos.join(" ")}`;
}

/**
 * Lo que WhatsApp espera en una dirección wa.me: dígitos y nada más,
 * siempre con la lada delante.
 *
 * Normaliza antes de limpiar porque conviven dos formatos: lo que se
 * guardó cuando no había lada son diez dígitos mexicanos, y mandarlos a
 * wa.me sin el 52 abre una conversación con un número que no existe.
 */
export function paraWhatsapp(valor: string): string {
  const r = telefonoInternacional(valor);
  return (r.ok ? r.valor : valor).replace(/\D/g, "");
}
