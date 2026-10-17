-- Métricas del perfil, agregadas por día.
--
-- Un renglón por perfil y día, no uno por visita: lo que el médico
-- pregunta es cuántos lo buscaron este mes, y así la tabla crece de forma
-- acotada. El índice único es lo que permite sumar con un upsert sin
-- carreras entre dos visitas simultáneas.

CREATE TABLE "MetricaDiaria" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "dia" TIMESTAMP(3) NOT NULL,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "telefono" INTEGER NOT NULL DEFAULT 0,
    "whatsapp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MetricaDiaria_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MetricaDiaria_profesionalId_dia_key" ON "MetricaDiaria"("profesionalId", "dia");

CREATE INDEX "MetricaDiaria_dia_idx" ON "MetricaDiaria"("dia");

ALTER TABLE "MetricaDiaria" ADD CONSTRAINT "MetricaDiaria_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
