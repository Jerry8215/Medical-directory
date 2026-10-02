import { cookies } from "next/headers";

import { COOKIE, leerSesion, type Sesion } from "@/lib/auth";

/** Quién está mirando el panel, o nadie. */
export async function sesionActual(): Promise<Sesion | null> {
  const almacen = await cookies();
  return leerSesion(almacen.get(COOKIE)?.value);
}
