-- AlterTable
ALTER TABLE "Profesional" ADD COLUMN     "calificacion" DOUBLE PRECISION,
ADD COLUMN     "numeroOpiniones" INTEGER NOT NULL DEFAULT 0;
