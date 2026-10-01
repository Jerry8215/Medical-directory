import { defineConfig, env } from "prisma/config";

/**
 * Configuración de Prisma.
 *
 * Las direcciones de conexión viven acá desde la versión 7. La de consulta
 * pasa por el pooler de Neon, que es lo que conviene para un sitio con
 * muchas visitas cortas; las migraciones exigen conexión directa, así que
 * usan la dirección sin pooler.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // El pooler de Neon acepta también las migraciones, así que basta una
    // dirección. La carga inicial usa la directa por su cuenta, porque
    // escribe mucho de golpe.
    url: env("DATABASE_URL"),
  },
  migrations: {
    // Node 24 ejecuta TypeScript sin compilar, así que no hace falta otra
    // herramienta solo para la carga inicial.
    seed: "node prisma/seed.ts",
  },
});
