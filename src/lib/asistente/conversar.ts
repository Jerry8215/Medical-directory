/**
 * El asistente del directorio.
 *
 * Mismo criterio que el asistente del consultorio, que ya atiende pacientes
 * reales: primero la barrera clínica, después lo que se puede resolver con
 * los datos del directorio, y solo entonces el modelo de lenguaje.
 *
 * Sin clave de OpenAI el asistente sigue funcionando con las respuestas
 * construidas a partir de la base. El paciente no se queda sin atención
 * porque un proveedor esté caído o porque todavía no se contrate.
 */

import { sitio } from "@/config/sitio";
import {
  buscarProfesionales,
  catalogoVigente,
  consultarDisponibilidad,
  especialidadDe,
  type ProfesionalEncontrado,
} from "@/lib/asistente/herramientas";
import { evaluar, normalizar, RESTRICCIONES } from "@/lib/asistente/seguridad";

export type Turno = { quien: "paciente" | "asistente"; texto: string };

export type Respuesta = {
  texto: string;
  /** Perfiles que el paciente puede abrir desde el chat. */
  sugerencias: { slug: string; nombre: string; especialidad: string }[];
  /** De dónde salió: sirve para medir cuánto se resuelve sin pagar modelo. */
  origen: "barrera" | "catalogo" | "ia";
};

const SALUDO =
  "Buen día. Soy el asistente de " +
  sitio.nombre +
  ". Puedo ayudarle a encontrar al especialista que necesita y a dejar su " +
  "cita agendada. ¿Qué le ocurre o a qué especialista busca?";

function esSaludo(t: string): boolean {
  return /^(hola|buenas|buen dia|buenos dias|buenas tardes|buenas noches|que tal|saludos)[\s!.,¿?]*$/.test(
    t,
  );
}

function listar(encontrados: ProfesionalEncontrado[]): string {
  return encontrados
    .map((p) => {
      const precio = p.precio ? `, consulta $${p.precio}` : "";
      return `· ${p.nombre} — ${p.especialidad}, en ${p.consultorio} (${p.ciudad})${precio}. Atiende ${p.horario}.`;
    })
    .join("\n");
}

/**
 * Respuesta construida con la base, sin pagar modelo.
 *
 * Cubre lo que pregunta la mayoría —quién atiende tal cosa, dónde, cuánto
 * cuesta, qué horarios hay—, que es justamente lo que un modelo contestaría
 * repitiendo estos mismos datos.
 */
async function conCatalogo(mensaje: string): Promise<Respuesta | null> {
  const t = normalizar(mensaje);
  const { ciudades } = await catalogoVigente();

  if (esSaludo(t)) {
    return { texto: SALUDO, sugerencias: [], origen: "catalogo" };
  }

  const ciudad = ciudades.find((c) => t.includes(normalizar(c.nombre)));

  // ¿Pregunta por los horarios de alguien en concreto?
  const porNombre = await buscarProfesionales({ texto: t.split(" ").slice(-2).join(" "), limite: 1 });
  if (/horario|disponib|cuando (?:atiende|puede)|agendar con/.test(t) && porNombre[0]) {
    const agenda = await consultarDisponibilidad(porNombre[0].slug);
    if (agenda && agenda.dias.length > 0) {
      const proximos = agenda.dias
        .slice(0, 3)
        .map((d) => `${d.etiqueta}: ${d.horas.slice(0, 4).join(", ")}`)
        .join("\n");
      return {
        texto:
          `${porNombre[0].nombre} tiene estos horarios libres en ${agenda.consultorio}:\n${proximos}\n\n` +
          "Puede elegir el suyo desde su perfil y la cita queda confirmada al instante.",
        sugerencias: [
          {
            slug: porNombre[0].slug,
            nombre: porNombre[0].nombre,
            especialidad: porNombre[0].especialidad,
          },
        ],
        origen: "catalogo",
      };
    }
  }

  // Primero por cómo lo dice la gente: «niños», «embarazo», «vesícula».
  const especialidad = especialidadDe(t);
  if (especialidad) {
    const encontrados = await buscarProfesionales({
      especialidad,
      ciudad: ciudad?.slug,
      limite: 4,
    });
    if (encontrados.length > 0) {
      const donde = ciudad ? ` en ${ciudad.nombre}` : "";
      return {
        texto:
          `Esto es lo que encontré${donde}:
${listar(encontrados)}

` +
          "¿Quiere que le muestre los horarios disponibles de alguno?",
        sugerencias: encontrados.map((p) => ({
          slug: p.slug,
          nombre: p.nombre,
          especialidad: p.especialidad,
        })),
        origen: "catalogo",
      };
    }
    if (ciudad) {
      // La especialidad existe, pero no en esa ciudad: conviene decirlo y
      // ofrecer las cercanas, en vez de contestar que no hay nadie.
      const enOtras = await buscarProfesionales({ especialidad, limite: 3 });
      if (enOtras.length > 0) {
        return {
          texto:
            `En ${ciudad.nombre} todavía no tengo a nadie de esa especialidad, ` +
            `pero sí en las ciudades cercanas:
${listar(enOtras)}`,
          sugerencias: enOtras.map((p) => ({
            slug: p.slug,
            nombre: p.nombre,
            especialidad: p.especialidad,
          })),
          origen: "catalogo",
        };
      }
    }
  }

  // Después, por texto libre contra nombres y padecimientos.
  const palabras = t
    .replace(/[¿?¡!.,]/g, " ")
    .split(" ")
    .filter((p) => p.length > 3);

  for (const palabra of palabras) {
    const encontrados = await buscarProfesionales({
      texto: palabra,
      ciudad: ciudad?.slug,
      limite: 4,
    });
    if (encontrados.length > 0) {
      const donde = ciudad ? ` en ${ciudad.nombre}` : "";
      return {
        texto:
          `Esto es lo que encontré${donde}:\n${listar(encontrados)}\n\n` +
          "¿Quiere que le muestre los horarios disponibles de alguno?",
        sugerencias: encontrados.map((p) => ({
          slug: p.slug,
          nombre: p.nombre,
          especialidad: p.especialidad,
        })),
        origen: "catalogo",
      };
    }
  }

  return null;
}

/** ¿Hay modelo disponible? */
export function iaDisponible(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

async function conModelo(
  mensaje: string,
  historial: Turno[],
): Promise<Respuesta | null> {
  const clave = process.env.OPENAI_API_KEY;
  if (!clave) return null;

  const { ciudades, especialidades } = await catalogoVigente();
  const encontrados = await buscarProfesionales({ texto: mensaje, limite: 6 });

  const sistema = `Eres el asistente de ${sitio.nombre}, un directorio de médicos
con cédula verificada en Delicias, Meoqui, Saucillo, Rosales y Camargo, Chihuahua.

Hablas de usted, en español mexicano natural, con mensajes cortos de dos o tres
oraciones y una sola pregunta por mensaje. Nunca tutees.

${RESTRICCIONES}

Ciudades del directorio: ${ciudades.map((c) => c.nombre).join(", ")}.
Especialidades: ${especialidades.map((e) => e.nombre).join(", ")}.

Profesionales que coinciden con lo que pregunta, con sus datos reales:
${encontrados.length > 0 ? listar(encontrados) : "(ninguno coincide con esa búsqueda)"}

Si no hay coincidencias, dilo con naturalidad y ofrece buscar en otra ciudad o
en otra especialidad. Nunca anuncies que vas a buscar: contesta con lo que
tienes.`;

  const mensajes = [
    { role: "system", content: sistema },
    ...historial.slice(-6).map((t) => ({
      role: t.quien === "paciente" ? "user" : "assistant",
      content: t.texto,
    })),
    { role: "user", content: mensaje },
  ];

  const respuesta = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${clave}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODELO ?? "gpt-4o-mini",
      messages: mensajes,
      temperature: 0.4,
      max_tokens: 320,
    }),
  });

  if (!respuesta.ok) {
    console.error("[asistente] OpenAI respondió", respuesta.status);
    return null;
  }

  const datos = await respuesta.json();
  const texto: string | undefined = datos.choices?.[0]?.message?.content;
  if (!texto) return null;

  return {
    texto,
    sugerencias: encontrados.slice(0, 4).map((p) => ({
      slug: p.slug,
      nombre: p.nombre,
      especialidad: p.especialidad,
    })),
    origen: "ia",
  };
}

export async function conversar(
  mensaje: string,
  historial: Turno[] = [],
): Promise<Respuesta> {
  // 1. La barrera clínica va antes que todo, y el modelo nunca ve lo que
  //    ella bloquea.
  const veredicto = evaluar(mensaje);
  if (veredicto.accion !== "continuar") {
    return { texto: veredicto.respuesta, sugerencias: [], origen: "barrera" };
  }

  // 2. Lo que el directorio puede contestar con sus propios datos sale
  //    gratis y sin esperar a un proveedor.
  const delCatalogo = await conCatalogo(mensaje);
  if (delCatalogo) return delCatalogo;

  // 3. Y lo que nadie previó, al modelo, si está configurado.
  const delModelo = await conModelo(mensaje, historial);
  if (delModelo) return delModelo;

  return {
    texto:
      "No encontré especialistas para eso en el directorio. ¿Me dice en qué " +
      "ciudad está y qué tipo de atención busca? Si lo prefiere, puede " +
      "revisar las especialidades disponibles en la página principal.",
    sugerencias: [],
    origen: "catalogo",
  };
}
