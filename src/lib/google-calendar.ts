/**
 * Agenda de Google, para el plan Premium.
 *
 * El médico sigue administrando su calendario de siempre: comparte su
 * agenda con la dirección de servicio del directorio y pega el
 * identificador del calendario en su perfil. A partir de ahí, lo que él
 * apunte allá bloquea el horario acá, y lo que el paciente reserve acá
 * aparece allá.
 *
 * Se usa una cuenta de servicio y no el acceso con «Entrar con Google» a
 * propósito: así ningún médico tiene que pasar por la revisión de permisos
 * sensibles de Google, que tarda semanas, y nadie entrega su contraseña.
 */

import { createSign } from "node:crypto";

type CuentaServicio = { client_email: string; private_key: string };

export type Ocupado = { inicio: Date; fin: Date };

const ALCANCE = "https://www.googleapis.com/auth/calendar";

function cuenta(): CuentaServicio | null {
  const crudo = process.env.GOOGLE_CUENTA_SERVICIO;
  if (!crudo) return null;
  try {
    const datos = JSON.parse(crudo) as CuentaServicio;
    if (!datos.client_email || !datos.private_key) return null;
    return { ...datos, private_key: datos.private_key.replace(/\\n/g, "\n") };
  } catch {
    console.error("[google] la cuenta de servicio no es un JSON válido");
    return null;
  }
}

/** La dirección que el médico debe invitar a su calendario. */
export function direccionDeServicio(): string | null {
  return cuenta()?.client_email ?? null;
}

export function configurado(): boolean {
  return cuenta() !== null;
}

function base64url(dato: string | Buffer): string {
  return Buffer.from(dato).toString("base64url");
}

/**
 * Credencial de acceso.
 *
 * Google no acepta la llave directamente: hay que firmar con ella una
 * petición y canjearla por un testigo de una hora. Se guarda en memoria
 * mientras dure, porque pedir uno nuevo en cada consulta multiplicaría la
 * latencia de cada página de perfil.
 */
let testigo: { valor: string; expira: number } | null = null;

async function credencial(): Promise<string | null> {
  const datos = cuenta();
  if (!datos) return null;

  if (testigo && testigo.expira > Date.now() + 60_000) return testigo.valor;

  const ahora = Math.floor(Date.now() / 1000);
  const cabecera = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const cuerpo = base64url(
    JSON.stringify({
      iss: datos.client_email,
      scope: ALCANCE,
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    }),
  );

  const firma = createSign("RSA-SHA256")
    .update(`${cabecera}.${cuerpo}`)
    .sign(datos.private_key)
    .toString("base64url");

  const respuesta = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${cabecera}.${cuerpo}.${firma}`,
    }),
  });

  if (!respuesta.ok) {
    console.error("[google] no se pudo obtener credencial:", respuesta.status);
    return null;
  }

  const datosToken = (await respuesta.json()) as { access_token: string; expires_in: number };
  testigo = {
    valor: datosToken.access_token,
    expira: Date.now() + datosToken.expires_in * 1000,
  };
  return testigo.valor;
}

/**
 * Lo que el médico ya tiene ocupado en su calendario.
 *
 * Si Google falla, se devuelve `null` y no una lista vacía: una lista vacía
 * significaría «está todo libre» y el directorio ofrecería horarios que el
 * médico tiene comprometidos.
 */
export async function ocupadoEnGoogle(
  calendarioId: string,
  desde: Date,
  hasta: Date,
): Promise<Ocupado[] | null> {
  const acceso = await credencial();
  if (!acceso) return null;

  try {
    const respuesta = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${acceso}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: desde.toISOString(),
        timeMax: hasta.toISOString(),
        items: [{ id: calendarioId }],
      }),
    });

    if (!respuesta.ok) {
      console.error("[google] freeBusy respondió", respuesta.status);
      return null;
    }

    const datos = (await respuesta.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }>;
    };

    const calendario = datos.calendars?.[calendarioId];
    if (!calendario || calendario.errors?.length) {
      console.error("[google] el calendario no respondió:", calendario?.errors);
      return null;
    }

    return (calendario.busy ?? []).map((b) => ({
      inicio: new Date(b.start),
      fin: new Date(b.end),
    }));
  } catch (error) {
    console.error("[google] falló la consulta de disponibilidad", error);
    return null;
  }
}

/**
 * Escribe la cita en el calendario del médico.
 *
 * Devuelve el identificador del evento, o `null` si no se pudo. Quien llama
 * decide qué hacer: la cita del directorio ya existe, así que una falla acá
 * no debe perderla.
 */
export async function crearEvento({
  calendarioId,
  titulo,
  descripcion,
  inicio,
  fin,
  zona = "America/Chihuahua",
}: {
  calendarioId: string;
  titulo: string;
  descripcion: string;
  inicio: Date;
  fin: Date;
  zona?: string;
}): Promise<string | null> {
  const acceso = await credencial();
  if (!acceso) return null;

  try {
    const respuesta = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarioId,
      )}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${acceso}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: titulo,
          description: descripcion,
          start: { dateTime: inicio.toISOString(), timeZone: zona },
          end: { dateTime: fin.toISOString(), timeZone: zona },
        }),
      },
    );

    if (!respuesta.ok) {
      console.error("[google] no se pudo crear el evento:", respuesta.status);
      return null;
    }

    const evento = (await respuesta.json()) as { id?: string };
    return evento.id ?? null;
  } catch (error) {
    console.error("[google] falló la creación del evento", error);
    return null;
  }
}

export async function cancelarEvento(
  calendarioId: string,
  eventoId: string,
): Promise<boolean> {
  const acceso = await credencial();
  if (!acceso) return false;

  const respuesta = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarioId,
    )}/events/${encodeURIComponent(eventoId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${acceso}` } },
  );

  // 410 es «ya estaba borrado», que para quien llama es lo mismo que haberlo
  // borrado ahora.
  return respuesta.ok || respuesta.status === 410;
}

/** Comprueba que el médico ya compartió su calendario con el directorio. */
export async function probarCalendario(
  calendarioId: string,
): Promise<{ ok: boolean; mensaje: string }> {
  if (!configurado()) {
    return {
      ok: false,
      mensaje: "El directorio todavía no tiene configurada su cuenta de servicio de Google.",
    };
  }

  const ahora = new Date();
  const ocupado = await ocupadoEnGoogle(
    calendarioId,
    ahora,
    new Date(ahora.getTime() + 7 * 24 * 60 * 60_000),
  );

  if (ocupado === null) {
    return {
      ok: false,
      mensaje:
        "No pudimos leer ese calendario. Verifique el identificador y que lo haya compartido con la dirección del directorio, con permiso para hacer cambios.",
    };
  }

  return {
    ok: true,
    mensaje: `Conectado. Leímos ${ocupado.length} compromiso(s) en los próximos siete días.`,
  };
}
