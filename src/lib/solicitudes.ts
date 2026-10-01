"use server";

/**
 * Solicitudes de alta de profesionales.
 *
 * Mientras no hay base de datos conectada, las solicitudes se registran en
 * la bitácora del servidor y la respuesta al profesional es la misma. Es
 * deliberado: así el formulario se puede revisar y corregir con el
 * consultorio antes de que exista el panel, y el día que se conecte la base
 * solo cambia la línea que guarda.
 */

export type Solicitud = {
  nombre: string;
  correo: string;
  telefono: string;
  especialidad: string;
  ciudad: string;
  cedula: string;
  consejo?: string;
  consultorio?: string;
  mensaje?: string;
};

export type Resultado =
  | { ok: true }
  | { ok: false; errores: Partial<Record<keyof Solicitud, string>> };

const CEDULA = /^\d{6,9}$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Diez dígitos, con o sin espacios, guiones o lada entre paréntesis. */
function telefonoValido(valor: string): boolean {
  return /^\d{10}$/.test(valor.replace(/\D/g, "").replace(/^52/, ""));
}

export async function registrarSolicitud(datos: Solicitud): Promise<Resultado> {
  const errores: Partial<Record<keyof Solicitud, string>> = {};

  if (datos.nombre.trim().length < 5) {
    errores.nombre = "Escriba su nombre completo, como aparece en su cédula.";
  }
  if (!CORREO.test(datos.correo.trim())) {
    errores.correo = "Revise el correo: ahí le avisamos del resultado.";
  }
  if (!telefonoValido(datos.telefono)) {
    errores.telefono = "El teléfono debe tener diez dígitos.";
  }
  if (!CEDULA.test(datos.cedula.trim())) {
    errores.cedula = "La cédula profesional son de seis a nueve dígitos.";
  }
  if (!datos.especialidad) {
    errores.especialidad = "Elija su especialidad.";
  }
  if (!datos.ciudad) {
    errores.ciudad = "Elija la ciudad donde atiende.";
  }

  if (Object.keys(errores).length > 0) {
    return { ok: false, errores };
  }

  // Acá entra el guardado en la base y el aviso al administrador. Hasta
  // entonces queda registrado del lado del servidor, con la cédula
  // recortada porque no hace falta tenerla completa en una bitácora.
  console.info("[solicitud de alta]", {
    nombre: datos.nombre,
    especialidad: datos.especialidad,
    ciudad: datos.ciudad,
    cedula: datos.cedula.slice(0, 3) + "…",
    recibida: new Date().toISOString(),
  });

  return { ok: true };
}
