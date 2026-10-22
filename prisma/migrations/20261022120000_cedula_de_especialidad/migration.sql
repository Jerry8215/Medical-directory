-- La cédula de especialidad, que faltaba en el alta.
--
-- Hasta ahora la solicitud guardaba la cédula profesional y la
-- certificación de consejo, y se usaba el campo del consejo para las dos
-- cosas. Son documentos distintos: la cédula de especialidad la emite la
-- SEP al terminar la residencia y no caduca; la certificación la da el
-- consejo de cada especialidad y se renueva cada pocos años. Quien
-- cotejaba no sabía cuál de las dos le habían escrito.

ALTER TABLE "SolicitudAlta" ADD COLUMN "cedulaEspecialidad" TEXT;
