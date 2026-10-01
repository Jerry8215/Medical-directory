/**
 * Perfiles de muestra para revisar el sitio mientras se carga el padrón
 * real.
 *
 * Sirven para dos cosas concretas: ver cómo se comporta el listado con
 * varias ciudades y especialidades, y comprobar la regla de publicación
 * —hoy solo cirugía general en Delicias reúne el mínimo—. Todos llevan
 * `ejemplo: true`, el sitio los muestra marcados como tales y basta
 * vaciar este arreglo para que desaparezcan sin tocar nada más.
 *
 * Ninguno corresponde a una persona real y ninguno lleva número de cédula.
 */

import type { Profesional } from "./semilla";

export const EJEMPLOS: Profesional[] = [
  // ---------------- Delicias ----------------
  {
    slug: "ejemplo-ramon-esquivel",
    nombre: "Dr. Ramón Esquivel Terán",
    profesion: "medico",
    especialidades: ["cirugia-general"],
    semblanza:
      "Perfil de muestra. Cirugía general con interés en pared abdominal y hernias complejas.",
    padecimientos: ["hernias", "lipomas"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Torre Médica Centro",
        direccion: "Consultorio 4",
        horario: "Martes y jueves de 16:00 a 20:00",
        precioValoracion: 750,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.7,
    opiniones: 54,
    ejemplo: true,
  },
  {
    slug: "ejemplo-carmen-villalba",
    nombre: "Dra. Carmen Villalba Ortega",
    profesion: "medico",
    especialidades: ["cirugia-general"],
    semblanza:
      "Perfil de muestra. Cirugía general y de vesícula por laparoscopía.",
    padecimientos: ["vesicula", "apendicitis"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Clínica del Parque",
        direccion: "Consultorio 12",
        horario: "Lunes a viernes de 10:00 a 14:00",
        precioValoracion: 800,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.8,
    opiniones: 73,
    ejemplo: true,
  },
  {
    slug: "ejemplo-ignacio-robles",
    nombre: "Dr. Ignacio Robles Campa",
    profesion: "medico",
    especialidades: ["cirugia-general"],
    semblanza: "Perfil de muestra. Cirugía general y urgencias quirúrgicas.",
    padecimientos: ["apendicitis", "hernias"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Hospital Vistas del Sol",
        direccion: "Consultorio 210",
        horario: "Lunes a sábado de 8:00 a 13:00",
        precioValoracion: 700,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.6,
    opiniones: 41,
    ejemplo: true,
  },
  {
    slug: "ejemplo-ana-serrano",
    nombre: "Dra. Ana Serrano Mota",
    profesion: "medico",
    especialidades: ["ginecologia"],
    semblanza:
      "Perfil de muestra. Ginecología general, control prenatal y cirugía mínimamente invasiva.",
    padecimientos: ["control-prenatal", "miomatosis", "planificacion-familiar"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Torre Médica Centro",
        direccion: "Consultorio 7",
        horario: "Martes y jueves de 10:00 a 18:00",
        precioValoracion: 700,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.8,
    opiniones: 142,
    ejemplo: true,
  },
  {
    slug: "ejemplo-paola-beltran",
    nombre: "Dra. Paola Beltrán Ríos",
    profesion: "medico",
    especialidades: ["pediatria"],
    semblanza:
      "Perfil de muestra. Control del niño sano, vacunación y enfermedades respiratorias de la infancia.",
    padecimientos: ["nino-sano", "vacunacion", "asma-infantil"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Clínica Norte",
        direccion: "Consultorio 3",
        horario: "Lunes a sábado de 9:00 a 13:00",
        precioValoracion: 600,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.9,
    opiniones: 167,
    ejemplo: true,
  },
  {
    slug: "ejemplo-luis-quintero",
    nombre: "Dr. Luis Quintero Rangel",
    profesion: "medico",
    especialidades: ["traumatologia"],
    semblanza:
      "Perfil de muestra. Lesiones deportivas, fracturas y cirugía de rodilla y hombro.",
    padecimientos: ["fracturas", "rodilla", "hombro"],
    consultorios: [
      {
        ciudad: "delicias",
        nombre: "Hospital Vistas del Sol",
        direccion: "Consultorio 118",
        horario: "Lunes a viernes de 16:00 a 20:00",
        precioValoracion: 750,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.7,
    opiniones: 98,
    ejemplo: true,
  },

  // ---------------- Meoqui ----------------
  {
    slug: "ejemplo-hector-navarrete",
    nombre: "Dr. Héctor Navarrete Luna",
    profesion: "medico",
    especialidades: ["medicina-interna"],
    semblanza:
      "Perfil de muestra. Diabetes, hipertensión y control de enfermedades crónicas del adulto.",
    padecimientos: ["diabetes", "hipertension", "chequeo-anual"],
    consultorios: [
      {
        ciudad: "meoqui",
        nombre: "Consultorio Centro",
        direccion: "Av. Juárez 210",
        horario: "Lunes a viernes de 8:00 a 14:00",
        precioValoracion: 650,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.6,
    opiniones: 74,
    ejemplo: true,
  },
  {
    slug: "ejemplo-silvia-arredondo",
    nombre: "Dra. Silvia Arredondo Gil",
    profesion: "medico",
    especialidades: ["ginecologia"],
    semblanza: "Perfil de muestra. Control prenatal y ginecología general.",
    padecimientos: ["control-prenatal", "planificacion-familiar"],
    consultorios: [
      {
        ciudad: "meoqui",
        nombre: "Clínica San José",
        direccion: "Calle Hidalgo 45",
        horario: "Miércoles y viernes de 15:00 a 19:00",
        precioValoracion: 600,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.8,
    opiniones: 61,
    ejemplo: true,
  },

  // ---------------- Saucillo ----------------
  {
    slug: "ejemplo-mario-delgado",
    nombre: "Dr. Mario Delgado Peña",
    profesion: "medico",
    especialidades: ["pediatria"],
    semblanza: "Perfil de muestra. Pediatría general y control del niño sano.",
    padecimientos: ["nino-sano", "vacunacion"],
    consultorios: [
      {
        ciudad: "saucillo",
        nombre: "Consultorio Saucillo",
        direccion: "Av. Independencia 18",
        horario: "Lunes, miércoles y viernes de 9:00 a 14:00",
        precioValoracion: 550,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.7,
    opiniones: 38,
    ejemplo: true,
  },

  // ---------------- Camargo ----------------
  {
    slug: "ejemplo-gabriela-ponce",
    nombre: "Dra. Gabriela Ponce Mendoza",
    profesion: "medico",
    especialidades: ["cirugia-general"],
    semblanza: "Perfil de muestra. Cirugía general y de pared abdominal.",
    padecimientos: ["hernias", "vesicula"],
    consultorios: [
      {
        ciudad: "camargo",
        nombre: "Hospital Santa Rosa",
        direccion: "Consultorio 5",
        horario: "Martes y jueves de 9:00 a 14:00",
        precioValoracion: 700,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.8,
    opiniones: 52,
    ejemplo: true,
  },
  {
    slug: "ejemplo-omar-chavira",
    nombre: "Dr. Omar Chavira Nevárez",
    profesion: "medico",
    especialidades: ["traumatologia"],
    semblanza: "Perfil de muestra. Fracturas y rehabilitación de lesiones.",
    padecimientos: ["fracturas", "rodilla"],
    consultorios: [
      {
        ciudad: "camargo",
        nombre: "Clínica del Valle",
        direccion: "Blvd. Juárez 300",
        horario: "Lunes a viernes de 16:00 a 19:00",
        precioValoracion: 650,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.5,
    opiniones: 29,
    ejemplo: true,
  },

  // ---------------- Rosales ----------------
  {
    slug: "ejemplo-lorena-fierro",
    nombre: "Dra. Lorena Fierro Baca",
    profesion: "medico",
    especialidades: ["medicina-interna"],
    semblanza: "Perfil de muestra. Medicina interna y control de diabetes.",
    padecimientos: ["diabetes", "hipertension"],
    consultorios: [
      {
        ciudad: "rosales",
        nombre: "Consultorio Rosales",
        direccion: "Calle Morelos 12",
        horario: "Martes y jueves de 10:00 a 15:00",
        precioValoracion: 550,
      },
    ],
    credenciales: [{ tipo: "CEDULA_PROFESIONAL" }],
    calificacion: 4.6,
    opiniones: 22,
    ejemplo: true,
  },
];
