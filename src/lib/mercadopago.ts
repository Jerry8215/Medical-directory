/**
 * Cobro con tarjeta, por suscripción recurrente.
 *
 * Hasta ahora el dinero entraba solo por transferencia: el médico elegía
 * plan, depositaba, reportaba su referencia y alguien del consultorio la
 * aprobaba a mano. Funciona, pero depende de que alguien revise, y lo que
 * no se revisa un lunes se cobra el jueves.
 *
 * Esto no reemplaza al depósito, lo acompaña. El depósito sigue siendo la
 * única vía que no depende de ningún proveedor, y es la que queda si esto
 * no está configurado: sin credenciales, `configurado()` responde que no y
 * el panel ni siquiera ofrece la tarjeta, en lugar de ofrecer un botón que
 * lleva a un error.
 *
 * Las credenciales viven en el entorno y nunca en el código:
 *
 *   MERCADOPAGO_ACCESS_TOKEN   — token de la cuenta que cobra
 *   MERCADOPAGO_WEBHOOK_SECRET — clave con la que se firman los avisos
 *
 * Lo que se puede comprobar sin pedirle nada a nadie —el manifiesto de la
 * firma, la conversión de centavos a pesos, la lectura de la cabecera—
 * está en funciones puras al principio del archivo y se prueba solo.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

import type { Periodicidad } from "@/lib/suscripciones";

const API = "https://api.mercadopago.com";

/** Hay con qué cobrar. Sin esto, el panel no ofrece la tarjeta. */
export function configurado(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

/** Se pueden comprobar los avisos que llegan. */
export function firmaConfigurada(): boolean {
  return Boolean(process.env.MERCADOPAGO_WEBHOOK_SECRET);
}

// ----------------------------------------------------------------------
//  Lo comprobable, sin red
// ----------------------------------------------------------------------

/**
 * De centavos a la cantidad que entiende el procesador.
 *
 * Adentro el dinero son centavos enteros; afuera, pesos con dos
 * decimales. La conversión va en un solo lugar y redondeada a propósito:
 * 29900 / 100 da 299 exacto, pero 30050 / 100 da 300.5 y hay montos que
 * en coma flotante quedan en 300.49999999999994. Cobrar un centavo de
 * menos no se nota; cobrar uno de más, sí.
 */
export function aMonto(centavos: number): number {
  return Math.round(centavos) / 100;
}

/** Cada cuánto se cobra, en el vocabulario del procesador. */
export function frecuencia(periodicidad: Periodicidad): {
  frequency: number;
  frequency_type: "months";
} {
  return {
    frequency: periodicidad === "ANUAL" ? 12 : 1,
    frequency_type: "months",
  };
}

/**
 * Lee la cabecera `x-signature`, que llega como `ts=...,v1=...`.
 *
 * El orden de las partes no está garantizado, así que se leen por nombre
 * y no por posición: confiar en el orden es la clase de suposición que
 * funciona en las pruebas y falla el día del primer cobro real.
 */
export function partesDeFirma(cabecera: string | null): { ts: string; v1: string } | null {
  if (!cabecera) return null;
  const partes = new Map<string, string>();
  for (const trozo of cabecera.split(",")) {
    const corte = trozo.indexOf("=");
    if (corte < 0) continue;
    partes.set(trozo.slice(0, corte).trim(), trozo.slice(corte + 1).trim());
  }
  const ts = partes.get("ts");
  const v1 = partes.get("v1");
  return ts && v1 ? { ts, v1 } : null;
}

/**
 * El texto que se firma.
 *
 * El formato lo fija el procesador y los puntos y comas finales cuentan:
 * sobra o falta uno y toda firma legítima se rechaza. El identificador va
 * en minúsculas cuando trae letras, como pide su documentación.
 */
export function manifiesto(dataId: string, requestId: string | null, ts: string): string {
  const id = /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId;
  return `id:${id};request-id:${requestId ?? ""};ts:${ts};`;
}

/**
 * ¿El aviso viene de quien dice venir?
 *
 * Sin esto, cualquiera que adivine la dirección del webhook puede
 * regalarse un plan Premium mandando un POST. La comparación es de tiempo
 * constante porque comparar firmas con `===` filtra, carácter a carácter,
 * cuánto se acertó.
 */
export function firmaValida(
  dataId: string,
  requestId: string | null,
  cabecera: string | null,
  secreto: string | undefined = process.env.MERCADOPAGO_WEBHOOK_SECRET,
): boolean {
  if (!secreto) return false;
  const partes = partesDeFirma(cabecera);
  if (!partes) return false;

  const esperada = createHmac("sha256", secreto)
    .update(manifiesto(dataId, requestId, partes.ts))
    .digest("hex");

  const a = Buffer.from(esperada, "utf8");
  const b = Buffer.from(partes.v1, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ----------------------------------------------------------------------
//  Lo que sí habla con el procesador
// ----------------------------------------------------------------------

class ErrorDelProcesador extends Error {
  constructor(
    public readonly estado: number,
    public readonly cuerpo: string,
  ) {
    super(`mercadopago ${estado}: ${cuerpo.slice(0, 300)}`);
    this.name = "ErrorDelProcesador";
  }
}

async function pedir<T>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; idempotencia?: string } = {},
): Promise<T> {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN.");

  const cabeceras: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  // Un reintento de red no puede cobrar dos veces: con esta clave, el
  // segundo intento devuelve lo mismo que el primero en lugar de crear
  // otra suscripción.
  if (opciones.idempotencia) cabeceras["X-Idempotency-Key"] = opciones.idempotencia;

  const respuesta = await fetch(`${API}${ruta}`, {
    method: opciones.metodo ?? "GET",
    headers: cabeceras,
    body: opciones.cuerpo ? JSON.stringify(opciones.cuerpo) : undefined,
    cache: "no-store",
  });

  const texto = await respuesta.text();
  if (!respuesta.ok) throw new ErrorDelProcesador(respuesta.status, texto);
  return texto ? (JSON.parse(texto) as T) : ({} as T);
}

export type Suscripcion = {
  id: string;
  /** A dónde mandar al médico para que autorice el cobro. */
  init_point: string;
  status: string;
  external_reference?: string;
};

/**
 * Crea la suscripción y devuelve a dónde mandar al médico.
 *
 * Nace en `pending`: no se cobra nada hasta que él autoriza desde esa
 * dirección. El `external_reference` es nuestro id de pago, que es como
 * el aviso de vuelta encuentra a quién acreditarle el mes.
 */
export async function crearSuscripcion(datos: {
  pagoId: string;
  concepto: string;
  correo: string;
  centavos: number;
  periodicidad: Periodicidad;
  volverA: string;
}): Promise<Suscripcion> {
  return pedir<Suscripcion>("/preapproval", {
    metodo: "POST",
    idempotencia: datos.pagoId,
    cuerpo: {
      reason: datos.concepto,
      external_reference: datos.pagoId,
      payer_email: datos.correo,
      back_url: datos.volverA,
      status: "pending",
      auto_recurring: {
        ...frecuencia(datos.periodicidad),
        transaction_amount: aMonto(datos.centavos),
        currency_id: "MXN",
      },
    },
  });
}

export type EstadoSuscripcionProveedor = {
  id: string;
  status: string;
  external_reference?: string;
  payer_email?: string;
};

export async function consultarSuscripcion(
  id: string,
): Promise<EstadoSuscripcionProveedor> {
  return pedir<EstadoSuscripcionProveedor>(`/preapproval/${id}`);
}

/**
 * Dar de baja el cobro automático.
 *
 * No devuelve dinero ni quita el plan: el médico se queda con lo que ya
 * pagó hasta que venza, y al vencer el perfil vuelve al básico sin
 * desaparecer del directorio. Cancelar es dejar de cobrar, no castigar.
 */
export async function cancelarSuscripcion(id: string): Promise<void> {
  await pedir(`/preapproval/${id}`, {
    metodo: "PUT",
    cuerpo: { status: "cancelled" },
  });
}

export type CobroDeSuscripcion = {
  id: number | string;
  preapproval_id: string;
  status: string;
  transaction_amount?: number;
  payment?: { id?: number | string; status?: string };
};

/** Un cobro concreto de una suscripción, el de este mes. */
export async function consultarCobro(id: string): Promise<CobroDeSuscripcion> {
  return pedir<CobroDeSuscripcion>(`/authorized_payments/${id}`);
}
