/**
 * Datos de arranque del directorio.
 *
 * Son los catálogos acordados para el lanzamiento —cinco ciudades y cinco
 * especialidades— más los perfiles con los que se está construyendo el
 * sitio. Cuando la base de datos esté montada, este archivo alimenta la
 * carga inicial (`prisma/seed.ts`) y deja de usarse para pintar páginas.
 *
 * Los perfiles marcados `ejemplo: true` existen para poder ver y revisar el
 * diseño con contenido realista. No se publican: el repositorio los excluye
 * de todo conteo y de todo listado cuando se desactiva el modo de muestra.
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
  profesion: string;
  descripcion: string;
  padecimientos: { slug: string; nombre: string }[];
};

export type Consultorio = {
  ciudad: string;
  nombre: string;
  direccion: string;
  /** Cómo se le dice al paciente. */
  horario: string;
  /** Lo mismo, en la forma que entiende el motor de agenda. */
  franjas?: { dia: number; desde: string; hasta: string }[];
  duracionCitaMin?: number;
  precioValoracion?: number;
};

export type Credencial = {
  tipo: "CEDULA_PROFESIONAL" | "CEDULA_ESPECIALIDAD" | "CONSEJO_ESPECIALIDAD";
  numero?: string;
  institucion?: string;
  vigenteHasta?: string;
};

export type Profesional = {
  slug: string;
  nombre: string;
  profesion: string;
  especialidades: string[];
  semblanza: string;
  padecimientos: string[];
  telefono?: string;
  fotografia?: string;
  consultorios: Consultorio[];
  credenciales: Credencial[];
  convenios?: string;
  calificacion: number;
  opiniones: number;
  ejemplo: boolean;
};

export const PROFESIONES = [
  { slug: "medico", nombre: "Médico", exigeConsejo: true },
  { slug: "odontologo", nombre: "Odontólogo", exigeConsejo: false },
  { slug: "psicologo", nombre: "Psicólogo", exigeConsejo: false },
  { slug: "nutriologo", nombre: "Nutriólogo", exigeConsejo: false },
] as const;

export const CIUDADES: Ciudad[] = [
  {
    slug: "delicias",
    nombre: "Delicias",
    estado: "Chihuahua",
    descripcion:
      "Delicias concentra la mayor oferta hospitalaria de la región centro-sur del estado, con consultorios alrededor del centro y de los hospitales privados.",
  },
  {
    slug: "meoqui",
    nombre: "Meoqui",
    estado: "Chihuahua",
    descripcion:
      "Meoqui está a veinte minutos de Delicias, de modo que muchos pacientes se atienden indistintamente en ambas ciudades.",
  },
  {
    slug: "saucillo",
    nombre: "Saucillo",
    estado: "Chihuahua",
    descripcion:
      "Saucillo cuenta con consulta general y especialidades que atienden por días determinados de la semana.",
  },
  {
    slug: "rosales",
    nombre: "Rosales",
    estado: "Chihuahua",
    descripcion:
      "Rosales se apoya en los especialistas que pasan consulta en la zona y en los hospitales de Delicias.",
  },
  {
    slug: "camargo",
    nombre: "Camargo",
    estado: "Chihuahua",
    descripcion:
      "Camargo es la cabecera del sur de la región y recibe pacientes de las comunidades cercanas.",
  },
];

export const ESPECIALIDADES: Especialidad[] = [
  {
    slug: "cirugia-general",
    nombre: "Cirugía General",
    profesion: "medico",
    descripcion:
      "El cirujano general atiende los padecimientos que requieren operación en el abdomen y la pared abdominal, como la vesícula, las hernias y la apendicitis, con abordaje laparoscópico o abierto según el caso.",
    padecimientos: [
      { slug: "vesicula", nombre: "Vesícula y vías biliares" },
      { slug: "hernias", nombre: "Hernias" },
      { slug: "apendicitis", nombre: "Apendicitis" },
      { slug: "lipomas", nombre: "Lipomas y tumores de piel" },
      { slug: "hemorroides", nombre: "Hemorroides" },
      { slug: "quiste-pilonidal", nombre: "Quiste pilonidal" },
      { slug: "hernia-hiatal-reflujo", nombre: "Hernia hiatal y reflujo" },
      { slug: "nodulos-tiroideos", nombre: "Nódulos tiroideos" },
      { slug: "diverticulitis", nombre: "Diverticulitis" },
    ],
  },
  {
    slug: "ginecologia",
    nombre: "Ginecología y Obstetricia",
    profesion: "medico",
    descripcion:
      "La ginecología atiende la salud reproductiva de la mujer, desde el control prenatal y el parto hasta los padecimientos del aparato reproductor.",
    padecimientos: [
      { slug: "control-prenatal", nombre: "Control prenatal" },
      { slug: "miomatosis", nombre: "Miomatosis uterina" },
      { slug: "planificacion-familiar", nombre: "Planificación familiar" },
    ],
  },
  {
    slug: "pediatria",
    nombre: "Pediatría",
    profesion: "medico",
    descripcion:
      "El pediatra acompaña el crecimiento del niño desde el nacimiento hasta la adolescencia, con el control del niño sano, la vacunación y la atención de las enfermedades propias de la infancia.",
    padecimientos: [
      { slug: "nino-sano", nombre: "Control del niño sano" },
      { slug: "asma-infantil", nombre: "Asma infantil" },
      { slug: "vacunacion", nombre: "Vacunación" },
    ],
  },
  {
    slug: "traumatologia",
    nombre: "Traumatología y Ortopedia",
    profesion: "medico",
    descripcion:
      "La traumatología atiende las lesiones de huesos, articulaciones, ligamentos y músculos, tanto las de accidente como las de desgaste.",
    padecimientos: [
      { slug: "fracturas", nombre: "Fracturas" },
      { slug: "rodilla", nombre: "Lesiones de rodilla" },
      { slug: "hombro", nombre: "Hombro doloroso" },
    ],
  },
  {
    slug: "medicina-interna",
    nombre: "Medicina Interna",
    profesion: "medico",
    descripcion:
      "El internista atiende al paciente adulto en su conjunto, en especial cuando conviven varias enfermedades crónicas como la diabetes y la hipertensión.",
    padecimientos: [
      { slug: "diabetes", nombre: "Diabetes" },
      { slug: "hipertension", nombre: "Hipertensión" },
      { slug: "chequeo-anual", nombre: "Chequeo anual" },
    ],
  },
];

export const PROFESIONALES: Profesional[] = [
  {
    slug: "jose-guadalupe-padilla",
    nombre: "Dr. José Guadalupe Padilla",
    profesion: "medico",
    especialidades: ["cirugia-general"],
    semblanza:
      "Cirujano General y Laparoscópico. Atiende padecimientos de vesícula y vías biliares, hernias, apéndice y cirugía del aparato digestivo, con abordaje laparoscópico o abierto según el caso.",
    padecimientos: [
      "vesicula",
      "hernias",
      "apendicitis",
      "lipomas",
      "hemorroides",
      "quiste-pilonidal",
      "hernia-hiatal-reflujo",
      "nodulos-tiroideos",
      "diverticulitis",
    ],
    telefono: "6391127780",
    fotografia:
      "https://wpet3qsq7vcwuash.public.blob.vercel-storage.com/medicos/jose-guadalupe-padilla-mUQSs92aDUsE09drc9BVidipkLbWFx.jpg",
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Hospital Vistas del Sol",
        direccion: "Ave. 12a y C. Novena Sur s/n, Consultorio 125, 33000 Delicias, Chih.",
        horario: "Lunes a viernes de 16:00 a 17:20",
        franjas: [
          { dia: 0, desde: "16:00", hasta: "17:20" },
          { dia: 1, desde: "16:00", hasta: "17:20" },
          { dia: 2, desde: "16:00", hasta: "17:20" },
          { dia: 3, desde: "16:00", hasta: "17:20" },
          { dia: 4, desde: "16:00", hasta: "17:20" },
        ],
        duracionCitaMin: 40,
        precioValoracion: 800,
      },
    ],
    credenciales: [
      { tipo: "CEDULA_PROFESIONAL", numero: "9961014", institucion: "Registro Nacional de Profesionistas" },
      { tipo: "CEDULA_ESPECIALIDAD", numero: "15082200", institucion: "Registro Nacional de Profesionistas" },
    ],
    convenios: "GNP, AXA, MetLife, Seguros Monterrey y Atlas, entre otras.",
    calificacion: 4.9,
    opiniones: 186,
    ejemplo: false,
  },
];
