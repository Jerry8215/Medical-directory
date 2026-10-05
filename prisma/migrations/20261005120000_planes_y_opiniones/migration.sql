-- Planes de suscripción: qué herramientas tiene cada perfil.
CREATE TYPE "PlanSuscripcion" AS ENUM ('BASICO', 'GOLD', 'PREMIUM');

ALTER TABLE "Profesional" ADD COLUMN "plan" "PlanSuscripcion" NOT NULL DEFAULT 'BASICO';
ALTER TABLE "Profesional" ADD COLUMN "planHasta" TIMESTAMP(3);

-- La opinión queda ligada a la cita que la origina, cuando la hay.
ALTER TABLE "Opinion" ADD COLUMN "citaId" TEXT;
ALTER TABLE "Opinion" ADD COLUMN "revisadaPor" TEXT;
CREATE UNIQUE INDEX "Opinion_citaId_key" ON "Opinion"("citaId");
