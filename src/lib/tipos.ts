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
  vigenteHasta?: string;
};

export type Profesional = {
  slug: string;
  nombre: string;
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

export function cedulaVerificada(p: Profesional): boolean {
  return p.credenciales.some((c) => c.tipo === "CEDULA_PROFESIONAL" && Boolean(c.numero));
}

/** La certificación de consejo caduca; el distintivo no debe sobrevivirla. */
export function consejoVigente(p: Profesional): boolean {
  const consejo = p.credenciales.find((c) => c.tipo === "CONSEJO_ESPECIALIDAD");
  if (!consejo?.vigenteHasta) return false;
  return new Date(consejo.vigenteHasta) > new Date();
}
