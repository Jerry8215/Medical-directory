/**
 * Emitir una contraseña nueva desde la terminal.
 *
 * Es la salida de emergencia para el único caso que el panel no puede
 * resolver solo: que quien olvidó su contraseña sea el administrador. El
 * panel permite reemitir la clave de cualquiera, pero siempre desde una
 * sesión abierta, así que si el administrador queda fuera no queda nadie
 * dentro que pueda devolverle la entrada.
 *
 * Uso:
 *
 *   node scripts/reemitir-clave.ts --lista
 *   node scripts/reemitir-clave.ts correo@ejemplo.com
 *
 * La contraseña se imprime una sola vez y no queda guardada en claro en
 * ninguna parte: lo que se escribe en la base es su resumen scrypt.
 */

// Node ejecuta este archivo directamente y el cliente de Prisma se publica
// como módulo CommonJS, así que se importa por su exportación por defecto.
import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import prismaClient from "@prisma/client";

const { PrismaClient } = prismaClient;

import { cifrarClave } from "../src/lib/auth.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  }),
});

/** Legible al dictarla por teléfono: sin eñes, sin acentos, sin confusiones. */
function claveNueva(): string {
  const alfabeto = "abcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(14);
  return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
}

async function principal() {
  const argumento = process.argv[2];

  if (!argumento || argumento === "--lista") {
    const cuentas = await prisma.usuario.findMany({
      orderBy: [{ rol: "asc" }, { creadoEn: "asc" }],
      select: { correo: true, nombre: true, rol: true, activo: true },
    });
    console.log("\nCuentas del panel:\n");
    for (const c of cuentas) {
      const estado = c.activo ? "activa  " : "inactiva";
      console.log(`  ${estado}  ${c.rol.padEnd(14)}  ${c.correo}  (${c.nombre})`);
    }
    console.log("\nPara emitir una contraseña nueva:");
    console.log("  node scripts/reemitir-clave.ts <correo>\n");
    return;
  }

  const correo = argumento.trim().toLowerCase();
  const usuario = await prisma.usuario.findUnique({ where: { correo } });
  if (!usuario) {
    console.error(`\nNo hay ninguna cuenta con el correo ${correo}.`);
    console.error("Use --lista para ver las que existen.\n");
    process.exitCode = 1;
    return;
  }

  const clave = claveNueva();
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { hashClave: cifrarClave(clave), activo: true },
  });

  // Que quede rastro: una contraseña cambiada fuera del panel es
  // justamente lo que hay que poder explicar después.
  await prisma.registroAuditoria.create({
    data: {
      actor: "terminal",
      accion: "clave.reemitida",
      entidad: "usuario",
      entidadId: usuario.id,
      detalle: `${usuario.correo} · desde la terminal`,
    },
  });

  console.log("\n  Cuenta:      ", usuario.correo);
  console.log("  Nombre:      ", usuario.nombre);
  console.log("  Rol:         ", usuario.rol);
  console.log("  Contraseña:  ", clave);
  console.log("\n  Se muestra una sola vez. Entréguesela y pídale que la");
  console.log("  cambie desde «Mi contraseña» en cuanto entre.\n");
}

principal()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
