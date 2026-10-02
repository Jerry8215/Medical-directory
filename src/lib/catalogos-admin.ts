"use server";

/**
 * Administración de catálogos.
 *
 * Es el requisito que el consultorio pidió por escrito: abrir una
 * especialidad nueva, una ciudad o un padecimiento no debe requerir
 * programación. Al crearse, la entrada genera su propia página, su
 * dirección y su entrada en el mapa del sitio, y se publica sola cuando
 * reúne el mínimo de profesionales configurado.
 *
 * La dirección (el «slug») se calcula una vez y no se vuelve a tocar:
 * cambiarla después rompería los enlaces que Google ya indexó y las
 * direcciones que algún médico compartió.
 */

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

function aSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

async function soloAdministrador(): Promise<string | null> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") return null;
  return sesion.nombre;
}

async function auditar(actor: string, accion: string, detalle: string) {
  await prisma.registroAuditoria.create({ data: { actor, accion, detalle } });
}

function refrescar() {
  revalidatePath("/panel/catalogos");
  revalidatePath("/panel");
  revalidatePath("/");
}

// ----------------------------------------------------------------------
//  Ciudades
// ----------------------------------------------------------------------

export async function crearCiudad(
  nombre: string,
  descripcion: string,
  umbral?: number,
): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) return { ok: false, mensaje: "Solo el administrador puede abrir ciudades." };
  if (nombre.trim().length < 3) return { ok: false, mensaje: "Escriba el nombre de la ciudad." };

  const slug = aSlug(nombre);
  if (await prisma.ciudad.findUnique({ where: { slug } })) {
    return { ok: false, mensaje: "Esa ciudad ya está en el catálogo." };
  }

  const ultima = await prisma.ciudad.findFirst({ orderBy: { orden: "desc" } });

  await prisma.ciudad.create({
    data: {
      nombre: nombre.trim(),
      slug,
      descripcion: descripcion.trim() || null,
      umbralMinimo: umbral && umbral > 0 ? umbral : null,
      orden: (ultima?.orden ?? 0) + 1,
    },
  });

  await auditar(actor, "catalogo.ciudad.creada", nombre.trim());
  refrescar();
  return {
    ok: true,
    mensaje: `${nombre.trim()} queda abierta. Su página se publicará al reunir el mínimo de profesionales.`,
  };
}

export async function ajustarCiudad(
  slug: string,
  cambios: { umbral?: number | null; activa?: boolean },
): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) return { ok: false, mensaje: "Solo el administrador puede cambiar esto." };

  await prisma.ciudad.update({
    where: { slug },
    data: {
      ...(cambios.umbral !== undefined
        ? { umbralMinimo: cambios.umbral && cambios.umbral > 0 ? cambios.umbral : null }
        : {}),
      ...(cambios.activa !== undefined ? { activa: cambios.activa } : {}),
    },
  });

  await auditar(actor, "catalogo.ciudad.ajustada", `${slug} ${JSON.stringify(cambios)}`);
  refrescar();
  return { ok: true, mensaje: "Ciudad actualizada." };
}

// ----------------------------------------------------------------------
//  Especialidades y padecimientos
// ----------------------------------------------------------------------

export async function crearEspecialidad(
  nombre: string,
  profesionSlug: string,
  descripcion: string,
): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) {
    return { ok: false, mensaje: "Solo el administrador puede abrir especialidades." };
  }
  if (nombre.trim().length < 3) return { ok: false, mensaje: "Escriba el nombre." };
  if (descripcion.trim().length < 40) {
    // Una página sin texto propio es contenido delgado: no la abre Google y
    // además arrastra al resto del sitio.
    return {
      ok: false,
      mensaje:
        "Escriba una descripción de al menos cuarenta caracteres: sin texto propio la página no sirve para buscadores.",
    };
  }

  const profesion = await prisma.profesion.findUnique({ where: { slug: profesionSlug } });
  if (!profesion) return { ok: false, mensaje: "Esa profesión no existe." };

  const slug = aSlug(nombre);
  if (await prisma.especialidad.findUnique({ where: { slug } })) {
    return { ok: false, mensaje: "Esa especialidad ya está en el catálogo." };
  }

  const ultima = await prisma.especialidad.findFirst({ orderBy: { orden: "desc" } });

  await prisma.especialidad.create({
    data: {
      nombre: nombre.trim(),
      slug,
      descripcion: descripcion.trim(),
      profesionId: profesion.id,
      orden: (ultima?.orden ?? 0) + 1,
    },
  });

  await auditar(actor, "catalogo.especialidad.creada", nombre.trim());
  refrescar();
  return {
    ok: true,
    mensaje: `${nombre.trim()} queda abierta en todas las ciudades. Cada página se publicará al reunir el mínimo.`,
  };
}

export async function crearPadecimiento(
  nombre: string,
  especialidadSlug: string,
): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) {
    return { ok: false, mensaje: "Solo el administrador puede agregar padecimientos." };
  }
  if (nombre.trim().length < 3) return { ok: false, mensaje: "Escriba el padecimiento." };

  const especialidad = await prisma.especialidad.findUnique({
    where: { slug: especialidadSlug },
  });
  if (!especialidad) return { ok: false, mensaje: "Esa especialidad no existe." };

  const slug = aSlug(nombre);
  const repetido = await prisma.padecimiento.findUnique({
    where: { especialidadId_slug: { especialidadId: especialidad.id, slug } },
  });
  if (repetido) return { ok: false, mensaje: "Ese padecimiento ya está en el catálogo." };

  await prisma.padecimiento.create({
    data: { nombre: nombre.trim(), slug, especialidadId: especialidad.id },
  });

  await auditar(actor, "catalogo.padecimiento.creado", `${nombre.trim()} (${especialidad.nombre})`);
  refrescar();
  return {
    ok: true,
    mensaje: `«${nombre.trim()}» queda disponible, con su página por ciudad.`,
  };
}

export async function crearProfesion(
  nombre: string,
  exigeConsejo: boolean,
): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) return { ok: false, mensaje: "Solo el administrador puede abrir profesiones." };
  if (nombre.trim().length < 3) return { ok: false, mensaje: "Escriba el nombre." };

  const slug = aSlug(nombre);
  if (await prisma.profesion.findUnique({ where: { slug } })) {
    return { ok: false, mensaje: "Esa profesión ya existe." };
  }

  await prisma.profesion.create({ data: { nombre: nombre.trim(), slug, exigeConsejo } });
  await auditar(actor, "catalogo.profesion.creada", nombre.trim());
  refrescar();
  return {
    ok: true,
    mensaje: exigeConsejo
      ? `${nombre.trim()} queda abierta. Se le exigirá cédula y certificación de consejo vigente.`
      : `${nombre.trim()} queda abierta. Se le exigirá cédula profesional.`,
  };
}

// ----------------------------------------------------------------------
//  Umbral general
// ----------------------------------------------------------------------

export async function ajustarUmbralGeneral(valor: number): Promise<Resultado> {
  const actor = await soloAdministrador();
  if (!actor) return { ok: false, mensaje: "Solo el administrador puede cambiar el mínimo." };
  if (!Number.isFinite(valor) || valor < 1 || valor > 50) {
    return { ok: false, mensaje: "El mínimo debe estar entre 1 y 50." };
  }

  await prisma.ajuste.upsert({
    where: { clave: "umbral_publicacion" },
    update: { valor: String(Math.round(valor)) },
    create: { clave: "umbral_publicacion", valor: String(Math.round(valor)) },
  });

  await auditar(actor, "catalogo.umbral", String(valor));
  refrescar();
  return {
    ok: true,
    mensaje: `El mínimo general queda en ${Math.round(valor)} profesionales por página.`,
  };
}
