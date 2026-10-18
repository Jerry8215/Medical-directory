-- Lista de espera por médico.
--
-- Las fechas van como texto AAAA-MM-DD, igual que los periodos cerrados:
-- la agenda razona en días locales y un instante UTC movería el corte.
--
-- El índice incluye `cerradoEn` porque la consulta que importa es siempre
-- «quién sigue esperando a este médico», y los cerrados son la mayoría
-- apenas pasa un mes.

CREATE TABLE "EnEspera" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "desde" TEXT,
    "hasta" TEXT,
    "nota" TEXT,
    "avisadoEn" TIMESTAMP(3),
    "cerradoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnEspera_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnEspera_profesionalId_cerradoEn_creadoEn_idx"
    ON "EnEspera"("profesionalId", "cerradoEn", "creadoEn");

ALTER TABLE "EnEspera" ADD CONSTRAINT "EnEspera_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnEspera" ADD CONSTRAINT "EnEspera_pacienteId_fkey"
    FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
