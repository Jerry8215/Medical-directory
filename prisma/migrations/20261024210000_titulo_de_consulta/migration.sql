-- El título del caso, que escribe el paciente.
--
-- La consulta guardaba solo la descripción completa, y un listado de
-- salas no se puede leer con párrafos: el médico que tiene cuatro
-- esperando necesita distinguirlas de un vistazo, y el paciente que
-- vuelve a la semana necesita reconocer la suya.
--
-- Nullable a propósito: las consultas que ya existen no tienen título y
-- no hay de dónde inventárselo. El listado cae en la primera línea de la
-- descripción cuando falta.

ALTER TABLE "Consulta" ADD COLUMN "titulo" TEXT;
