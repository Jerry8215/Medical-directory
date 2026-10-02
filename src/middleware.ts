import { NextResponse, type NextRequest } from "next/server";

import { COOKIE, leerSesion } from "@/lib/auth";

/**
 * El panel no se abre sin sesión.
 *
 * Se resuelve acá y no en cada página para que agregar una pantalla nueva
 * no implique acordarse de protegerla.
 */
export function middleware(peticion: NextRequest) {
  const { pathname } = peticion.nextUrl;

  if (pathname.startsWith("/panel/acceso")) return NextResponse.next();

  if (!leerSesion(peticion.cookies.get(COOKIE)?.value)) {
    const destino = new URL("/panel/acceso", peticion.url);
    return NextResponse.redirect(destino);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/panel/:path*"],
  // Verificar la firma usa crypto de Node, que el entorno de borde no
  // ofrece completo.
  runtime: "nodejs",
};
