import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Acceso al panel.
 *
 * Sin dependencias externas y con dos decisiones deliberadas:
 *
 *   - La clave se guarda con scrypt y sal propia por usuario. Nunca se
 *     guarda la clave, ni siquiera cifrada.
 *   - La sesión es una cookie firmada, no un identificador que haya que
 *     buscar en la base en cada página. Si alguien le cambia una letra, la
 *     firma deja de coincidir y la sesión se cae.
 *
 * El secreto vive en el entorno. Si falta, el panel no deja entrar a nadie
 * en lugar de aceptar firmas falsificables.
 */

export type Rol = "ADMINISTRADOR" | "RECEPCION" | "PROFESIONAL";

export type Sesion = {
  id: string;
  nombre: string;
  rol: Rol;
  /** Para el rol PROFESIONAL: a qué perfil da acceso. */
  profesionalId?: string;
  expira: number;
};

export const COOKIE = "sesion";
const DIAS = 7;

function secreto(): string | undefined {
  return process.env.AUTH_SECRET;
}

// ----------------------------------------------------------------------
//  Claves
// ----------------------------------------------------------------------

export function cifrarClave(clave: string): string {
  const sal = randomBytes(16);
  const derivada = scryptSync(clave.normalize("NFKC"), sal, 64);
  return `scrypt$${sal.toString("hex")}$${derivada.toString("hex")}`;
}

export function claveCoincide(clave: string, guardada: string): boolean {
  const [algoritmo, salHex, esperadoHex] = guardada.split("$");
  if (algoritmo !== "scrypt" || !salHex || !esperadoHex) return false;

  const esperado = Buffer.from(esperadoHex, "hex");
  const derivada = scryptSync(clave.normalize("NFKC"), Buffer.from(salHex, "hex"), esperado.length);
  return timingSafeEqual(esperado, derivada);
}

// ----------------------------------------------------------------------
//  Sesión
// ----------------------------------------------------------------------

function firma(carga: string, llave: string): string {
  return createHmac("sha256", llave).update(carga).digest("base64url");
}

export function emitirSesion(datos: Omit<Sesion, "expira">): string | null {
  const llave = secreto();
  if (!llave) return null;

  const sesion: Sesion = {
    ...datos,
    expira: Date.now() + DIAS * 24 * 60 * 60 * 1000,
  };
  const carga = Buffer.from(JSON.stringify(sesion)).toString("base64url");
  return `${carga}.${firma(carga, llave)}`;
}

export function leerSesion(cookie: string | undefined): Sesion | null {
  const llave = secreto();
  if (!cookie || !llave) return null;

  const [carga, recibida] = cookie.split(".");
  if (!carga || !recibida) return null;

  const esperada = firma(carga, llave);
  if (
    esperada.length !== recibida.length ||
    !timingSafeEqual(Buffer.from(esperada), Buffer.from(recibida))
  ) {
    return null;
  }

  try {
    const sesion = JSON.parse(Buffer.from(carga, "base64url").toString()) as Sesion;
    return sesion.expira > Date.now() ? sesion : null;
  } catch {
    return null;
  }
}

export const DURACION_SEGUNDOS = DIAS * 24 * 60 * 60;
