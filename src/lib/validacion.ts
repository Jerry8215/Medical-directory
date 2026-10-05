/**
 * Validaciones compartidas.
 *
 * El nombre es el caso que más duele: es lo que se publica en el perfil, lo
 * que lee el paciente y lo que aparece en la agenda del médico. Sin una
 * regla, entra «asdf123» y queda publicado.
 *
 * La regla acepta cómo se escriben los nombres de verdad en México —acentos,
 * diéresis, apellidos compuestos, guiones, apóstrofos y abreviaturas como
 * «Dr.»— y rechaza dígitos, símbolos y las cadenas de teclado que no son un
 * nombre.
 */

const LETRAS = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";

/** Letras, espacios, guiones, apóstrofos y puntos de abreviatura. */
const FORMA = new RegExp(`^[${LETRAS}][${LETRAS}'’.\\- ]*[${LETRAS}.]$`);

/** Tres consonantes seguidas sin vocal: «asdfg», «qwrtp». */
const SIN_VOCALES = new RegExp(
  `[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]{5,}`,
);

export type Revision = { ok: true; valor: string } | { ok: false; motivo: string };

/**
 * Nombre de una persona.
 *
 * Devuelve el nombre ya limpio —sin espacios de más— para guardar eso y no
 * lo que se escribió con el dedo resbalado.
 */
export function nombreDePersona(
  entrada: string,
  { minimoPalabras = 2 }: { minimoPalabras?: number } = {},
): Revision {
  const valor = entrada.trim().replace(/\s+/g, " ");

  if (valor.length < 4) {
    return { ok: false, motivo: "Escriba el nombre completo." };
  }
  if (valor.length > 80) {
    return { ok: false, motivo: "Ese nombre es demasiado largo." };
  }
  if (/\d/.test(valor)) {
    return { ok: false, motivo: "El nombre no puede llevar números." };
  }
  if (!FORMA.test(valor)) {
    return {
      ok: false,
      motivo: "El nombre solo puede llevar letras, espacios, guiones y acentos.",
    };
  }

  const palabras = valor.split(" ").filter((p) => p.replace(/[.'’-]/g, "").length > 0);
  if (palabras.length < minimoPalabras) {
    return {
      ok: false,
      motivo:
        minimoPalabras > 1
          ? "Escriba nombre y apellido."
          : "Escriba su nombre.",
    };
  }

  // «AAAA», «xxxxx»: una sola letra repetida no es un nombre.
  if (palabras.some((p) => p.length > 2 && new Set(p.toLowerCase()).size === 1)) {
    return { ok: false, motivo: "Revise el nombre: parece escrito al azar." };
  }

  if (SIN_VOCALES.test(valor)) {
    return { ok: false, motivo: "Revise el nombre: parece escrito al azar." };
  }

  return { ok: true, valor };
}

/** Diez dígitos, con o sin lada del país, espacios o guiones. */
export function telefonoMexicano(entrada: string): Revision {
  const digitos = entrada.replace(/\D/g, "").replace(/^52/, "");
  if (digitos.length !== 10) {
    return { ok: false, motivo: "El teléfono debe tener diez dígitos." };
  }
  if (/^(\d)\1{9}$/.test(digitos)) {
    return { ok: false, motivo: "Revise el teléfono." };
  }
  return { ok: true, valor: digitos };
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function correoElectronico(entrada: string): Revision {
  const valor = entrada.trim().toLowerCase();
  if (!CORREO.test(valor)) {
    return { ok: false, motivo: "Revise el correo electrónico." };
  }
  return { ok: true, valor };
}

/** La cédula profesional mexicana: de seis a nueve dígitos. */
export function cedulaProfesional(entrada: string): Revision {
  const valor = entrada.trim();
  if (!/^\d{6,9}$/.test(valor)) {
    return { ok: false, motivo: "La cédula profesional son de seis a nueve dígitos." };
  }
  return { ok: true, valor };
}
