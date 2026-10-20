"use server";

/**
 * Las cuentas del equipo que atiende el directorio.
 *
 * Hasta ahora los accesos del equipo se creaban por fuera del panel, lo
 * cual estaba bien mientras el equipo fuera una persona. En cuanto entra
 * alguien a dar soporte hace falta poder darle su propia cuenta, verla
 * en una lista y quitársela el día que se vaya.
 *
 * Tres cosas no se negocian aquí. Nadie puede quitarse a sí mismo el
 * permiso ni desactivarse, porque el panel se quedaría sin dueño y la
 * única salida sería entrar a la base de datos. Nunca puede quedar cero
 * administradores activos, por la misma razón. Y los accesos de los
 * médicos no se tocan desde esta pantalla: esos cuelgan de su perfil y
 * mezclarlos sería dejar que soporte se apropie de una cuenta ajena.
 */

import { claveNueva } from "@/lib/accesos";
import { cifrarClave } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sesionActual } from "@/lib/sesion-actual";

export type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

export type Alta =
  | { ok: true; mensaje: string; correo: string; clave: string }
  | { ok: false; mensaje: string };

/** Los papeles que esta pantalla puede repartir. */
export type RolDeEquipo = "ADMINISTRADOR" | "RECEPCION";

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

async function soloAdministrador(): Promise<{ id: string; nombre: string } | null> {
  const sesion = await sesionActual();
  if (!sesion || sesion.rol !== "ADMINISTRADOR") return null;
  return { id: sesion.id, nombre: sesion.nombre };
}

async function auditar(actor: string, accion: string, detalle: string) {
  await prisma.registroAuditoria.create({
    data: { actor, accion, entidad: "usuario", detalle },
  });
}

export async function crearAccesoDeEquipo(
  nombre: string,
  correo: string,
  rol: RolDeEquipo,
): Promise<Alta> {
  const quien = await soloAdministrador();
  if (!quien) return { ok: false, mensaje: "Solo el administrador puede dar accesos." };

  const limpio = correo.trim().toLowerCase();
  if (nombre.trim().length < 3) {
    return { ok: false, mensaje: "Escriba el nombre de quien va a entrar." };
  }
  if (!CORREO.test(limpio)) {
    return { ok: false, mensaje: "Revise el correo: con ese entra al panel." };
  }

  const existente = await prisma.usuario.findUnique({ where: { correo: limpio } });
  if (existente) {
    return {
      ok: false,
      mensaje: existente.profesionalId
        ? "Ese correo ya es el acceso de un médico. Use otro."
        : "Ese correo ya tiene acceso al panel.",
    };
  }

  const clave = claveNueva();
  await prisma.usuario.create({
    data: {
      nombre: nombre.trim(),
      correo: limpio,
      hashClave: cifrarClave(clave),
      rol,
    },
  });

  await auditar(quien.nombre, "equipo.acceso.creado", `${limpio} como ${rol}`);

  return {
    ok: true,
    mensaje: "Acceso creado. Anote la contraseña: no se vuelve a mostrar.",
    correo: limpio,
    clave,
  };
}

export async function cambiarRolDeEquipo(
  id: string,
  rol: RolDeEquipo,
): Promise<Resultado> {
  const quien = await soloAdministrador();
  if (!quien) return { ok: false, mensaje: "Solo el administrador puede cambiar permisos." };
  if (id === quien.id) {
    return { ok: false, mensaje: "No puede cambiarse a sí mismo el permiso." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "No encontramos ese acceso." };
  if (usuario.profesionalId) {
    return { ok: false, mensaje: "El acceso de un médico se maneja desde su perfil." };
  }

  await prisma.usuario.update({ where: { id }, data: { rol } });
  await auditar(quien.nombre, "equipo.rol.cambiado", `${usuario.correo} a ${rol}`);
  return { ok: true, mensaje: "Permiso actualizado." };
}

export async function activarAcceso(id: string, activo: boolean): Promise<Resultado> {
  const quien = await soloAdministrador();
  if (!quien) return { ok: false, mensaje: "Solo el administrador puede hacer esto." };
  if (id === quien.id) {
    return { ok: false, mensaje: "No puede desactivar su propia cuenta." };
  }

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "No encontramos ese acceso." };
  if (usuario.profesionalId) {
    return { ok: false, mensaje: "El acceso de un médico se maneja desde su perfil." };
  }

  if (!activo && usuario.rol === "ADMINISTRADOR") {
    const quedan = await prisma.usuario.count({
      where: { rol: "ADMINISTRADOR", activo: true, id: { not: id } },
    });
    if (quedan === 0) {
      return {
        ok: false,
        mensaje: "Es el último administrador activo. Nombre a otro antes de quitarlo.",
      };
    }
  }

  await prisma.usuario.update({ where: { id }, data: { activo } });
  await auditar(
    quien.nombre,
    activo ? "equipo.acceso.activado" : "equipo.acceso.desactivado",
    usuario.correo,
  );
  return { ok: true, mensaje: activo ? "Acceso reactivado." : "Acceso desactivado." };
}

export async function reemitirClaveDeEquipo(id: string): Promise<Alta> {
  const quien = await soloAdministrador();
  if (!quien) return { ok: false, mensaje: "Solo el administrador puede hacer esto." };

  const usuario = await prisma.usuario.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "No encontramos ese acceso." };
  if (usuario.profesionalId) {
    return { ok: false, mensaje: "El acceso de un médico se maneja desde su perfil." };
  }

  const clave = claveNueva();
  await prisma.usuario.update({ where: { id }, data: { hashClave: cifrarClave(clave) } });
  await auditar(quien.nombre, "equipo.clave.reemitida", usuario.correo);

  return {
    ok: true,
    mensaje: "Contraseña nueva. Anótela: no se vuelve a mostrar.",
    correo: usuario.correo,
    clave,
  };
}
