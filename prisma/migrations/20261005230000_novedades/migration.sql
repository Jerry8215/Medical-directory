-- Bandeja de novedades del consultorio: altas, citas y opiniones.
CREATE TYPE "TipoNovedad" AS ENUM ('SOLICITUD_ALTA', 'CITA_NUEVA', 'CITA_CANCELADA', 'OPINION_NUEVA');

CREATE TABLE "Novedad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalle" TEXT,
    "enlace" TEXT,
    "profesionalId" TEXT,
    "leidaEn" TIMESTAMP(3),
    "avisadaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Novedad_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Novedad_leidaEn_creadaEn_idx" ON "Novedad"("leidaEn", "creadaEn");
CREATE INDEX "Novedad_profesionalId_creadaEn_idx" ON "Novedad"("profesionalId", "creadaEn");
