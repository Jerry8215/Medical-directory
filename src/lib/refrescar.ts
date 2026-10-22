import { revalidatePath } from "next/cache";

/**
 * Refresca lo que el público ve de un profesional.
 *
 * Las páginas del directorio se sirven guardadas: así es como el sitio
 * aguanta visitas sin consultar la base en cada una. El costo es que un
 * cambio hecho en el panel no se ve afuera hasta que la copia vence, y
 * media hora es una eternidad cuando uno acaba de borrar un perfil y
 * sigue viéndolo publicado.
 *
 * Cada acción que cambia a quién lista el directorio tiene que pasar por
 * aquí. Se borran las tres familias de páginas de listado completas y no
 * la de una ciudad en concreto, porque un médico puede atender en varias
 * y aparecer en la de cada padecimiento que trata: acertar la lista
 * exacta es más frágil que rehacerlas, y rehacerlas cuesta una consulta
 * en la siguiente visita, no en cada una.
 */
export function refrescarDirectorio(slug?: string): void {
  revalidatePath("/");
  // El directorio completo y la pantalla de reserva listan a los mismos
  // médicos que las de ciudad. Se me olvidaron al crearlas, y por eso un
  // perfil borrado desaparecía de la portada pero seguía en «Médicos».
  revalidatePath("/medicos");
  revalidatePath("/agendar");
  revalidatePath("/[ciudad]", "page");
  revalidatePath("/[ciudad]/[especialidad]", "page");
  revalidatePath("/[ciudad]/padecimiento/[padecimiento]", "page");
  revalidatePath("/sitemap.xml");

  if (slug) revalidatePath(`/medico/${slug}`);
  else revalidatePath("/medico/[slug]", "page");
}
