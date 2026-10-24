"use server";

/**
 * El interruptor con el que el médico se prende y se apaga.
 *
 * Una plataforma de dos lados necesita que ambos estén presentes al mismo
 * tiempo, y con la consulta inmediata eso se vuelve literal. Un médico
 * que aparece disponible cuando está operando le queda mal al paciente y
 * se queda sin cobrar, así que el interruptor tiene que estar a un toque
 * y no escondido en un formulario largo.
 *
 * El precio va junto al interruptor a propósito: sin precio cargado no se
 * le ofrece, y pedirle que lo busque en otra pantalla es garantizar que
 * se prenda sin él.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { refrescarDirectorio } from "@/lib/refrescar";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: boolean; mensaje: string };

/** Lo que cuesta como mínimo y como máximo, en centavos. */
const MINIMO = 10000;
const MAXIMO = 500000;

export async function fijarDisponibilidadEnLinea(
  slug: string,
  enLinea: boolean,
  precioPesos: number,
): Promise<Resultado> {
  const sesion = await sesionActual();
  if (!sesion) return { ok: false, mensaje: "Su sesión expiró." };

  const profesional = await prisma.profesional.findUnique({
    where: { slug },
    select: { id: true, estado: true },
  });
  if (!profesional) return { ok: false, mensaje: "Ese perfil ya no existe." };

  const suyo =
    sesion.profesionalId === profesional.id ||
    sesion.rol === "ADMINISTRADOR" ||
    sesion.rol === "RECEPCION";
  if (!suyo) return { ok: false, mensaje: "Ese perfil no es suyo." };

  const centavos = Math.round(precioPesos * 100);

  if (enLinea) {
    if (!Number.isFinite(centavos) || centavos < MINIMO || centavos > MAXIMO) {
      return {
        ok: false,
        mensaje: `Ponga un precio entre ${MINIMO / 100} y ${MAXIMO / 100} pesos antes de prenderse.`,
      };
    }
    if (profesional.estado !== "PUBLICADO") {
      return {
        ok: false,
        mensaje: "Su perfil todavía no está publicado, así que el paciente no lo vería.",
      };
    }
  }

  await prisma.profesional.update({
    where: { id: profesional.id },
    data: {
      enLinea,
      // El precio se guarda aunque se apague: al volver a prenderse, no
      // tiene por qué escribirlo de nuevo.
      precioConsultaLinea: centavos >= MINIMO && centavos <= MAXIMO ? centavos : undefined,
    },
  });

  await prisma.registroAuditoria.create({
    data: {
      actor: sesion.nombre,
      accion: enLinea ? "consulta.disponible" : "consulta.no_disponible",
      entidad: "profesional",
      entidadId: slug,
    },
  });

  revalidatePath(`/panel/profesionales/${slug}`);
  refrescarDirectorio(slug);
  return {
    ok: true,
    mensaje: enLinea
      ? "Ya aparece disponible para consulta en línea."
      : "Ya no aparece disponible. Las salas abiertas siguen abiertas.",
  };
}
