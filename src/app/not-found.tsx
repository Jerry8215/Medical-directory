import type { Metadata } from "next";

import { AvisoDeError } from "@/componentes/AvisoDeError";

export const metadata: Metadata = {
  title: "No encontramos esa página",
  robots: { index: false, follow: true },
};

/**
 * Una dirección que no existe.
 *
 * Pasa con un perfil que se dio de baja, con un enlace viejo que alguien
 * guardó y con una dirección mal escrita. En los tres casos el sitio
 * funciona: lo que no está es esa página.
 */
export default function NoEncontrado() {
  return (
    <AvisoDeError
      titulo="No encontramos esa página"
      cuerpo="Puede que el perfil ya no esté publicado o que la dirección haya cambiado. El resto del directorio funciona con normalidad."
    />
  );
}
