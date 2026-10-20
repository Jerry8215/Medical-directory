import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * Las fotografías de los médicos viven en el almacén de Vercel, no en
     * el repositorio. Sin declarar el dominio, Next se niega a servirlas y
     * la tarjeta del médico revienta en cuanto alguien sube la primera.
     *
     * Se declara ese almacén y nada más: una lista abierta convertiría al
     * sitio en un redimensionador de imágenes gratuito para cualquiera.
     */
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
