-- El enlace que recibe el paciente para ver, cancelar o reprogramar su cita.
-- Las citas que ya existen reciben uno generado por la base.
ALTER TABLE "Cita" ADD COLUMN "token" TEXT;

UPDATE "Cita" SET "token" = gen_random_uuid()::text WHERE "token" IS NULL;

ALTER TABLE "Cita" ALTER COLUMN "token" SET NOT NULL;

CREATE UNIQUE INDEX "Cita_token_key" ON "Cita"("token");
