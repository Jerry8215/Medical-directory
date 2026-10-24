/**
 * El enlace para recuperar la contraseña.
 *
 * Faltaba por completo: la única manera de recuperar una clave era que el
 * administrador la reemitiera desde el panel, de modo que el día en que
 * quien la olvidara fuera el propio administrador no quedaba nadie dentro
 * que pudiera devolverle la entrada. El consultorio lo encontró de la peor
 * forma, quedándose fuera de su propio perfil.
 *
 * Tres decisiones que vale la pena explicar.
 *
 * El token no se guarda en la base. Se firma con el secreto del sitio
 * **y con el resumen de la contraseña actual**, así que en cuanto la
 * contraseña cambia la firma deja de coincidir: el enlace sirve una sola
 * vez sin necesidad de una tabla ni de una migración. Si alguien pide dos
 * enlaces, el segundo invalida al primero recién cuando uno de los dos se
 * usa, que es el comportamiento que la gente espera.
 *
 * Dura una hora. Lo suficiente para leer el correo con calma y poco para
 * que sirva de algo si el buzón se compromete más adelante.
 *
 * Lleva dentro el identificador del usuario, no su correo. El correo puede
 * corregirse; el identificador no cambia nunca.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/** Una hora. */
export const VIGENCIA_MS = 60 * 60 * 1000;

type Carga = { id: string; expira: number };

function firmar(carga: string, secreto: string, hashClave: string): string {
  // El resumen de la contraseña entra en la llave, no en el mensaje: así
  // no viaja en el enlace y aun así lo invalida al cambiar.
  return createHmac("sha256", `${secreto}:${hashClave}`).update(carga).digest("base64url");
}

export function crearToken(
  usuarioId: string,
  hashClave: string,
  secreto: string,
  ahora: number = Date.now(),
): string {
  const carga: Carga = { id: usuarioId, expira: ahora + VIGENCIA_MS };
  const texto = Buffer.from(JSON.stringify(carga)).toString("base64url");
  return `${texto}.${firmar(texto, secreto, hashClave)}`;
}

/** Solo lee a quién apunta, sin comprobar la firma. */
export function usuarioDelToken(token: string): string | null {
  const [texto] = token.split(".");
  if (!texto) return null;
  try {
    const carga = JSON.parse(Buffer.from(texto, "base64url").toString()) as Carga;
    return typeof carga.id === "string" ? carga.id : null;
  } catch {
    return null;
  }
}

export type Revision =
  | { ok: true; id: string }
  | { ok: false; motivo: "ilegible" | "vencido" | "usado" };

/**
 * ¿Sirve este enlace?
 *
 * `usado` cubre dos casos que para quien lo recibe son el mismo: que la
 * contraseña ya se cambiara con este enlace, o que se pidiera uno nuevo
 * después. En los dos la respuesta útil es «pida otro».
 */
export function revisarToken(
  token: string,
  hashClave: string,
  secreto: string,
  ahora: number = Date.now(),
): Revision {
  const [texto, recibida] = token.split(".");
  if (!texto || !recibida) return { ok: false, motivo: "ilegible" };

  let carga: Carga;
  try {
    carga = JSON.parse(Buffer.from(texto, "base64url").toString()) as Carga;
  } catch {
    return { ok: false, motivo: "ilegible" };
  }
  if (typeof carga.id !== "string" || typeof carga.expira !== "number") {
    return { ok: false, motivo: "ilegible" };
  }

  const esperada = firmar(texto, secreto, hashClave);
  const a = Buffer.from(esperada);
  const b = Buffer.from(recibida);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, motivo: "usado" };
  }

  // La caducidad se comprueba después de la firma: así un token manipulado
  // nunca llega a responder «vencido», que ya sería decir algo de él.
  if (carga.expira <= ahora) return { ok: false, motivo: "vencido" };

  return { ok: true, id: carga.id };
}
