-- El caso se muestra en el listado público, sin el nombre del paciente.
--
-- El consultorio pidió un directorio de salas que cualquiera pueda
-- recorrer y ordenar por categoría, como el de una plataforma de
-- proyectos. Tiene sentido: ver que hay médicos respondiendo casos reales
-- es lo que convence al siguiente paciente de abrir el suyo, y cada caso
-- con su título es además contenido por el que la gente busca en Google.
--
-- Lo que no puede salir de la sala es quién es el paciente. El título de
-- un caso lleva un padecimiento, y un padecimiento atado a un nombre es
-- un dato de salud, que la ley mexicana trata como sensible y exige
-- consentimiento expreso. Por eso el listado publica el título, la
-- especialidad, el médico y el estado, y nunca el nombre, el teléfono ni
-- el correo de quien lo abrió. La conversación tampoco: entrar a una sala
-- sigue exigiendo ser de ella.
--
-- `publica` nace en verdadero porque un listado vacío no sirve a nadie, y
-- el paciente puede apagarlo al abrir su consulta. Lo que se publica es
-- lo que él escribió como título sabiendo que se iba a ver.

ALTER TABLE "Consulta" ADD COLUMN "publica" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX "Consulta_publica_creadaEn_idx" ON "Consulta"("publica", "creadaEn");
