-- Los teléfonos pasan a formato internacional.
--
-- Se guardaban como diez dígitos pelados porque al principio todo el
-- mundo era de Delicias. Con la consulta en línea abierta a cualquier
-- región eso deja de alcanzar: un número de Bogotá o de Madrid no cabe en
-- diez dígitos y, sobre todo, sin la lada no se sabe a quién pertenece
-- «3001234567».
--
-- Se adopta E.164 —el `+` y los dígitos, sin espacios ni paréntesis—
-- porque es el único formato que no depende de desde dónde se mire, y es
-- el que entiende WhatsApp.
--
-- Lo ya guardado es mexicano: no había manera de registrar otra cosa. Se
-- le antepone +52, y solo a lo que tiene exactamente diez dígitos, de
-- modo que correr esto dos veces no vuelve a prefijar nada.

UPDATE "Paciente"
   SET "telefono" = '+52' || "telefono"
 WHERE "telefono" ~ '^[0-9]{10}$';

UPDATE "Profesional"
   SET "telefono" = '+52' || "telefono"
 WHERE "telefono" ~ '^[0-9]{10}$';

UPDATE "SolicitudAlta"
   SET "telefono" = '+52' || "telefono"
 WHERE "telefono" ~ '^[0-9]{10}$';
