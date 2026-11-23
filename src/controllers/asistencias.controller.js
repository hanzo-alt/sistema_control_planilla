import {
    listarAsistencias,
    obtenerAsistenciaPorId,
    obtenerAsistenciaAbierta,
    crearAsistencia as crearAsistenciaEnModelo,
    registrarEntrada as registrarEntradaEnModelo,
    registrarSalida as registrarSalidaEnModelo,
    actualizarAsistencia as actualizarAsistenciaEnModelo,
    eliminarAsistencia as eliminarAsistenciaEnModelo
} from '../modelos/asistencia.modelo.js';
import { obtenerEmpleadoPorId } from '../modelos/empleado.modelo.js';
import {
    parsearId,
    normalizarFecha,
    normalizarFechaHora
} from '../utils/validacion.js';
import { calcularHoras, fechaHoraActual } from '../services/jornada.service.js';
import { responderError } from '../utils/errores.js';

function validarAsistencia(body = {}) {
    const errores = [];
    const datos = {};

    const empleadoId = String(body.empleado_id ?? '').trim();
    if (!empleadoId) {
        errores.push('El campo empleado_id es obligatorio.');
    } else if (!/^\d+$/.test(empleadoId) || empleadoId === '0') {
        errores.push('El empleado_id debe ser un identificador numérico válido.');
    } else {
        datos.empleadoId = empleadoId;
    }

    const horaEntrada = normalizarFechaHora(body.hora_entrada);
    if (!horaEntrada) {
        errores.push('El campo hora_entrada es obligatorio y debe tener formato YYYY-MM-DD HH:mm:ss.');
    } else {
        datos.horaEntrada = horaEntrada;
    }

    let fecha = null;
    if (body.fecha !== undefined && body.fecha !== null && body.fecha !== '') {
        fecha = normalizarFecha(body.fecha);
        if (!fecha) {
            errores.push('El campo fecha debe tener formato YYYY-MM-DD.');
        }
    } else if (horaEntrada) {
        fecha = horaEntrada.slice(0, 10);
    } else {
        errores.push('El campo fecha es obligatorio.');
    }

    if (
        fecha &&
        horaEntrada &&
        horaEntrada.slice(0, 10) !== fecha
    ) {
        errores.push('La fecha no coincide con el día de hora_entrada.');
    }

    let horaSalida = null;
    if (body.hora_salida !== undefined && body.hora_salida !== null && body.hora_salida !== '') {
        horaSalida = normalizarFechaHora(body.hora_salida);
        if (!horaSalida) {
            errores.push('El campo hora_salida debe tener formato YYYY-MM-DD HH:mm:ss.');
        } else if (horaEntrada && horaSalida < horaEntrada) {
            errores.push('La hora_salida no puede ser anterior a la hora_entrada.');
        }
    }

    let observacion = null;
    if (body.observacion !== undefined && body.observacion !== null && body.observacion !== '') {
        observacion = String(body.observacion).trim();
        if (observacion.length > 160) {
            errores.push('La observación no puede superar los 160 caracteres.');
        }
    }

    if (errores.length > 0) return { errores };

    const horas = calcularHoras(horaEntrada, horaSalida);

    return {
        datos: {
            empleadoId: datos.empleadoId,
            fecha,
            horaEntrada,
            horaSalida,
            horasTrabajadas: horas.horasTrabajadas,
            horasExtra: horas.horasExtra,
            observacion
        },
        errores
    };
}

/**
 * GET /api/asistencias       -> lista con filtros
 * GET /api/asistencias/:id   -> muestra una
 */
export async function mostrarAsistencias(req, res) {
    try {
        if (req.params.id !== undefined) {
            const id = parsearId(req.params.id);
            if (!id) {
                return res.status(400).json({ mensaje: 'El id de la asistencia no es válido.' });
            }

            const asistencia = await obtenerAsistenciaPorId(id);
            if (!asistencia) {
                return res.status(404).json({ mensaje: 'Asistencia no encontrada.' });
            }

            return res.json({ asistencia });
        }

        const filtros = {};

        if (req.query.empleado_id !== undefined) {
            const empleadoId = String(req.query.empleado_id).trim();
            if (!/^\d+$/.test(empleadoId) || empleadoId === '0') {
                return res.status(400).json({
                    mensaje: 'El filtro empleado_id debe ser un identificador numérico válido.'
                });
            }
            filtros.empleadoId = empleadoId;
        }

        if (req.query.fecha !== undefined) {
            const fecha = normalizarFecha(String(req.query.fecha));
            if (!fecha) {
                return res.status(400).json({
                    mensaje: 'El filtro fecha debe tener formato YYYY-MM-DD.'
                });
            }
            filtros.fecha = fecha;
        }

        if (req.query.fecha_desde !== undefined) {
            const fechaDesde = normalizarFecha(String(req.query.fecha_desde));
            if (!fechaDesde) {
                return res.status(400).json({
                    mensaje: 'El filtro fecha_desde debe tener formato YYYY-MM-DD.'
                });
            }
            filtros.fechaDesde = fechaDesde;
        }

        if (req.query.fecha_hasta !== undefined) {
            const fechaHasta = normalizarFecha(String(req.query.fecha_hasta));
            if (!fechaHasta) {
                return res.status(400).json({
                    mensaje: 'El filtro fecha_hasta debe tener formato YYYY-MM-DD.'
                });
            }
            filtros.fechaHasta = fechaHasta;
        }

        if (
            filtros.fechaDesde &&
            filtros.fechaHasta &&
            filtros.fechaDesde > filtros.fechaHasta
        ) {
            return res.status(400).json({
                mensaje: 'fecha_desde no puede ser mayor que fecha_hasta.'
            });
        }

        const asistencias = await listarAsistencias(filtros);

        return res.json({
            total: asistencias.length,
            asistencias
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * POST /api/asistencias
 */
export async function crearAsistencia(req, res) {
    const { datos, errores } = validarAsistencia(req.body);

    if (errores.length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        const id = await crearAsistenciaEnModelo(datos);
        const asistencia = await obtenerAsistenciaPorId(id);

        return res.status(201).json({
            mensaje: 'Asistencia registrada correctamente.',
            asistencia
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'Ya existe una asistencia para ese empleado en esa fecha.',
            referencia: 'El empleado_id indicado no existe.'
        });
    }
}

/**
 * PUT /api/asistencias/:id
 */
export async function actualizarAsistencia(req, res) {
    const id = parsearId(req.params.id);
    if (!id) {
        return res.status(400).json({ mensaje: 'El id de la asistencia no es válido.' });
    }

    if (Object.keys(req.body ?? {}).length === 0) {
        return res.status(400).json({ mensaje: 'Envíe al menos un campo para actualizar.' });
    }

    try {
        const existente = await obtenerAsistenciaPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Asistencia no encontrada.' });
        }

        const combinado = {
            empleado_id: req.body.empleado_id !== undefined
                ? req.body.empleado_id
                : existente.empleado_id,
            fecha: req.body.fecha !== undefined ? req.body.fecha : existente.fecha,
            hora_entrada: req.body.hora_entrada !== undefined
                ? req.body.hora_entrada
                : existente.hora_entrada,
            hora_salida: req.body.hora_salida !== undefined
                ? req.body.hora_salida
                : existente.hora_salida,
            observacion: req.body.observacion !== undefined
                ? req.body.observacion
                : existente.observacion
        };

        const { datos, errores } = validarAsistencia(combinado);

        if (errores.length > 0) {
            return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
        }

        await actualizarAsistenciaEnModelo(id, datos);
        const asistencia = await obtenerAsistenciaPorId(id);

        return res.json({
            mensaje: 'Asistencia actualizada correctamente.',
            asistencia
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'Ya existe una asistencia para ese empleado en esa fecha.',
            referencia: 'El empleado_id indicado no existe.'
        });
    }
}

/**
 * DELETE /api/asistencias/:id
 */
export async function eliminarAsistencia(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El id de la asistencia no es válido.' });
        }

        const existente = await obtenerAsistenciaPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Asistencia no encontrada.' });
        }

        await eliminarAsistenciaEnModelo(id);

        return res.json({ mensaje: 'Asistencia eliminada correctamente.' });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * POST /api/asistencias/entrada
 * Registra la entrada del empleado con la fecha y hora actuales.
 * Mientras no exista JWT, el empleado se envía en el body.
 */
export async function registrarEntrada(req, res) {
    const empleadoId = String(req.body?.empleado_id ?? '').trim();

    if (!empleadoId || !/^\d+$/.test(empleadoId) || empleadoId === '0') {
        return res.status(400).json({
            mensaje: 'El campo empleado_id es obligatorio y debe ser un identificador numérico válido.'
        });
    }

    try {
        const empleado = await obtenerEmpleadoPorId(empleadoId);
        if (!empleado) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }

        if (empleado.estado !== 'ACTIVO') {
            return res.status(409).json({
                mensaje: 'El empleado está INACTIVO y no puede registrar asistencia.'
            });
        }

        const jornadaAbierta = await obtenerAsistenciaAbierta(empleadoId);
        if (jornadaAbierta) {
            return res.status(409).json({
                mensaje: 'El empleado ya tiene una jornada abierta sin salida registrada.'
            });
        }

        const id = await registrarEntradaEnModelo(empleadoId);
        const asistencia = await obtenerAsistenciaPorId(id);

        return res.status(201).json({
            mensaje: 'Entrada registrada correctamente.',
            asistencia
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'El empleado ya registró su entrada hoy.',
            referencia: 'El empleado_id indicado no existe.'
        });
    }
}

/**
 * PATCH /api/asistencias/:id/salida
 * Registra la salida de una jornada abierta y calcula las horas.
 * Si no se envía hora_salida, se usa la hora actual.
 */
export async function marcarSalida(req, res) {
    const id = parsearId(req.params.id);
    if (!id) {
        return res.status(400).json({ mensaje: 'El id de la asistencia no es válido.' });
    }

    try {
        const asistencia = await obtenerAsistenciaPorId(id);
        if (!asistencia) {
            return res.status(404).json({ mensaje: 'Asistencia no encontrada.' });
        }

        if (asistencia.hora_salida) {
            return res.status(409).json({
                mensaje: 'Esta asistencia ya tiene una hora de salida registrada.'
            });
        }

        let horaSalida;

        if (req.body?.hora_salida !== undefined) {
            horaSalida = normalizarFechaHora(req.body.hora_salida);
            if (!horaSalida) {
                return res.status(400).json({
                    mensaje: 'El campo hora_salida debe tener formato YYYY-MM-DD HH:mm:ss.'
                });
            }
        } else {
            horaSalida = fechaHoraActual();
        }

        if (horaSalida < asistencia.hora_entrada) {
            return res.status(400).json({
                mensaje: 'La hora_salida no puede ser anterior a la hora_entrada.'
            });
        }

        const horas = calcularHoras(asistencia.hora_entrada, horaSalida);

        await registrarSalidaEnModelo(
            id,
            horaSalida,
            horas.horasTrabajadas,
            horas.horasExtra
        );

        const actualizada = await obtenerAsistenciaPorId(id);

        return res.json({
            mensaje: 'Salida registrada correctamente.',
            asistencia: actualizada
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * GET /api/asistencias/mias?empleado_id=1
 * Historial del empleado. Cuando se implemente JWT, el id saldrá del token.
 */
export async function mostrarMisAsistencias(req, res) {
    try {
        const empleadoId = String(req.query.empleado_id ?? '').trim();

        if (!empleadoId || !/^\d+$/.test(empleadoId) || empleadoId === '0') {
            return res.status(400).json({
                mensaje: 'El parámetro empleado_id es obligatorio por ahora (luego saldrá del JWT).'
            });
        }

        const empleado = await obtenerEmpleadoPorId(empleadoId);
        if (!empleado) {
            return res.status(404).json({ mensaje: 'Empleado no encontrado.' });
        }

        const filtros = { empleadoId };

        if (req.query.fecha_desde !== undefined) {
            const fechaDesde = normalizarFecha(String(req.query.fecha_desde));
            if (!fechaDesde) {
                return res.status(400).json({
                    mensaje: 'El filtro fecha_desde debe tener formato YYYY-MM-DD.'
                });
            }
            filtros.fechaDesde = fechaDesde;
        }

        if (req.query.fecha_hasta !== undefined) {
            const fechaHasta = normalizarFecha(String(req.query.fecha_hasta));
            if (!fechaHasta) {
                return res.status(400).json({
                    mensaje: 'El filtro fecha_hasta debe tener formato YYYY-MM-DD.'
                });
            }
            filtros.fechaHasta = fechaHasta;
        }

        if (
            filtros.fechaDesde &&
            filtros.fechaHasta &&
            filtros.fechaDesde > filtros.fechaHasta
        ) {
            return res.status(400).json({
                mensaje: 'fecha_desde no puede ser mayor que fecha_hasta.'
            });
        }

        const asistencias = await listarAsistencias(filtros);

        return res.json({
            empleado: {
                id: empleado.id,
                dni: empleado.dni,
                nombres: empleado.nombres,
                apellidos: empleado.apellidos
            },
            total: asistencias.length,
            asistencias
        });
    } catch (error) {
        return responderError(error, res);
    }
}
