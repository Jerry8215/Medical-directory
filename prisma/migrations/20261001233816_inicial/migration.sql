-- CreateEnum
CREATE TYPE "EstadoPerfil" AS ENUM ('BORRADOR', 'EN_REVISION', 'PUBLICADO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "TipoCredencial" AS ENUM ('CEDULA_PROFESIONAL', 'CEDULA_ESPECIALIDAD', 'CONSEJO_ESPECIALIDAD');

-- CreateEnum
CREATE TYPE "EstadoVerificacion" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('SOLICITADA', 'AGENDADA', 'CONFIRMADA', 'CANCELADA', 'ATENDIDA', 'NO_ASISTIO');

-- CreateEnum
CREATE TYPE "CanalAviso" AS ENUM ('CORREO', 'WHATSAPP', 'PANEL');

-- CreateEnum
CREATE TYPE "EstadoAviso" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'RECEPCION', 'PROFESIONAL');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('RECIBIDA', 'EN_VERIFICACION', 'PUBLICADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "Ciudad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'Chihuahua',
    "descripcion" TEXT,
    "umbralMinimo" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profesion" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "exigeConsejo" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Profesion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Especialidad" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "profesionId" TEXT NOT NULL,
    "umbralMinimo" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Especialidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Padecimiento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT,
    "especialidadId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Padecimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profesional" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "profesionId" TEXT NOT NULL,
    "semblanza" TEXT,
    "fotografia" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "estado" "EstadoPerfil" NOT NULL DEFAULT 'BORRADOR',
    "avisoCorreo" BOOLEAN NOT NULL DEFAULT true,
    "avisoWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfesionalEspecialidad" (
    "profesionalId" TEXT NOT NULL,
    "especialidadId" TEXT NOT NULL,
    "principal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ProfesionalEspecialidad_pkey" PRIMARY KEY ("profesionalId","especialidadId")
);

-- CreateTable
CREATE TABLE "Verificacion" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "tipo" "TipoCredencial" NOT NULL,
    "numero" TEXT,
    "institucion" TEXT,
    "vigenteHasta" TIMESTAMP(3),
    "estado" "EstadoVerificacion" NOT NULL DEFAULT 'PENDIENTE',
    "evidencia" TEXT,
    "revisadaPor" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consultorio" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "ciudadId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "referencias" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "precioValoracion" INTEGER,
    "duracionCitaMin" INTEGER NOT NULL DEFAULT 30,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Consultorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Franja" (
    "id" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "desde" TEXT NOT NULL,
    "hasta" TEXT NOT NULL,

    CONSTRAINT "Franja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "consultorioId" TEXT NOT NULL,
    "pacienteId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'AGENDADA',
    "origen" TEXT NOT NULL DEFAULT 'web',
    "motivo" TEXT,
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paciente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT,
    "telefono" TEXT NOT NULL,
    "correo" TEXT,
    "consentimiento" TIMESTAMP(3),
    "bajaEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aviso" (
    "id" TEXT NOT NULL,
    "citaId" TEXT NOT NULL,
    "canal" "CanalAviso" NOT NULL,
    "destino" TEXT NOT NULL,
    "estado" "EstadoAviso" NOT NULL DEFAULT 'PENDIENTE',
    "detalle" TEXT,
    "enviadoEn" TIMESTAMP(3),
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aviso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opinion" (
    "id" TEXT NOT NULL,
    "profesionalId" TEXT NOT NULL,
    "autor" TEXT NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "publicada" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Opinion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "hashClave" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'RECEPCION',
    "profesionalId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ajuste" (
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,

    CONSTRAINT "Ajuste_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "SolicitudAlta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "profesionSlug" TEXT NOT NULL,
    "especialidad" TEXT NOT NULL,
    "ciudadSlug" TEXT NOT NULL,
    "cedula" TEXT NOT NULL,
    "consejo" TEXT,
    "consultorio" TEXT,
    "mensaje" TEXT,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'RECIBIDA',
    "revisadaPor" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "creadaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudAlta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistroAuditoria" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "detalle" TEXT,
    "cuando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegistroAuditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ciudad_slug_key" ON "Ciudad"("slug");

-- CreateIndex
CREATE INDEX "Ciudad_activa_orden_idx" ON "Ciudad"("activa", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Profesion_slug_key" ON "Profesion"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Especialidad_slug_key" ON "Especialidad"("slug");

-- CreateIndex
CREATE INDEX "Especialidad_activa_orden_idx" ON "Especialidad"("activa", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Padecimiento_especialidadId_slug_key" ON "Padecimiento"("especialidadId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_slug_key" ON "Profesional"("slug");

-- CreateIndex
CREATE INDEX "Profesional_estado_idx" ON "Profesional"("estado");

-- CreateIndex
CREATE INDEX "Verificacion_profesionalId_tipo_idx" ON "Verificacion"("profesionalId", "tipo");

-- CreateIndex
CREATE INDEX "Verificacion_estado_vigenteHasta_idx" ON "Verificacion"("estado", "vigenteHasta");

-- CreateIndex
CREATE INDEX "Consultorio_ciudadId_activo_idx" ON "Consultorio"("ciudadId", "activo");

-- CreateIndex
CREATE INDEX "Franja_consultorioId_dia_idx" ON "Franja"("consultorioId", "dia");

-- CreateIndex
CREATE INDEX "Cita_profesionalId_inicio_idx" ON "Cita"("profesionalId", "inicio");

-- CreateIndex
CREATE INDEX "Cita_consultorioId_inicio_idx" ON "Cita"("consultorioId", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_telefono_key" ON "Paciente"("telefono");

-- CreateIndex
CREATE INDEX "Aviso_estado_creadoEn_idx" ON "Aviso"("estado", "creadoEn");

-- CreateIndex
CREATE INDEX "Opinion_profesionalId_publicada_idx" ON "Opinion"("profesionalId", "publicada");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- CreateIndex
CREATE INDEX "SolicitudAlta_estado_creadaEn_idx" ON "SolicitudAlta"("estado", "creadaEn");

-- CreateIndex
CREATE INDEX "RegistroAuditoria_cuando_idx" ON "RegistroAuditoria"("cuando");

-- AddForeignKey
ALTER TABLE "Especialidad" ADD CONSTRAINT "Especialidad_profesionId_fkey" FOREIGN KEY ("profesionId") REFERENCES "Profesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Padecimiento" ADD CONSTRAINT "Padecimiento_especialidadId_fkey" FOREIGN KEY ("especialidadId") REFERENCES "Especialidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_profesionId_fkey" FOREIGN KEY ("profesionId") REFERENCES "Profesion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalEspecialidad" ADD CONSTRAINT "ProfesionalEspecialidad_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfesionalEspecialidad" ADD CONSTRAINT "ProfesionalEspecialidad_especialidadId_fkey" FOREIGN KEY ("especialidadId") REFERENCES "Especialidad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verificacion" ADD CONSTRAINT "Verificacion_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultorio" ADD CONSTRAINT "Consultorio_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultorio" ADD CONSTRAINT "Consultorio_ciudadId_fkey" FOREIGN KEY ("ciudadId") REFERENCES "Ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Franja" ADD CONSTRAINT "Franja_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_consultorioId_fkey" FOREIGN KEY ("consultorioId") REFERENCES "Consultorio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aviso" ADD CONSTRAINT "Aviso_citaId_fkey" FOREIGN KEY ("citaId") REFERENCES "Cita"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opinion" ADD CONSTRAINT "Opinion_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_profesionalId_fkey" FOREIGN KEY ("profesionalId") REFERENCES "Profesional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
