-- Visitantes del sitio por día
CREATE TABLE "VisitaDiaria" (
    "dia" TIMESTAMP(3) NOT NULL,
    "visitas" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "VisitaDiaria_pkey" PRIMARY KEY ("dia")
);

-- Plan elegido al registrarse
ALTER TABLE "SolicitudAlta" ADD COLUMN "plan" "PlanSuscripcion" NOT NULL DEFAULT 'BASICO',
ADD COLUMN "periodicidad" TEXT,
ADD COLUMN "referenciaPago" TEXT;
