import type { MetadataRoute } from "next";

import { urlAbsoluta } from "@/config/sitio";

export default function robots(): MetadataRoute.Robots {
  // Mientras el sitio está en construcción no se indexa nada. La línea se
  // invierte el día de la publicación, con el contenido real cargado.
  const enConstruccion = process.env.SITIO_PUBLICADO !== "si";

  return {
    rules: enConstruccion
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: ["/panel", "/api"] },
    sitemap: urlAbsoluta("/sitemap.xml"),
  };
}
