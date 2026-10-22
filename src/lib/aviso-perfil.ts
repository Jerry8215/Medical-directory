/**
 * Avisarle al médico de lo que el consultorio hizo con su perfil.
 *
 * Que a alguien le suspendan o le borren su ficha y se entere porque un
 * paciente le dice que ya no aparece es la peor forma de enterarse. El
 * correo sale en el momento, con el nombre de quien lo hizo.
 *
 * Nunca lanza: el cambio ya ocurrió y un aviso que falla no puede
 * deshacerlo. Lo que sí hace es dejar constancia del fallo en los
 * registros, para que no se pierda en silencio.
 */

import { sitio, urlAbsoluta } from "@/config/sitio";
import { enviarCorreo } from "@/lib/avisos";
import { prisma } from "@/lib/prisma";

export type CambioDePerfil = "suspendido" | "publicado" | "eliminado" | "editado";

const TEXTOS: Record<CambioDePerfil, { asunto: string; cuerpo: string[] }> = {
  suspendido: {
    asunto: "Su perfil dejó de aparecer en el directorio",
    cuerpo: [
      "Un administrador suspendió su perfil, de modo que por ahora no aparece",
      "en el directorio ni se le ofrece a los pacientes.",
      "",
      "Su información se conserva completa: sus consultorios, sus horarios y sus",
      "opiniones siguen ahí y vuelven a verse en cuanto se reactive.",
    ],
  },
  publicado: {
    asunto: "Su perfil volvió a aparecer en el directorio",
    cuerpo: [
      "Un administrador reactivó su perfil. Ya aparece otra vez en el directorio",
      "y los pacientes pueden encontrarlo y agendar con usted.",
    ],
  },
  eliminado: {
    asunto: "Su perfil fue eliminado del directorio",
    cuerpo: [
      "Un administrador eliminó su perfil del directorio. Con él se fueron su",
      "ficha, sus consultorios, sus horarios y su acceso al panel.",
      "",
      "Si esto no era lo esperado, responda a este correo y lo revisamos. Para",
      "volver a aparecer habría que darse de alta otra vez.",
    ],
  },
  editado: {
    asunto: "Un administrador modificó su perfil",
    cuerpo: [
      "Un administrador hizo cambios en su perfil del directorio.",
      "",
      "Conviene que lo revise: si algo no quedó como usted lo quiere, puede",
      "corregirlo desde su acceso.",
    ],
  },
};

export async function avisarCambioDePerfil(
  profesionalId: string,
  cambio: CambioDePerfil,
  porQuien: string,
): Promise<void> {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { profesionalId, activo: true },
      select: { correo: true, nombre: true },
    });
    if (usuarios.length === 0) return;

    const texto = TEXTOS[cambio];
    for (const u of usuarios) {
      await enviarCorreo({
        para: u.correo,
        asunto: `${texto.asunto} · ${sitio.nombre}`,
        cuerpo: [
          `Doctor(a) ${u.nombre}:`,
          "",
          ...texto.cuerpo,
          "",
          cambio === "eliminado"
            ? `Página de alta: ${urlAbsoluta("/planes")}`
            : `Su acceso: ${urlAbsoluta("/panel/acceso")}`,
          "",
          `Lo hizo: ${porQuien}.`,
        ].join("\n"),
      });
    }
  } catch (error) {
    console.error("[perfil] no se pudo avisar del cambio", error);
  }
}
