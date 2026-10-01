import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Cliente de base de datos.
 *
 * En desarrollo, Next recarga los módulos a cada cambio y cada recarga
 * abriría una conexión nueva hasta agotar el servidor; por eso el cliente
 * se guarda en el ámbito global.
 *
 * `hayBaseDeDatos` existe porque el sitio tiene que poder levantarse sin
 * base: así se revisa el diseño y se despliega una vista previa aunque la
 * base esté caída o todavía no exista.
 */

const guardado = globalThis as unknown as { prisma?: PrismaClient };

export const hayBaseDeDatos = Boolean(process.env.DATABASE_URL);

/**
 * El controlador de PostgreSQL avisa que `sslmode=require` va a cambiar de
 * significado y pide decir explícitamente qué se espera. Neon entrega la
 * dirección con ese parámetro, así que se completa acá en lugar de pedirle
 * al consultorio que edite una variable que no escribió.
 */
function conCompatibilidadSsl(url: string | undefined): string | undefined {
  if (!url || url.includes("uselibpqcompat")) return url;
  if (!url.includes("sslmode=require")) return url;
  return `${url}&uselibpqcompat=true`;
}

export const prisma =
  guardado.prisma ??
  new PrismaClient({
    // El sitio hace muchas consultas cortas, así que conviene el pooler.
    adapter: new PrismaPg({
      connectionString: conCompatibilidadSsl(process.env.DATABASE_URL),
    }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  guardado.prisma = prisma;
}
