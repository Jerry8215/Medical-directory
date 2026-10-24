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

  // Las dos pantallas que existen precisamente para quien no tiene
  // sesión. Mandar a «entrar» a quien olvidó su contraseña lo devuelve al
  // problema del que venía huyendo.
  if (
    pathname.startsWith("/panel/acceso") ||
    pathname.startsWith("/panel/recuperar")
  ) {
    return NextResponse.next();
  }

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
