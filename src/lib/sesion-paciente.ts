/**
 * La sesión del paciente, sin contraseña.
 *
 * Un paciente no va a inventar y recordar una contraseña para escribirle
 * una vez a un médico. Pedírsela es perder a la mitad en la primera
 * pantalla, que es exactamente lo que se quiere evitar: la consulta en
 * línea compite con mandar un WhatsApp, no con llenar un formulario.
 *
 * Se identifica con su correo y su WhatsApp, y entra por un enlace que
 * le llega al correo. El enlace es la prueba de que esa dirección es
 * suya; no hay nada más que comprobar, porque no hay nada más que
 * proteger: la sala solo contiene lo que él mismo escribió.
 *
 * La cookie es firmada, igual que la del panel, y por la misma razón: si
 * alguien le cambia una letra, la firma deja de coincidir y la sesión se
 * cae, en lugar de dejarlo entrar como otra persona.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export const COOKIE_PACIENTE = "paciente";

/** Treinta días. El paciente vuelve a su sala días después, no minutos. */
const DIAS = 30;
export const DURACION_SEGUNDOS = DIAS * 24 * 60 * 60;

/** El enlace del correo dura una hora, como el de recuperar contraseña. */
export const VIGENCIA_ENLACE_MS = 60 * 60 * 1000;

export type SesionPaciente = { id: string; nombre: string; expira: number };

function firmar(carga: string, llave: string): string {
  return createHmac("sha256", llave).update(carga).digest("base64url");
}

function compara(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function empaquetar(datos: object, llave: string, etiqueta: string): string {
  const carga = Buffer.from(JSON.stringify(datos)).toString("base64url");
  return `${carga}.${firmar(`${etiqueta}:${carga}`, llave)}`;
}

function desempaquetar<T>(valor: string, llave: string, etiqueta: string): T | null {
  const [carga, recibida] = valor.split(".");
  if (!carga || !recibida) return null;
  if (!compara(firmar(`${etiqueta}:${carga}`, llave), recibida)) return null;
  try {
    return JSON.parse(Buffer.from(carga, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

// ----------------------------------------------------------------------
//  El enlace que llega al correo
// ----------------------------------------------------------------------

/**
 * El enlace de entrada.
 *
 * Lleva su propia etiqueta en la firma para que no se pueda usar como
 * cookie de sesión ni al revés: son dos cosas con vigencias muy
 * distintas y mezclarlas convertiría un enlace de una hora en una sesión
 * de un mes.
 */
export function crearEnlace(
  pacienteId: string,
  llave: string,
  ahora: number = Date.now(),
): string {
  return empaquetar(
    { id: pacienteId, expira: ahora + VIGENCIA_ENLACE_MS },
    llave,
    "enlace",
  );
}

export function leerEnlace(
  valor: string,
  llave: string,
  ahora: number = Date.now(),
): string | null {
  const carga = desempaquetar<{ id: string; expira: number }>(valor, llave, "enlace");
  if (!carga || typeof carga.id !== "string") return null;
  return carga.expira > ahora ? carga.id : null;
}

// ----------------------------------------------------------------------
//  La cookie
// ----------------------------------------------------------------------

export function emitirSesionPaciente(
  datos: { id: string; nombre: string },
  llave: string,
  ahora: number = Date.now(),
): string {
  return empaquetar(
    { ...datos, expira: ahora + DURACION_SEGUNDOS * 1000 },
    llave,
    "sesion",
  );
}

export function leerSesionPaciente(
  cookie: string | undefined,
  llave: string | undefined,
  ahora: number = Date.now(),
): SesionPaciente | null {
  if (!cookie || !llave) return null;
  const sesion = desempaquetar<SesionPaciente>(cookie, llave, "sesion");
  if (!sesion || typeof sesion.id !== "string") return null;
  return sesion.expira > ahora ? sesion : null;
}
