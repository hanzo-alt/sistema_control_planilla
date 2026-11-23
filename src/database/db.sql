-- =============================================================
-- SISTEMA DE CONTROL DE ASISTENCIA Y PLANILLA
-- Motor: MySQL 8 / MariaDB 10.5+ (probado en MariaDB 11.8)
-- Codificación: utf8mb4
-- =============================================================
--
-- IMPORTANTE:
-- Este es un script de INSTALACIÓN LIMPIA. Elimina las tablas
-- existentes de la base de datos sistema_control y las vuelve a
-- crear. No lo ejecutes sobre una base con datos reales sin
-- respaldarla primero.
--
-- Orden de creación (de padres a hijos):
--   usuario, departamento, puesto, empleado, planilla,
--   concepto_nomina, asistencia, detalle_planilla,
--   movimiento_planilla
-- =============================================================

CREATE DATABASE IF NOT EXISTS sistema_control
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_control;

SET NAMES utf8mb4;

-- -------------------------------------------------------------
-- LIMPIEZA DE TABLAS ANTERIORES
-- Se desactivan las FK para poder borrar en cualquier orden.
-- "asitencia" es la tabla antigua con el nombre mal escrito.
-- -------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS movimiento_planilla;
DROP TABLE IF EXISTS detalle_planilla;
DROP TABLE IF EXISTS asistencia;
DROP TABLE IF EXISTS asitencia;
DROP TABLE IF EXISTS planilla;
DROP TABLE IF EXISTS concepto_nomina;
DROP TABLE IF EXISTS empleado;
DROP TABLE IF EXISTS puesto;
DROP TABLE IF EXISTS departamento;
DROP TABLE IF EXISTS usuario;

SET FOREIGN_KEY_CHECKS = 1;

-- =============================================================
-- 1. USUARIO
-- Cuenta de acceso al sistema. La contraseña se guarda hasheada
-- con bcrypt (60 caracteres), por eso VARCHAR(255).
-- =============================================================
CREATE TABLE usuario (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    correo      VARCHAR(100)    NOT NULL,
    password    VARCHAR(255)    NOT NULL,
    rol         ENUM('ADMIN_RRHH', 'EMPLEADO') NOT NULL DEFAULT 'EMPLEADO',
    estado      ENUM('ACTIVO', 'INACTIVO')     NOT NULL DEFAULT 'ACTIVO',
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_correo (correo)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 2. DEPARTAMENTO
-- Área funcional de la empresa.
-- =============================================================
CREATE TABLE departamento (
    id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(60)     NOT NULL,
    descripcion VARCHAR(200)    NULL,
    created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_departamento_nombre (nombre)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 3. PUESTO
-- Cargo dentro de un departamento y salario de referencia.
-- =============================================================
CREATE TABLE puesto (
    id               BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(60)     NOT NULL,
    salario_base_ref DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    tarifa_hora_extra DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    departamento_id  BIGINT UNSIGNED NOT NULL,
    created_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                     ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_puesto_departamento_nombre (departamento_id, nombre),
    KEY idx_puesto_departamento (departamento_id),

    CONSTRAINT chk_puesto_salario
        CHECK (salario_base_ref >= 0),

    CONSTRAINT chk_puesto_tarifa_extra
        CHECK (tarifa_hora_extra >= 0),

    CONSTRAINT fk_puesto_departamento
        FOREIGN KEY (departamento_id) REFERENCES departamento (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 4. EMPLEADO
-- dni es VARCHAR para conservar ceros iniciales.
-- estado reemplaza al DECIMAL(38,0) que traía el modelo original.
-- fecha_ingreso es DATE (no hace falta la hora de ingreso).
-- usuario_id es opcional y único: un usuario atiende a un empleado.
-- =============================================================
CREATE TABLE empleado (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    dni            VARCHAR(16)     NOT NULL,
    nombres        VARCHAR(60)     NOT NULL,
    apellidos      VARCHAR(60)     NOT NULL,
    fecha_ingreso  DATE            NOT NULL,
    salario_base   DECIMAL(10, 2)  NOT NULL,
    estado         ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    puesto_id      BIGINT UNSIGNED NOT NULL,
    usuario_id     BIGINT UNSIGNED NULL,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_empleado_dni (dni),
    UNIQUE KEY uq_empleado_usuario (usuario_id),
    KEY idx_empleado_puesto (puesto_id),
    KEY idx_empleado_estado (estado),

    CONSTRAINT chk_empleado_salario
        CHECK (salario_base > 0),

    CONSTRAINT fk_empleado_puesto
        FOREIGN KEY (puesto_id) REFERENCES puesto (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_empleado_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuario (id)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 5. PLANILLA
-- Período de pago. codigo_periodo es único (ej. 2026-11-Q1).
-- Solo puede haber una planilla por código de período.
-- =============================================================
CREATE TABLE planilla (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    codigo_periodo VARCHAR(30)     NOT NULL,
    fecha_inicio   DATE            NOT NULL,
    fecha_fin      DATE            NOT NULL,
    fecha_pago     DATE            NOT NULL,
    estado         ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
    total_pagado   DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                   ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_planilla_codigo (codigo_periodo),
    KEY idx_planilla_estado (estado),
    KEY idx_planilla_fechas (fecha_inicio, fecha_fin),

    CONSTRAINT chk_planilla_fechas
        CHECK (fecha_fin >= fecha_inicio),
    CONSTRAINT chk_planilla_total
        CHECK (total_pagado >= 0)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 6. CONCEPTO_NOMINA
-- Reglas de percepción o deducción.
-- tipo_calculo define cómo se calcula:
--   FIJO       -> usa valor
--   PORCENTAJE -> usa porcentaje (0 a 100)
-- El CHECK impide que se llenen ambos o ninguno.
-- =============================================================
CREATE TABLE concepto_nomina (
    id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(60)     NOT NULL,
    tipo          ENUM('PERCEPCION', 'DEDUCCION') NOT NULL,
    tipo_calculo  ENUM('FIJO', 'PORCENTAJE')      NOT NULL DEFAULT 'FIJO',
    valor         DECIMAL(10, 2)  NULL,
    porcentaje    DECIMAL(6, 4)   NULL,
    estado        ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                  ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_concepto_nomina_nombre (nombre),
    KEY idx_concepto_nomina_estado (estado),

    CONSTRAINT chk_concepto_nomina_calculo
        CHECK (
            (tipo_calculo = 'FIJO'
                AND valor IS NOT NULL AND valor >= 0
                AND porcentaje IS NULL)
            OR
            (tipo_calculo = 'PORCENTAJE'
                AND porcentaje IS NOT NULL
                AND porcentaje >= 0 AND porcentaje <= 100
                AND valor IS NULL)
        )
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 7. ASISTENCIA
-- Antes se llamaba "asitencia" (error de escritura).
-- hora_salida es NULL hasta que el empleado marca su salida.
-- Un empleado solo puede tener un registro por fecha.
-- =============================================================
CREATE TABLE asistencia (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    empleado_id       BIGINT UNSIGNED NOT NULL,
    fecha             DATE            NOT NULL,
    hora_entrada      DATETIME        NOT NULL,
    hora_salida       DATETIME        NULL,
    horas_trabajadas  DECIMAL(5, 2)   NOT NULL DEFAULT 0.00,
    horas_extra       DECIMAL(5, 2)   NOT NULL DEFAULT 0.00,
    observacion       VARCHAR(160)    NULL,
    created_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                      ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_asistencia_empleado_fecha (empleado_id, fecha),
    KEY idx_asistencia_fecha (fecha),

    CONSTRAINT chk_asistencia_horas
        CHECK (horas_trabajadas >= 0 AND horas_extra >= 0),
    CONSTRAINT chk_asistencia_salida
        CHECK (hora_salida IS NULL OR hora_salida >= hora_entrada),

    CONSTRAINT fk_asistencia_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleado (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 8. DETALLE_PLANILLA
-- Resultado del cálculo de nómina de un empleado en una planilla.
-- Un empleado aparece una sola vez por planilla.
-- Si se elimina la planilla, se eliminan sus detalles.
-- =============================================================
CREATE TABLE detalle_planilla (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    planilla_id         BIGINT UNSIGNED NOT NULL,
    empleado_id         BIGINT UNSIGNED NOT NULL,
    salario_devengado   DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    total_percepciones  DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    total_deducciones   DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    salario_neto        DECIMAL(10, 2)  NOT NULL DEFAULT 0.00,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_detalle_planilla_empleado (planilla_id, empleado_id),
    KEY idx_detalle_planilla_empleado (empleado_id),

    CONSTRAINT chk_detalle_planilla_montos
        CHECK (salario_devengado >= 0
           AND total_percepciones >= 0
           AND total_deducciones >= 0
           AND salario_neto >= 0),

    CONSTRAINT fk_detalle_planilla_planilla
        FOREIGN KEY (planilla_id) REFERENCES planilla (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_detalle_planilla_empleado
        FOREIGN KEY (empleado_id) REFERENCES empleado (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- 9. MOVIMIENTO_PLANILLA
-- Desglose de cada concepto aplicado a un detalle de planilla.
-- Se elimina en cascada si se elimina su detalle.
-- =============================================================
CREATE TABLE movimiento_planilla (
    id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    detalle_planilla_id BIGINT UNSIGNED NOT NULL,
    concepto_nomina_id  BIGINT UNSIGNED NOT NULL,
    monto_calculado     DECIMAL(10, 2)  NOT NULL,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    KEY idx_movimiento_detalle (detalle_planilla_id),
    KEY idx_movimiento_concepto (concepto_nomina_id),

    CONSTRAINT chk_movimiento_monto
        CHECK (monto_calculado >= 0),

    CONSTRAINT fk_movimiento_detalle
        FOREIGN KEY (detalle_planilla_id) REFERENCES detalle_planilla (id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_movimiento_concepto
        FOREIGN KEY (concepto_nomina_id) REFERENCES concepto_nomina (id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

-- =============================================================
-- DATOS DE PRUEBA (OPCIONAL)
-- Puedes borrar esta sección si vas a cargar datos reales.
-- =============================================================

-- Usuario administrador de ejemplo.
-- Correo:    admin@empresa.com
-- Password:  Admin1234!
-- El hash fue generado con bcrypt (10 rondas). Cámbialo en producción.
INSERT INTO usuario (id, correo, password, rol, estado) VALUES
    (1,
     'admin@empresa.com',
     '$2b$10$sSGNE0HZTOxKhtH1zS38juAnEpPFYa0Ru7ZpEl0e0Q9JcOuLRWZO6',
     'ADMIN_RRHH',
     'ACTIVO');

-- Departamento y puesto base para poder registrar empleados.
INSERT INTO departamento (id, nombre, descripcion) VALUES
    (1, 'Recursos Humanos', 'Gestión de personal, planillas y asistencias');

INSERT INTO puesto (id, nombre, salario_base_ref, departamento_id) VALUES
    (1, 'Analista de Recursos Humanos', 18000.00, 1);

-- Conceptos de nómina de ejemplo para probar los cálculos.
INSERT INTO concepto_nomina
    (id, nombre, tipo, tipo_calculo, valor, porcentaje, estado)
VALUES
    (1, 'Bono fijo de ejemplo',        'PERCEPCION', 'FIJO',       500.00, NULL,    'ACTIVO'),
    (2, 'Deducción fija de ejemplo',   'DEDUCCION',  'FIJO',       100.00, NULL,    'ACTIVO'),
    (3, 'Bonificación porcentual 5%',  'PERCEPCION', 'PORCENTAJE', NULL,   5.0000,  'ACTIVO');

-- =============================================================
-- FIN DEL SCRIPT
-- =============================================================
