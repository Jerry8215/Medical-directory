-- La consulta en línea y su sala.
--
-- El directorio responde una pregunta y se queda callado: quien ya sabe
-- que necesita un traumatólogo lo encuentra con nosotros o sin nosotros,
-- y quien tiene un dolor que no sabe clasificar se queda sin respuesta.
-- Esta es la otra forma de atender, la que no exige saber a quién buscar
-- antes de entrar.
--
-- Tres decisiones quedan grabadas en la forma de la tabla.
--
-- `token` es el enlace del paciente, como el de la cita. No hace falta
-- contraseña para entrar a una sala propia: el enlace es la llave, y el
-- paciente se identifica con su correo y su WhatsApp, nada más.
--
-- `cierraEn` se calcula al aceptar y no al crear. El reloj de la sala
-- arranca cuando el médico acepta, porque antes de eso no hay con quién
-- conversar y sería contarle al paciente un tiempo que no está usando.
--
-- `precio`, `comision` y `pagoId` viven acá y no en otro lado porque el
-- importe que se acordó no puede cambiar después: si mañana sube la
-- tarifa, lo que se cobró por esta consulta sigue siendo lo que se
-- cobró. El reparto se congela con ella.

CREATE TYPE "EstadoConsulta" AS ENUM (
  'SOLICITADA',
  'PAGADA',
  'ACEPTADA',
  'CERRADA',
  'CANCELADA',
  'VENCIDA'
);

CREATE TYPE "AutorMensaje" AS ENUM ('PACIENTE', 'MEDICO', 'SISTEMA');

CREATE TABLE "Consulta" (
    "id"            TEXT NOT NULL,
    "token"         TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "pacienteId"    TEXT NOT NULL,
    "motivo"        TEXT NOT NULL,
    "estado"        "EstadoConsulta" NOT NULL DEFAULT 'SOLICITADA',
    "precio"        INTEGER NOT NULL DEFAULT 0,
    "comision"      INTEGER NOT NULL DEFAULT 0,
    "pagoId"        TEXT,
    "aceptadaEn"    TIMESTAMP(3),
    "cierraEn"      TIMESTAMP(3),
    "cerradaEn"     TIMESTAMP(3),
    "motivoCierre"  TEXT,
    "creadaEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consulta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Consulta_token_key" ON "Consulta"("token");
CREATE INDEX "Consulta_profesionalId_estado_idx" ON "Consulta"("profesionalId", "estado");
CREATE INDEX "Consulta_pacienteId_creadaEn_idx" ON "Consulta"("pacienteId", "creadaEn");
CREATE INDEX "Consulta_estado_creadaEn_idx" ON "Consulta"("estado", "creadaEn");

ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Consulta" ADD CONSTRAINT "Consulta_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Los mensajes de una sala son expediente clínico, no una conversación
-- que se pueda borrar. Se guardan con su autor y su hora, y nada los
-- edita después.
CREATE TABLE "MensajeConsulta" (
    "id"         TEXT NOT NULL,
    "consultaId" TEXT NOT NULL,
    "autor"      "AutorMensaje" NOT NULL,
    "texto"      TEXT NOT NULL,
    "leidoEn"    TIMESTAMP(3),
    "creadoEn"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeConsulta_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MensajeConsulta_consultaId_creadoEn_idx"
    ON "MensajeConsulta"("consultaId", "creadoEn");

ALTER TABLE "MensajeConsulta" ADD CONSTRAINT "MensajeConsulta_consultaId_fkey"
    FOREIGN KEY ("consultaId") REFERENCES "Consulta"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- La opinión puede nacer de una consulta en línea, igual que de una cita.
ALTER TABLE "Opinion" ADD COLUMN "consultaId" TEXT;
CREATE UNIQUE INDEX "Opinion_consultaId_key" ON "Opinion"("consultaId");

-- El interruptor con el que el médico se prende y se apaga, y lo que
-- cobra por una consulta escrita. Sin precio cargado no se le ofrece:
-- más vale no aparecer que aparecer con una cifra inventada.
ALTER TABLE "Profesional" ADD COLUMN "enLinea" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Profesional" ADD COLUMN "precioConsultaLinea" INTEGER;
