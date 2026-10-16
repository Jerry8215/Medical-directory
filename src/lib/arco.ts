/**
 * Derechos ARCO: acceso, rectificación, cancelación y oposición.
 *
 * El aviso de privacidad del sitio promete atender estas solicitudes en
 * veinte días hábiles. Esto es lo que hace que esa promesa sea cierta.
 *
 * Acá viven las piezas que no tocan la base: qué se considera dato
 * personal, cómo se arma el expediente que se le entrega al paciente y con
 * qué se reemplaza su teléfono al cancelarlo. Se prueban solas porque un
 * error acá no se nota hasta que alguien reclama, y para entonces el dato
 * ya se entregó de más o se borró de menos.
 */

/** Lo que la ley da de plazo, y lo que el aviso de privacidad promete. */
export const PLAZO_DIAS_HABILES = 20;

export const PREFIJO_ANONIMO = "anonimo-";

/**
 * Con qué se reemplaza el teléfono al cancelar.
 *
 * El teléfono es único en la base y es la llave por la que se encuentra a
 * un paciente, así que no puede quedar vacío: dos cancelaciones chocarían
 * entre sí. Se sustituye por una marca irreversible que conserva la
 * unicidad y no identifica a nadie.
 */
export function telefonoAnonimo(id: string): string {
  return PREFIJO_ANONIMO + id;
}

export function esAnonimo(telefono: string): boolean {
  return telefono.startsWith(PREFIJO_ANONIMO);
}

export type CitaDelExpediente = {
  cuando: Date;
  profesional: string;
  consultorio: string;
  estado: string;
  origen: string;
  motivo: string | null;
};

export type OpinionDelExpediente = {
  fecha: Date;
  profesional: string;
  calificacion: number;
  texto: string;
  publicada: boolean;
};

export type Expediente = {
  nombre: string | null;
  telefono: string;
  correo: string | null;
  alta: Date;
  consentimiento: Date | null;
  bajaEn: Date | null;
  citas: CitaDelExpediente[];
  opiniones: OpinionDelExpediente[];
};

function fecha(d: Date): string {
  return d.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

/**
 * El expediente, en un texto que una persona pueda leer.
 *
 * Se entrega así y no como volcado de la base porque el derecho de acceso
 * es del paciente, no de un programador: tiene que poder leerlo sin que
 * nadie se lo interprete.
 */
export function comoTexto(e: Expediente, sitio: string, emitido: Date): string {
  const l: string[] = [];
  l.push(`Datos personales que ${sitio} tiene sobre usted`);
  l.push("");
  l.push(`Documento emitido el ${fecha(emitido)}.`);
  l.push(
    "Se entrega en atención a su solicitud de acceso, conforme a la Ley Federal de " +
      "Protección de Datos Personales en Posesión de los Particulares.",
  );
  l.push("");
  l.push("1. SUS DATOS DE CONTACTO");
  l.push(`   Nombre: ${e.nombre ?? "(no registrado)"}`);
  l.push(`   Teléfono: ${esAnonimo(e.telefono) ? "(cancelado)" : e.telefono}`);
  l.push(`   Correo: ${e.correo ?? "(no registrado)"}`);
  l.push(`   Registrado desde: ${fecha(e.alta)}`);
  l.push(
    `   Consentimiento: ${e.consentimiento ? fecha(e.consentimiento) : "(no registrado)"}`,
  );
  l.push(
    `   Oposición a avisos: ${e.bajaEn ? `activa desde ${fecha(e.bajaEn)}` : "no solicitada"}`,
  );
  l.push("");

  l.push(`2. SUS CITAS (${e.citas.length})`);
  if (e.citas.length === 0) {
    l.push("   No hay citas registradas.");
  }
  for (const c of e.citas) {
    l.push(`   · ${fecha(c.cuando)} — ${c.profesional}`);
    l.push(`     Consultorio: ${c.consultorio}`);
    l.push(`     Estado: ${c.estado} · Agendada desde: ${c.origen}`);
    if (c.motivo) l.push(`     Motivo que usted escribió: ${c.motivo}`);
  }
  l.push("");

  l.push(`3. SUS OPINIONES (${e.opiniones.length})`);
  if (e.opiniones.length === 0) {
    l.push("   No hay opiniones registradas.");
  }
  for (const o of e.opiniones) {
    l.push(
      `   · ${fecha(o.fecha)} — ${o.profesional} — ${o.calificacion} de 5` +
        ` — ${o.publicada ? "publicada" : "no publicada"}`,
    );
    l.push(`     ${o.texto}`);
  }
  l.push("");

  l.push("4. QUÉ MÁS SE GUARDA");
  l.push(
    "   Los avisos que se le enviaron sobre sus citas y el registro de las " +
      "operaciones hechas sobre su expediente, con fecha y responsable.",
  );
  l.push("");
  l.push("5. SUS DERECHOS");
  l.push(
    `   Puede solicitar la rectificación de cualquier dato incorrecto, la ` +
      `cancelación de sus datos personales o la oposición a recibir avisos. ` +
      `Se atiende en un máximo de ${PLAZO_DIAS_HABILES} días hábiles.`,
  );
  return l.join("\n");
}

/** Nombre del archivo que se descarga, sin datos personales en el nombre. */
export function nombreDelArchivo(emitido: Date): string {
  return `datos-personales-${emitido.toISOString().slice(0, 10)}.txt`;
}
