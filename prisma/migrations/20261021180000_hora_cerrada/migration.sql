-- Una hora suelta que el médico aparta.
--
-- Hasta ahora solo se podía cerrar el día entero, y el consultorio
-- describió con precisión el caso que faltaba: le agendan por teléfono o
-- por WhatsApp y necesita apartar ese hueco en el momento, para que el
-- sitio no se lo ofrezca a otro paciente y termine con dos personas a la
-- misma hora.
--
-- Cuelga del consultorio y no del profesional porque el hueco pertenece a
-- una agenda concreta: quien atiende en dos consultorios puede estar
-- ocupado en uno y libre en el otro a la misma hora.
--
-- La fecha va como texto AAAA-MM-DD y la hora como HH:MM, igual que los
-- periodos cerrados y que las franjas: la agenda razona en días y horas
-- locales, y un instante UTC movería el corte seis horas.

CREATE TABLE "HoraCerrada" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "motivo" TEXT,
    "creadaPor" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoraCerrada_pkey" PRIMARY KEY ("id")
);

-- Apartar dos veces el mismo hueco no es un error del médico, es un doble
-- clic: la restricción lo vuelve inofensivo.
CREATE UNIQUE INDEX "HoraCerrada_consultorioId_fecha_hora_key"
    ON "HoraCerrada"("consultorioId", "fecha", "hora");

-- La consulta que importa es siempre «qué apartó este consultorio de aquí
-- en adelante».
CREATE INDEX "HoraCerrada_consultorioId_fecha_idx"
    ON "HoraCerrada"("consultorioId", "fecha");

ALTER TABLE "HoraCerrada" ADD CONSTRAINT "HoraCerrada_consultorioId_fkey"
    FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
