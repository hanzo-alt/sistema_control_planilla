import {
    listarEmpleados,
    obtenerEmpleadoPorId,
    crearEmpleado as crearEmpleadoEnModelo,
    actualizarEmpleado as actualizarEmpleadoEnModelo,
    eliminarEmpleado as eliminarEmpleadoEnModelo
} from '../modelos/empleado.modelo.js';

const ESTADOS_VALIDOS = ['ACTIVO', 'INACTIVO'];
const MAX_SALARIO = 999999.99;

/**
 * Convierte y valida una fecha recibida como YYYY-MM-DD o YYYY-MM-DD HH:mm[:ss].
 * Devuelve la fecha en formato YYYY-MM-DD o null si no es válida.
 */
function normalizarFecha(valor) {
    if (typeof valor !== 'string') return null;

    const texto = valor.trim();
    const formato = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
    const partes = texto.match(formato);
    if (!partes) return null;

    const [, anio, mes, dia] = partes;
    const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) return null;
    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() + 1 !== Number(mes) ||
        fecha.getDate() !== Number(dia)
    ) {
        return null;
    }

    return `${anio}-${mes}-${dia}`;
}

/**
 * Valida un id numérico de la URL.
 */
function parsearId(valor) {
    const id = String(valor ?? '').trim();
    if (!/^\d+$/.test(id) || id === '0') return null;
    return id;
}

/**
 * Valida y normaliza el body.
 * - parcial = false: todos los campos son obligatorios (crear).
 * - parcial = true: solo valida los campos enviados (actualizar).
 */
function validarEmpleado(body = {}, { parcial = false } = {}) {
    const errores = [];
    const datos = {};
    const tiene = (campo) => Object.prototype.hasOwnProperty.call(body, campo);
    const debeValidar = (campo) => !parcial || tiene(campo);

    if (debeValidar('dni')) {
        const dni = String(body.dni ?? '').trim();
        if (!dni) {
            errores.push('El campo dni es obligatorio.');
        } else if (!/^\d{1,16}$/.test(dni)) {
            errores.push('El dni debe contener solo dígitos (máximo 16).');
        } else {
            datos.dni = dni;
        }
    }

    if (debeValidar('nombres')) {
        const nombres = String(body.nombres ?? '').trim();
        if (!nombres) {
            errores.push('El campo nombres es obligatorio.');
        } else if (nombres.length > 60) {
            errores.push('El campo nombres no puede superar los 60 caracteres.');
        } else {
            datos.nombres = nombres;
        }
    }

    if (debeValidar('apellidos')) {
        const apellidos = String(body.apellidos ?? '').trim();
        if (!apellidos) {
            errores.push('El campo apellidos es obligatorio.');
        } else if (apellidos.length > 60) {
            errores.push('El campo apellidos no puede superar los 60 caracteres.');
        } else {
            datos.apellidos = apellidos;
        }
    }

    if (debeValidar('fecha_ingreso')) {
        const fechaIngreso = normalizarFecha(body.fecha_ingreso);
        if (!fechaIngreso) {
            errores.push('El campo fecha_ingreso es obligatorio y debe tener formato YYYY-MM-DD.');
        } else {
            datos.fechaIngreso = fechaIngreso;
        }
    }

    if (debeValidar('salario_base')) {
        const salarioBase = Number(body.salario_base);
        if (
            body.salario_base === undefined ||
            body.salario_base === null ||
            body.salario_base === '' ||
            !Number.isFinite(salarioBase)
        ) {
            errores.push('El campo salario_base es obligatorio y debe ser numérico.');
        } else if (salarioBase <= 0) {
            errores.push('El salario_base debe ser mayor que cero.');
        } else if (salarioBase > MAX_SALARIO) {
            errores.push(`El salario_base no puede superar ${MAX_SALARIO}.`);
        } else {
            datos.salarioBase = salarioBase.toFixed(2);
        }
    }

    if (debeValidar('puesto_id')) {
        const puestoId = String(body.puesto_id ?? '').trim();
        if (!puestoId) {
            errores.push('El campo puesto_id es obligatorio.');
        } else if (!/^\d+$/.test(puestoId) || puestoId === '0') {
            errores.push('El puesto_id debe ser un identificador numérico válido.');
        } else {
            datos.puestoId = puestoId;
        }
    }

    if (debeValidar('usuario_id')) {
        const valor = body.usuario_id;
        if (valor === undefined || valor === null || valor === '') {
            datos.usuarioId = null;
        } else {
            const usuarioId = String(valor).trim();
            if (!/^\d+$/.test(usuarioId) || usuarioId === '0') {
                errores.push('El usuario_id debe ser un identificador numérico válido o null.');
            } else {
                datos.usuarioId = usuarioId;
            }
        }
    }

    if (debeValidar('estado')) {
        const estado = body.estado === undefined
            ? 'ACTIVO'
            : String(body.estado).trim().toUpperCase();

        if (!ESTADOS_VALIDOS.includes(estado)) {
            errores.push(`El estado debe ser ${ESTADOS_VALIDOS.join(' o ')}.`);
        } else {
            datos.estado = estado;
        }
    }

    return { datos, errores };
}

/**
 * Traduce errores de MySQL/MariaDB a respuestas HTTP.
 */
function responderError(error, res) {
    if (error.code === 'ER_DUP_ENTRY') {
        const esDni = /dni/i.test(error.message);
        return res.status(409).json({
            mensaje: esDni
                ? 'Ya existe un empleado con ese DNI.'
                : 'Ya existe un empleado con ese usuario_id.'
        });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            mensaje: 'El puesto_id o el usuario_id indicado no existe.'
        });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
            mensaje: 'No se puede eliminar el empleado porque tiene asistencias o planillas asociadas. Cambie su estado a INACTIVO.'
        });
    }

    if (error.code === 'ER_WARN_DATA_OUT_OF_RANGE' || error.code === 'WARN_DATA_TRUNCATED') {
        return res.status(400).json({
            mensaje: 'Uno de los valores enviados no es válido para la base de datos.'
        });
    }

    console.error('Error en empleados:', error);
    return res.status(500).json({
        mensaje: 'Error interno del servidor.'
    });
}

/**
 * GET /api/empleados       -> lista
 * GET /api/empleados/:id   -> muestra uno
 * El router usa esta misma función para ambas rutas.
 */
export async function mostrarEmpleados(req, res) {
    try {
        if (req.params.id !== undefined) {
            const id = parsearId(req.params.id);
            if (!id) {
                return res.status(400).json({ mensaje: 'El id del empleado no es válido.' });
            }

            const empleado = await obtenerEmpleadoPorId(id);
            if (!empleado) {
                return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
            }

            return res.json({ empleado });
        }

        const filtros = {};

        if (req.query.estado !== undefined) {
            const estado = String(req.query.estado).trim().toUpperCase();
            if (!ESTADOS_VALIDOS.includes(estado)) {
                return res.status(400).json({
                    mensaje: `El filtro estado debe ser ${ESTADOS_VALIDOS.join(' o ')}.`
                });
            }
            filtros.estado = estado;
        }

        if (req.query.puesto_id !== undefined) {
            const puestoId = String(req.query.puesto_id).trim();
            if (!/^\d+$/.test(puestoId) || puestoId === '0') {
                return res.status(400).json({
                    mensaje: 'El filtro puesto_id debe ser un identificador numérico válido.'
                });
            }
            filtros.puestoId = puestoId;
        }

        if (req.query.departamento_id !== undefined) {
            const departamentoId = String(req.query.departamento_id).trim();
            if (!/^\d+$/.test(departamentoId) || departamentoId === '0') {
                return res.status(400).json({
                    mensaje: 'El filtro departamento_id debe ser un identificador numérico válido.'
                });
            }
            filtros.departamentoId = departamentoId;
        }

        if (req.query.buscar !== undefined) {
            const buscar = String(req.query.buscar).trim();
            if (buscar.length > 60) {
                return res.status(400).json({
                    mensaje: 'El filtro buscar no puede superar los 60 caracteres.'
                });
            }
            if (buscar) filtros.buscar = buscar;
        }

        const empleados = await listarEmpleados(filtros);

        return res.json({
            total: empleados.length,
            empleados
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * POST /api/empleados
 */
export async function crearEmpleado(req, res) {
    const { datos, errores } = validarEmpleado(req.body);

    if (errores.length > 0) {
        return res.status(400).json({
            mensaje: 'Datos inválidos.',
            errores
        });
    }

    try {
        const id = await crearEmpleadoEnModelo(datos);
        const empleado = await obtenerEmpleadoPorId(id);

        return res.status(201).json({
            mensaje: 'Empleado registrado correctamente.',
            empleado
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * PUT /api/empleados/:id
 */
export async function actualizarEmpleado(req, res) {
    const id = parsearId(req.params.id);
    if (!id) {
        return res.status(400).json({ mensaje: 'El id del empleado no es válido.' });
    }

    const { datos, errores } = validarEmpleado(req.body, { parcial: true });

    if (errores.length > 0) {
        return res.status(400).json({
            mensaje: 'Datos inválidos.',
            errores
        });
    }

    if (Object.keys(datos).length === 0) {
        return res.status(400).json({
            mensaje: 'Envíe al menos un campo para actualizar.'
        });
    }

    try {
        const existente = await obtenerEmpleadoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }

        await actualizarEmpleadoEnModelo(id, datos);
        const empleado = await obtenerEmpleadoPorId(id);

        return res.json({
            mensaje: 'Empleado actualizado correctamente.',
            empleado
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * DELETE /api/empleados/:id
 */
export async function eliminarEmpleado(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El id del empleado no es válido.' });
        }

        const existente = await obtenerEmpleadoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }

        await eliminarEmpleadoEnModelo(id);

        return res.json({ mensaje: 'Empleado eliminado correctamente.' });
    } catch (error) {
        return responderError(error, res);
    }
}
