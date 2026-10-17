-- Periodos que el médico cierra: vacaciones, congresos, ausencias.
--
-- Las fechas van como texto AAAA-MM-DD y no como marca de tiempo: la
-- agenda razona en días locales de Chihuahua, y guardar un instante UTC
-- movería el corte del día seis horas, cerrando el día equivocado.

CREATE TABLE "PeriodoCerrado" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "desde" TEXT NOT NULL,
    "hasta" TEXT NOT NULL,
    "motivo" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeriodoCerrado_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PeriodoCerrado_profesionalId_desde_idx" ON "PeriodoCerrado"("profesionalId", "desde");

ALTER TABLE "PeriodoCerrado" ADD CONSTRAINT "PeriodoCerrado_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
