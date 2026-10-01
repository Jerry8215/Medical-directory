/**
 * Configuración del sitio.
 *
 * El nombre de la plataforma no está escrito dentro del código: vive acá y
 * se puede cambiar por variable de entorno. Fue un requisito explícito del
 * consultorio, y además es lo que permite que el mismo sistema atienda otra
 * marca o se renombre sin tocar una sola página.
 */

export const sitio = {
  nombre: process.env.NEXT_PUBLIC_SITIO_NOMBRE ?? "Médicos de Delicias",
  bajada:
    process.env.NEXT_PUBLIC_SITIO_BAJADA ??
    "y la región centro-sur de Chihuahua",
  dominio: process.env.NEXT_PUBLIC_SITIO_DOMINIO ?? "medicosdedelicias.com",
  correo: process.env.NEXT_PUBLIC_SITIO_CORREO ?? "",
  /**
   * Mínimo de profesionales para publicar una página de catálogo. Mientras
   * no se alcanza, la página no se publica ni se informa al buscador: una
   * página de especialidad con un solo médico es contenido delgado y
   * perjudica al resto del sitio.
   *
   * El valor vive también en la base (Ajuste `umbral_publicacion`) para que
   * el panel lo cambie sin desplegar; este es el respaldo.
   */
  umbralPublicacion: Number(process.env.UMBRAL_PUBLICACION ?? 4),
} as const;

export function urlAbsoluta(ruta: string): string {
  const base = process.env.NEXT_PUBLIC_SITIO_URL ?? `https://${sitio.dominio}`;
  return new URL(ruta, base).toString();
}
