/**
 * Las formas que viajan entre el servidor y el navegador.
 *
 * Viven aparte de `catalogo.ts` a propósito: ese módulo abre la base de
 * datos, y cualquier componente del navegador que lo importara —aunque
 * fuera solo por un tipo— arrastraría el controlador de PostgreSQL al
 * paquete que descarga el paciente.
 */

export type Ciudad = {
  slug: string;
  nombre: string;
  estado: string;
  descripcion: string;
  umbralMinimo?: number;
};

export type Especialidad = {
  slug: string;
  nombre: string;
  descripcion: string;
  padecimientos: { slug: string; nombre: string }[];
};

export type Consultorio = {
  id: string;
  ciudad: string;
  nombre: string;
  direccion: string;
  horario: string;
  franjas: { dia: number; desde: string; hasta: string }[];
  duracionCitaMin: number;
  precioValoracion?: number;
};

export type Credencial = {
  tipo: "CEDULA_PROFESIONAL" | "CEDULA_ESPECIALIDAD" | "CONSEJO_ESPECIALIDAD";
  numero?: string;
  /** En qué punto del cotejo está. El sello depende de esto, no del número. */
  estado: "PENDIENTE" | "EN_REVISION" | "APROBADA" | "RECHAZADA";
  vigenteHasta?: string;
};

import type { Capacidades, Plan } from "@/lib/planes";

export type Profesional = {
  slug: string;
  nombre: string;
  fotografia?: string;
  plan: Plan;
  /** Lo que su plan le permite hoy, ya resuelto por vencimiento. */
  puede: Capacidades;
  semblanza: string;
  especialidades: string[];
  padecimientos: string[];
  consultorios: Consultorio[];
  credenciales: Credencial[];
  convenios?: string;
  calificacion?: number;
  opiniones: number;
  /** Perfil de muestra: existe para revisar el diseño, no para publicarse. */
  ejemplo: boolean;
};

/**
 * ¿La cédula de este profesional está cotejada?
 *
 * Exige que la verificación esté aprobada y no solo que haya un número
 * capturado. Antes bastaba con escribir cualquier cosa en el campo para
 * que el perfil luciera el sello de «Cédula verificada», que es el único
 * distintivo que el directorio promete y el único que un paciente no
 * puede comprobar por su cuenta. Un sello que se pinta siempre no
 * distingue nada.
 */
export function cedulaVerificada(p: Profesional): boolean {
  return p.credenciales.some(
    (c) =>
      c.tipo === "CEDULA_PROFESIONAL" &&
      Boolean(c.numero) &&
      c.estado === "APROBADA",
  );
}

/**
 * ¿Este perfil, por sí solo, responde la búsqueda del paciente?
 *
 * Es la pregunta que decide si una página se le ofrece al buscador, y no
 * cuántos médicos la habitan. Un alergólogo único en la ciudad con su
 * cédula verificada, su consultorio y su semblanza responde «alergólogo en
 * Delicias» mejor que cinco perfiles a medio llenar. Lo que Google castiga
 * es la página vacía, no la página breve.
 */
export function perfilCompleto(p: Profesional): boolean {
  if (p.ejemplo) return false;
  if (!cedulaVerificada(p)) return false;
  return p.consultorios.some((c) => Boolean(c.direccion));
}

/** La certificación de consejo caduca; el distintivo no debe sobrevivirla. */
export function consejoVigente(p: Profesional): boolean {
  const consejo = p.credenciales.find((c) => c.tipo === "CONSEJO_ESPECIALIDAD");
  if (!consejo?.vigenteHasta) return false;
  return new Date(consejo.vigenteHasta) > new Date();
}
