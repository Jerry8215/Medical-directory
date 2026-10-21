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
      update: {
        nombre: c.nombre,
        estado: c.estado,
        descripcion: c.descripcion,
        umbralMinimo: c.umbralMinimo ?? null,
        orden,
      },
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
      telefono: p.telefono,
      fotografia: p.fotografia,
      plan: p.plan ?? "BASICO",
    },
    create: {
      slug: p.slug,
      nombre: p.nombre,
      semblanza: p.semblanza,
      convenios: p.convenios,
      telefono: p.telefono,
      fotografia: p.fotografia,
      plan: p.plan ?? "BASICO",
      // La calificación no se siembra: sale de las opiniones que los
      // pacientes dejen y el directorio publique. Un promedio inventado
      // vuelve inútil el que de verdad se gane.
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
 *
 * `ADMIN_PERFIL` liga la cuenta a un profesional. Importa más de lo que
 * parece: el panel ofrece «Mi perfil» solo a quien tiene uno ligado, de
 * modo que un administrador que además es médico y entra sin esa liga no
 * encuentra por dónde editar su propia ficha.
 */
async function crearAdministrador() {
  const correo = (process.env.ADMIN_CORREO ?? "admin@medicosdedelicias.com").toLowerCase();
  const perfil = process.env.ADMIN_PERFIL
    ? await prisma.profesional.findUnique({
        where: { slug: process.env.ADMIN_PERFIL },
        select: { id: true },
      })
    : null;

  const existente = await prisma.usuario.findUnique({ where: { correo } });
  if (existente) {
    if (perfil && !existente.profesionalId) {
      await prisma.usuario.update({
        where: { correo },
        data: { profesionalId: perfil.id },
      });
      console.log(`Administrador ligado a ${process.env.ADMIN_PERFIL}: ${correo}`);
    } else {
      console.log(`Administrador ya existente: ${correo}`);
    }
    return;
  }

  const clave = process.env.ADMIN_CLAVE ?? randomBytes(9).toString("base64url");
  await prisma.usuario.create({
    data: {
      nombre: process.env.ADMIN_NOMBRE ?? "Administrador",
      correo,
      hashClave: cifrarClave(clave),
      rol: "ADMINISTRADOR",
      profesionalId: perfil?.id ?? null,
    },
  });

  console.log(`Administrador creado: ${correo}`);
  if (!process.env.ADMIN_CLAVE) {
    console.log(`Contraseña generada (anótela, no se vuelve a mostrar): ${clave}`);
  }
}

/**
 * Ajustes acordados con el consultorio.
 *
 * Solo se escriben si faltan. El panel es la fuente de estos valores una
 * vez que el sitio anda, así que una recarga no puede pisar lo que el
 * consultorio haya cambiado desde entonces; lo que sí tiene que hacer es
 * no dejarlos vacíos, porque entonces el sitio cobra el precio de lista
 * en lugar del convenido.
 */
async function cargarAjustes() {
  const acordados: Record<string, string> = {
    // En centavos, como todo el dinero del sistema: $190 y $390.
    precio_gold_mensual: "19000",
    precio_premium_mensual: "39000",
  };

  for (const [clave, valor] of Object.entries(acordados)) {
    const existente = await prisma.ajuste.findUnique({ where: { clave } });
    if (!existente) await prisma.ajuste.create({ data: { clave, valor } });
  }
}

async function principal() {
  console.log("Cargando catálogos…");
  await cargarCatalogos();

  console.log("Cargando profesionales…");
  for (const p of [...PROFESIONALES, ...EJEMPLOS]) {
    await cargarProfesional(p);
  }

  await cargarAjustes();

  // Al final: ligar la cuenta a su perfil exige que el perfil ya exista.
  await crearAdministrador();

  const cuenta = await prisma.profesional.count();
  console.log(`Listo: ${cuenta} profesionales en la base.`);
}

principal()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
