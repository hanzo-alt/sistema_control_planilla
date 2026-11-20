# API REST - Sistema de Control de Asistencia y Planilla

## Descripción del proyecto

Este proyecto consiste en el desarrollo de una API REST para un sistema de control, cuyo objetivo es gestionar la información y los procesos relacionados con el caso seleccionado.

La API permitirá realizar operaciones de creación, consulta, actualización y eliminación de registros, además de implementar mecanismos de autenticación, autorización y validación de datos.

## Objetivos

- Desarrollar una API REST utilizando buenas prácticas.
- Diseñar e implementar una base de datos relacional.
- Implementar operaciones CRUD.
- Aplicar mecanismos de seguridad mediante JWT y roles.
- Implementar transacciones y reglas de negocio.

## Tecnologías utilizadas

- **Backend:** Node.js y Express.
- **Base de datos:** MariaDB.
- **Autenticación:** JSON Web Token (JWT).
- **Pruebas:** Postman y bruno.
- **Control de versiones:** Git y GitHub.
 

## Instalación y ejecución

La guía de instalación y ejecución se completará conforme avance el desarrollo del proyecto.

## Estado del proyecto

**Fase actual:** Diseño (Hito 1).

Proyecto académico desarrollado como parte de la asignatura correspondiente.

## Estructura del Proyecto

Arquitectura por capas para separar rutas, lógica de negocio y consultas a base de datos:

```text
proyecto-planilla-api/
├── src/
│   ├── config/          # Conexión MariaDB 11.8.6 y variables de entorno
│   ├── middlewares/     # Validación JWT, roles y manejo de errores
│   ├── database/
script de la creacion de la database del proyecto, y scripts sql en general
│   ├── routes/          # Definición de endpoints (/api)
│   ├── controllers/     # Manejo de peticiones HTTP (req/res)
│   ├── services/        # Lógica de negocio y cálculo de planillas
│   ├── repositories/    # Consultas SQL parametrizadas
│   └──app.js           # Configuración de Express 
├── .env.example
├── package.json
└── server.js            # 


Punto de entrada del servidor
```

## Autenticación y Seguridad

La API utiliza **JSON Web Tokens (JWT)** para autenticar peticiones y controlar el acceso mediante roles (`ADMIN_RRHH` y `EMPLEADO`).

* **Encabezado requerido en rutas protegidas:**

  ```
  Authorization: Bearer <token_jwt>
  
  ```

## Documentación de Endpoints

### 1. Autenticación (`/api/auth`)

#### `POST /api/auth/login`

* **Acceso:** Público

* **Descripción:** Valida las credenciales del usuario (correo y contraseña) y devuelve un token JWT con su `usuario_id` y `rol`.

#### `POST /api/auth/register`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Crea una nueva cuenta de acceso en la tabla `usuarios`. Permite definir el rol (`ADMIN_RRHH` o `EMPLEADO`) para vincularla opcionalmente a un colaborador.

### 2. Estructura Organizacional (`/api/departamentos` y `/api/puestos`)

#### `GET /api/departamentos`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Obtiene la lista completa de las áreas funcionales de la empresa.

#### `POST /api/departamentos`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Registra un nuevo departamento en la organización.

#### `GET /api/puestos`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Lista todos los cargos disponibles junto con su departamento asociado y su salario base de referencia.

#### `POST /api/puestos`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Crea un nuevo puesto de trabajo vinculado obligatoriamente a un `departamento_id`.

### 3. Gestión de Empleados (`/api/empleados`)

#### `GET /api/empleados`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Retorna el listado general de colaboradores activos e inactivos, incluyendo su puesto y departamento.

#### `GET /api/empleados/:id`

* **Acceso:** `ADMIN_RRHH` / Propio

* **Descripción:** Consulta el expediente detallado de un empleado específico. Un empleado solo puede consultar su propio registro.

#### `POST /api/empleados`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Registra un nuevo colaborador con sus datos personales, `salario_base`, `puesto_id` y su `usuario_id` (opcional si aún no tiene acceso a la app móvil).

#### `PATCH /api/empleados/:id/estado`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Activa o desactiva laboralmente a un empleado (`ACTIVO` / `INACTIVO`) preservando su historial de asistencias y planillas.

### 4. Control de Asistencias (`/api/asistencias`)

#### `POST /api/asistencias/entrada`

* **Acceso:** `EMPLEADO` / `ADMIN_RRHH`

* **Descripción:** Registra la fecha y hora exacta de entrada del colaborador autenticado.

#### `PATCH /api/asistencias/:id/salida`

* **Acceso:** `EMPLEADO` / `ADMIN_RRHH`

* **Descripción:** Registra la hora de salida de una jornada abierta y calcula automáticamente las horas trabajadas y horas extras acumuladas.

#### `GET /api/asistencias/mias`

* **Acceso:** `EMPLEADO`

* **Descripción:** Permite al colaborador consultar su propio historial de marcajes desde la aplicación móvil (identificado mediante su token JWT).

#### `GET /api/asistencias`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Consulta el reporte general de asistencias de toda la empresa, permitiendo filtrar por rango de fechas o por empleado.

### 5. Catálogo Salarial (`/api/conceptos-nomina`)

#### `GET /api/conceptos-nomina`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Lista las reglas financieras configuradas en el sistema, tanto percepciones (bonos, horas extra) como deducciones (IHSS, RAP, ISR, adelantos).

#### `POST /api/conceptos-nomina`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Crea una nueva regla de percepción o deducción (`PERCEPCION` / `DEDUCCION`) con su tipo de cálculo (monto fijo o porcentaje) para aplicarse dinámicamente en las planillas.

### 6. Gestión de Planillas (`/api/planillas`)

#### `POST /api/planillas`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Abre un nuevo ciclo o período de pago en estado `ABIERTA`, definiendo la fecha de inicio, fecha de fin y fecha de pago.

#### `POST /api/planillas/:id/calcular`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Ejecuta el cálculo masivo de la nómina para los empleados activos, generando los registros en `detalle_planilla` y su desglose en `movimientos_planilla` según asistencias y conceptos vigentes.

#### `PATCH /api/planillas/:id/cerrar`

* **Acceso:** `ADMIN_RRHH`

* **Descripción:** Cambia el estado de la planilla a `CERRADA`, bloqueando cualquier recalculo o modificación posterior sobre ese período.

#### `GET /api/planillas/:id/colilla/:empleadoId`

* **Acceso:** `ADMIN_RRHH` / Propio

* **Descripción:** Devuelve el recibo o colilla de pago individual de un empleado en un período específico, mostrando salario base, percepciones, deducciones y salario neto a recibir.