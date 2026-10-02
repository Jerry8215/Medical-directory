/**
 * Carga inicial de la base.
 *
 * Lleva a la base los catálogos acordados —ciudades, profesiones,
 * especialidades y padecimientos— y los perfiles con los que se está
 * construyendo el sitio. Es idempotente: se puede correr tantas veces como
 * haga falta sin duplicar nada, porque todo entra por `upsert` contra su
 * dirección única.
 */

// Node ejecuta este archivo directamente y el cliente de Prisma se publica
// como módulo CommonJS, así que se importa por su exportación por defecto.
import { randomBytes } from "node:crypto";

import { PrismaPg } from "@prisma/adapter-pg";
import prismaClient from "@prisma/client";

const { PrismaClient } = prismaClient;

import { cifrarClave } from "../src/lib/auth.ts";
import { EJEMPLOS } from "../src/datos/ejemplos.ts";
import {
  CIUDADES,
  ESPECIALIDADES,
  PROFESIONALES,
  PROFESIONES,
  type Profesional,
} from "../src/datos/semilla.ts";

// La carga inicial escribe mucho de golpe, así que va por la conexión
// directa y no por el pooler.
const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  }),
});

async function cargarCatalogos() {
  for (const p of PROFESIONES) {
    await prisma.profesion.upsert({
      where: { slug: p.slug },
      update: { nombre: p.nombre, exigeConsejo: p.exigeConsejo },
      create: { slug: p.slug, nombre: p.nombre, exigeConsejo: p.exigeConsejo },
    });
  }

  for (const [orden, c] of CIUDADES.entries()) {
    await prisma.ciudad.upsert({
      where: { slug: c.slug },
      update: { nombre: c.nombre, estado: c.estado, descripcion: c.descripcion, orden },
      create: {
        slug: c.slug,
        nombre: c.nombre,
        estado: c.estado,
        descripcion: c.descripcion,
        umbralMinimo: c.umbralMinimo,
        orden,
      },
    });
  }

  for (const [orden, e] of ESPECIALIDADES.entries()) {
    const profesion = await prisma.profesion.findUniqueOrThrow({
      where: { slug: e.profesion },
    });

    const especialidad = await prisma.especialidad.upsert({
      where: { slug: e.slug },
      update: { nombre: e.nombre, descripcion: e.descripcion, orden },
      create: {
        slug: e.slug,
        nombre: e.nombre,
        descripcion: e.descripcion,
        profesionId: profesion.id,
        orden,
      },
    });

    for (const p of e.padecimientos) {
      await prisma.padecimiento.upsert({
        where: {
          especialidadId_slug: { especialidadId: especialidad.id, slug: p.slug },
        },
        update: { nombre: p.nombre },
        create: { slug: p.slug, nombre: p.nombre, especialidadId: especialidad.id },
      });
    }
  }
}

async function cargarProfesional(p: Profesional) {
  const profesion = await prisma.profesion.findUniqueOrThrow({
    where: { slug: p.profesion },
  });

  const profesional = await prisma.profesional.upsert({
    where: { slug: p.slug },
    update: {
      nombre: p.nombre,
      semblanza: p.semblanza,
      convenios: p.convenios,
      calificacion: p.calificacion,
      numeroOpiniones: p.opiniones,
    },
    create: {
      slug: p.slug,
      nombre: p.nombre,
      semblanza: p.semblanza,
      convenios: p.convenios,
      calificacion: p.calificacion,
      numeroOpiniones: p.opiniones,
      profesionId: profesion.id,
      // Un perfil de muestra nunca se publica: existe para revisar el
      // diseño, no para que un paciente lo encuentre.
      estado: p.ejemplo ? "BORRADOR" : "PUBLICADO",
    },
  });

  for (const slug of p.especialidades) {
    const especialidad = await prisma.especialidad.findUniqueOrThrow({
      where: { slug },
    });
    await prisma.profesionalEspecialidad.upsert({
      where: {
        profesionalId_especialidadId: {
          profesionalId: profesional.id,
          especialidadId: especialidad.id,
        },
      },
      update: {},
      create: {
        profesionalId: profesional.id,
        especialidadId: especialidad.id,
        principal: slug === p.especialidades[0],
      },
    });
  }

  // Los consultorios se rehacen en cada carga: son pocos y así no quedan
  // franjas viejas conviviendo con las nuevas.
  await prisma.consultorio.deleteMany({ where: { profesionalId: profesional.id } });

  for (const c of p.consultorios) {
    const ciudad = await prisma.ciudad.findUniqueOrThrow({ where: { slug: c.ciudad } });
    await prisma.consultorio.create({
      data: {
        profesionalId: profesional.id,
        ciudadId: ciudad.id,
        nombre: c.nombre,
        direccion: c.direccion,
        precioValoracion: c.precioValoracion,
        duracionCitaMin: c.duracionCitaMin ?? 30,
        franjas: {
          create: (c.franjas ?? []).map((f) => ({
            dia: f.dia,
            desde: f.desde,
            hasta: f.hasta,
          })),
        },
      },
    });
  }

  await prisma.verificacion.deleteMany({ where: { profesionalId: profesional.id } });

  for (const credencial of p.credenciales) {
    if (!credencial.numero) continue;
    await prisma.verificacion.create({
      data: {
        profesionalId: profesional.id,
        tipo: credencial.tipo,
        numero: credencial.numero,
        institucion: credencial.institucion,
        vigenteHasta: credencial.vigenteHasta
          ? new Date(credencial.vigenteHasta)
          : null,
        estado: "APROBADA",
        evidencia: "Carga inicial con los datos públicos del profesional.",
        revisadaPor: "carga-inicial",
        revisadaEn: new Date(),
      },
    });
  }
}

/**
 * Usuario administrador.
 *
 * La contraseña sale del entorno; si no está, se genera una al azar y se
 * imprime una sola vez. Nunca queda una clave conocida escrita en el
 * código, que es como terminan abiertos los paneles.
 */
async function crearAdministrador() {
  const correo = (process.env.ADMIN_CORREO ?? "admin@medicosdedelicias.com").toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) {
    console.log(`Administrador ya existente: ${correo}`);
    return;
  }

  const clave = process.env.ADMIN_CLAVE ?? randomBytes(9).toString("base64url");
  await prisma.usuario.create({
    data: {
      nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
      correo,
      hashClave: cifrarClave(clave),
      rol: "ADMINISTRADOR",
    },
  });

  console.log(`Administrador creado: ${correo}`);
  if (!process.env.ADMIN_CLAVE) {
    console.log(`Contraseña generada (anótela, no se vuelve a mostrar): ${clave}`);
  }
}

async function principal() {
  await crearAdministrador();

  console.log("Cargando catálogos…");
  await cargarCatalogos();

  console.log("Cargando profesionales…");
  for (const p of [...PROFESIONALES, ...EJEMPLOS]) {
    await cargarProfesional(p);
  }

  const cuenta = await prisma.profesional.count();
  console.log(`Listo: ${cuenta} profesionales en la base.`);
}

principal()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
