-- El cobro con tarjeta, por suscripción recurrente.
--
-- Hasta ahora el dinero entraba solo por transferencia: el médico elegía
-- plan, depositaba, reportaba su referencia y alguien del consultorio la
-- aprobaba a mano. Eso funciona pero depende de que alguien revise, y lo
-- que no se revisa un lunes se cobra el jueves.
--
-- Dos columnas, y ninguna cambia lo que ya existe:
--
--   · `Profesional.suscripcionId` guarda la suscripción en el procesador.
--     Es lo único con lo que se puede consultar o cancelar el cobro
--     automático después; sin ella, dar de baja obligaría a entrar al
--     panel del proveedor.
--
--   · `Pago.idExterno` guarda el identificador del cobro. Es único a
--     propósito: los webhooks se reintentan y llegan repetidos, y sin esta
--     restricción el mismo cobro se acreditaría dos veces y la suscripción
--     ganaría un mes que nadie pagó. La base lo impide aunque el código
--     falle.

ALTER TABLE "Profesional" ADD COLUMN "suscripcionId" TEXT;
ALTER TABLE "Profesional" ADD COLUMN "suscripcionEstado" TEXT;
CREATE UNIQUE INDEX "Profesional_suscripcionId_key" ON "Profesional"("suscripcionId");

ALTER TABLE "Pago" ADD COLUMN "idExterno" TEXT;
CREATE UNIQUE INDEX "Pago_idExterno_key" ON "Pago"("idExterno");
