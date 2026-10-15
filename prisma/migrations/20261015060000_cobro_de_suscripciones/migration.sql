-- Cobro de las suscripciones.
--
-- El importe va en centavos y como entero: con decimales, sumar dos
-- cobros termina dando 598.9999999 y cada pantalla lo redondea distinto.
--
-- El folio es único pero admite nulos: solo se asigna al acreditarse, de
-- modo que un pago pendiente o rechazado no consume numeración del recibo.

CREATE TYPE "MedioPago" AS ENUM ('TRANSFERENCIA', 'TARJETA', 'CORTESIA');

CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'EN_REVISION', 'ACREDITADO', 'RECHAZADO');

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "plan" "PlanSuscripcion" NOT NULL,
    "meses" INTEGER NOT NULL,
    "importe" INTEGER NOT NULL,
    "medio" "MedioPago" NOT NULL,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "folio" TEXT,
    "referencia" TEXT,
    "periodoDesde" TIMESTAMP(3),
    "periodoHasta" TIMESTAMP(3),
    "revisadoPor" TEXT,
    "revisadoEn" TIMESTAMP(3),
    "detalle" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pago_folio_key" ON "Pago"("folio");

CREATE INDEX "Pago_profesionalId_creadoEn_idx" ON "Pago"("profesionalId", "creadoEn");

CREATE INDEX "Pago_estado_creadoEn_idx" ON "Pago"("estado", "creadoEn");

ALTER TABLE "Pago" ADD CONSTRAINT "Pago_profesionalId_fkey"
    FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
