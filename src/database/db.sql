-- =============================================
-- CREACIÓN DE BASE DE DATOS
-- =============================================

CREATE DATABASE IF NOT EXISTS sistema_control
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

-- =============================================
-- SELECCIONAR BASE DE DATOS
-- =============================================

USE sistema_control;

CREATE TABLE `asitencia` (
    `id` DECIMAL(38,0) NOT NULL,
    `fecha` DECIMAL(16,0) NOT NULL,
    `hora_entrada` DATETIME NOT NULL,
    `hora_salida` DATETIME NOT NULL,
    `horas_trabajadas` DECIMAL(3,2) NOT NULL,
    `horas_extra` DECIMAL(3,2) NOT NULL,
    `observacion` VARCHAR(160),
    `empleado_id` DECIMAL(38,0) NOT NULL,

    CONSTRAINT `asitencia_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `concepto_nomina` (
    `id` DECIMAL(38,0) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `tipo` VARCHAR(20) NOT NULL,
    `porcentaje` DECIMAL(10,4) NOT NULL,
    `valor` DECIMAL(8,2) NOT NULL,

    CONSTRAINT `concepto_nomina_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `departamento` (
    `id` DECIMAL(38,0) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `descripcion` VARCHAR(200),

    CONSTRAINT `departamento_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `detalle_planilla` (
    `id` DECIMAL(38,0) NOT NULL,
    `salario_devengado` DECIMAL(8,2) NOT NULL,
    `total_percepciones` DECIMAL(8,2) NOT NULL,
    `total_deducciones` DECIMAL(8,2) NOT NULL,
    `salario_neto` DECIMAL(8,2) NOT NULL,
    `empleado_id` DECIMAL(38,0) NOT NULL,
    `planilla_id` DECIMAL(38,0) NOT NULL,

    CONSTRAINT `detalle_planilla_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `empleado` (
    `id` DECIMAL(38,0) NOT NULL,
    `dni` DECIMAL(16,0) NOT NULL,
    `nombres` VARCHAR(60) NOT NULL,
    `apellidos` VARCHAR(60) NOT NULL,
    `fecha_ingreso` DATETIME NOT NULL,
    `salario_base` DECIMAL(8,2) NOT NULL,
    `estado` DECIMAL(38,0) NOT NULL,
    `puesto_id` DECIMAL(38,0) NOT NULL,
    `usuario_id` DECIMAL(38,0),

    CONSTRAINT `empleado_PK`
        PRIMARY KEY (`id`),

    UNIQUE KEY `empleado__IDX` (`usuario_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `movimiento_planilla` (
    `id` DECIMAL(38,0) NOT NULL,
    `monto_calculado` DECIMAL(8,2) NOT NULL,
    `concepto_nomina_id` DECIMAL(38,0) NOT NULL,
    `detalle_planilla_id` DECIMAL(38,0) NOT NULL,

    CONSTRAINT `movimiento_planilla_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `planilla` (
    `id` DECIMAL(38,0) NOT NULL,
    `codigo_periodo` VARCHAR(30) NOT NULL,
    `fecha_inicio` DATETIME NOT NULL,
    `fecha_fin` DATETIME NOT NULL,
    `fecha_pago` DATETIME NOT NULL,
    `estado` VARCHAR(30) NOT NULL,
    `total_pagado` DECIMAL(8,2) NOT NULL,

    CONSTRAINT `planilla_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `puesto` (
    `id` DECIMAL(38,0) NOT NULL,
    `nombre` VARCHAR(60) NOT NULL,
    `salario_base_ref` DECIMAL(8,2) NOT NULL,
    `departamento_id` DECIMAL(38,0) NOT NULL,

    CONSTRAINT `puesto_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE `usuario` (
    `id` DECIMAL(38,0) NOT NULL,
    `correo` VARCHAR(100) NOT NULL,
    `password` VARCHAR(500) NOT NULL,
    `rol` VARCHAR(40) NOT NULL,
    `estado` VARCHAR(30) NOT NULL,

    CONSTRAINT `usuario_PK`
        PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- =============================================
-- CLAVES FORÁNEAS
-- =============================================

ALTER TABLE `asitencia`
    ADD CONSTRAINT `asitencia_empleado_FK`
    FOREIGN KEY (`empleado_id`)
    REFERENCES `empleado` (`id`);


ALTER TABLE `movimiento_planilla`
    ADD CONSTRAINT `concepto_nomina_id`
    FOREIGN KEY (`concepto_nomina_id`)
    REFERENCES `concepto_nomina` (`id`);


ALTER TABLE `detalle_planilla`
    ADD CONSTRAINT `detalle_planilla_empleado_FK`
    FOREIGN KEY (`empleado_id`)
    REFERENCES `empleado` (`id`);


ALTER TABLE `movimiento_planilla`
    ADD CONSTRAINT `detalle_planilla_id`
    FOREIGN KEY (`detalle_planilla_id`)
    REFERENCES `detalle_planilla` (`id`);


ALTER TABLE `detalle_planilla`
    ADD CONSTRAINT `detalle_planilla_planilla_FK`
    FOREIGN KEY (`planilla_id`)
    REFERENCES `planilla` (`id`);


ALTER TABLE `empleado`
    ADD CONSTRAINT `empleado_puesto_FK`
    FOREIGN KEY (`puesto_id`)
    REFERENCES `puesto` (`id`);


ALTER TABLE `empleado`
    ADD CONSTRAINT `empleado_usuario_FK`
    FOREIGN KEY (`usuario_id`)
    REFERENCES `usuario` (`id`);


ALTER TABLE `puesto`
    ADD CONSTRAINT `puesto_departamento_FK`
    FOREIGN KEY (`departamento_id`)
    REFERENCES `departamento` (`id`);