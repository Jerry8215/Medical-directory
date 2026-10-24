-- La invitación a opinar, para el paciente que no agendó por el sitio.
--
-- La opinión quedó atada al enlace de la cita, que es lo que demuestra
-- que la consulta existió. Resolvió el problema de que cualquiera opinara
-- sin haber sido paciente, pero dejó fuera a la mayoría: quien agendó por
-- teléfono, por WhatsApp o llegó al mostrador no tiene enlace, y el
-- consultorio se quedó sin manera de pedirle su reseña.
--
-- Esta tabla es el término medio. El consultorio genera la invitación a
-- nombre de un paciente concreto, con el día en que se atendió, y de ahí
-- sale un enlace que sirve una sola vez. No es tan fuerte como una cita
-- registrada -- la respalda quien la emite, no el sistema -- y por eso la
-- moderación las distingue: una dice "se atendió el 22 de octubre" y la
-- otra, "invitada por el consultorio".
--
-- `usadaEn` es lo que la vuelve de un solo uso. `emitidaPor` deja por
-- escrito quién la generó, porque una reseña que no respalda una cita
-- tiene que poder explicarse después.

CREATE TABLE "InvitacionOpinion" (
    "id"            TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "paciente"      TEXT NOT NULL,
    "contacto"      TEXT,
    "atendidoEn"    TIMESTAMP(3),
    "nota"          TEXT,
    "emitidaPor"    TEXT NOT NULL,
    "usadaEn"       TIMESTAMP(3),
    "creadaEn"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitacionOpinion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InvitacionOpinion_profesionalId_creadaEn_idx"
    ON "InvitacionOpinion"("profesionalId", "creadaEn");

ALTER TABLE "InvitacionOpinion"
    ADD CONSTRAINT "InvitacionOpinion_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- La opinión apunta a la invitación que la permitió, cuando no vino de
-- una cita. Única por la misma razón que `citaId`: una invitación, una
-- opinión.
ALTER TABLE "Opinion" ADD COLUMN "invitacionId" TEXT;
CREATE UNIQUE INDEX "Opinion_invitacionId_key" ON "Opinion"("invitacionId");
