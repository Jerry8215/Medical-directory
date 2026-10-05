-- Agenda de Google para el plan Premium.
ALTER TABLE "Consultorio" ADD COLUMN IF NOT EXISTS "calendarioGoogleId" TEXT;
ALTER TABLE "Cita" ADD COLUMN IF NOT EXISTS "eventoGoogleId" TEXT;
