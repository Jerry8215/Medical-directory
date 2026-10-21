-- A qué se refiere una novedad.
--
-- Hasta ahora una novedad solo sabía contar lo que había pasado, no a qué
-- registro apuntaba. Eso dejaba el aviso de «solicitud de alta» en el
-- panel aun después de aprobarla o rechazarla, porque nadie podía
-- relacionar el aviso con la solicitud ya resuelta; había que apagarlo a
-- mano, y con dos solicitudes esperando no había forma de apagar la
-- correcta.
--
-- Queda opcional a propósito: las novedades viejas no tienen referencia y
-- las que no apuntan a nada en particular tampoco la necesitan.

ALTER TABLE "Novedad" ADD COLUMN "referencia" TEXT;

-- La consulta que importa es «apaga el aviso de esta solicitud», siempre
-- entre las que siguen sin leerse.
CREATE INDEX "Novedad_referencia_leidaEn_idx" ON "Novedad"("referencia", "leidaEn");
