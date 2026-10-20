/**
 * Datos estructurados para los buscadores.
 *
 * Google no lee la página como una persona: lee estas fichas. Dos reglas
 * gobiernan lo que hay aquí.
 *
 * La primera es que una ficha describe lo que la página realmente es. Una
 * página que lista médicos de una ciudad no es un consultorio, por mucho
 * que declararla como tal diera una ficha más vistosa; declararla así es
 * de las cosas que Google penaliza a mano.
 *
 * La segunda es que ninguna ficha afirma algo que la página no muestre.
 * Una calificación en la ficha sin opiniones visibles es la infracción
 * más común y la que cuesta el distintivo entero.
 */

import { urlAbsoluta } from "@/config/sitio";

type Paso = { nombre: string; ruta: string };

/**
 * El rastro de migas, que es lo que Google usa para dibujar la ruta bajo
 * el título en los resultados en lugar de la dirección cruda.
 */
export function migasDeNavegacion(pasos: Paso[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: pasos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.nombre,
      item: urlAbsoluta(p.ruta),
    })),
  };
}

type ParaLista = {
  slug: string;
  nombre: string;
};

/**
 * La lista de profesionales de una página de listado.
 *
 * Se omite la calificación a propósito: la lleva la ficha del perfil, que
 * es donde las opiniones se ven. Repetirla aquí la afirmaría dos veces
 * sobre páginas distintas.
 */
export function listaDeProfesionales(
  nombre: string,
  profesionales: ParaLista[],
  ciudad: { nombre: string; estado: string },
  especialidad?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nombre,
    numberOfItems: profesionales.length,
    itemListElement: profesionales.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Physician",
        name: p.nombre,
        ...(especialidad ? { medicalSpecialty: especialidad } : {}),
        url: urlAbsoluta(`/medico/${p.slug}`),
        address: {
          "@type": "PostalAddress",
          addressLocality: ciudad.nombre,
          addressRegion: ciudad.estado,
          addressCountry: "MX",
        },
      },
    })),
  };
}

/**
 * Varias fichas en una sola etiqueta.
 *
 * Google acepta un arreglo y así la página no se llena de bloques
 * sueltos que después nadie sabe de dónde salieron.
 */
export function fichas(...piezas: object[]) {
  return JSON.stringify(piezas.length === 1 ? piezas[0] : piezas);
}
