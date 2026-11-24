import {
    listarPuestos as listarPuestosEnModelo,
    obtenerPuestoPorId,
    crearPuesto as crearPuestoEnModelo,
    actualizarPuesto as actualizarPuestoEnModelo,
    eliminarPuesto as eliminarPuestoEnModelo
} from '../modelos/puesto.modelo.js';
import { obtenerDepartamentoPorId } from '../modelos/departamento.modelo.js'; // Verifica que el departamento exista
import { parsearId } from '../utils/validacion.js';
import { responderError } from '../utils/errores.js';

/**
 * Valida los campos obligatorios de un puesto:
 * - `nombre`: texto no vacío hasta 60 caracteres
 * - `salario_base_ref`: número mayor que 0
 * - `departamento_id`: entero positivo válido
 */
function validarPuesto(body = {}) {
    const errores = [];
    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : '';

    if (!nombre) {
        errores.push('El campo nombre es obligatorio.');
    } else if (nombre.length > 60) {
        errores.push('El nombre no puede superar los 60 caracteres.');
    }

    const salarioRaw = body.salario_base_ref;
    const salarioBaseRef = Number(salarioRaw);
    if (
        salarioRaw === undefined ||
        salarioRaw === null ||
        salarioRaw === '' ||
        Number.isNaN(salarioBaseRef) ||
        salarioBaseRef <= 0
    ) {
        errores.push('El campo salario_base_ref es obligatorio y debe ser un número mayor que 0.');
    }

    const departamentoId = parsearId(body.departamento_id);
    if (!departamentoId) {
        errores.push('El campo departamento_id es obligatorio y debe ser un identificador numérico válido.');
    }

    if (errores.length > 0) return { errores };

    return {
        datos: {
            nombre,
            salarioBaseRef: Number(salarioBaseRef.toFixed(2)),
            departamentoId
        },
        errores: []
    };
}

/**
 * GET /api/puestos -> Lista puestos (con filtros opcionales ?departamento_id= y ?buscar=)
 * GET /api/puestos/:id -> Consulta un puesto específico por ID
 */
export async function mostrarPuestos(req, res) {
    try {
        if (req.params.id !== undefined) {
            const id = parsearId(req.params.id);
            if (!id) {
                return res.status(400).json({ mensaje: 'El id del puesto no es válido.' });
            }

            const puesto = await obtenerPuestoPorId(id);
            if (!puesto) {
                return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
            }

            return res.json({ puesto });
        }

        const filtros = {};
        if (req.query.departamento_id !== undefined) {
            const departamentoId = parsearId(req.query.departamento_id);
            if (!departamentoId) {
                return res.status(400).json({ mensaje: 'El filtro departamento_id no es válido.' });
            }
            filtros.departamentoId = departamentoId;
        }

        if (req.query.buscar !== undefined && String(req.query.buscar).trim() !== '') {
            filtros.buscar = String(req.query.buscar).trim();
        }

        const puestos = await listarPuestosEnModelo(filtros);
        return res.json({
            total: puestos.length,
            puestos
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * POST /api/puestos -> Crea un puesto verificando primero que exista el departamento (201 Creado o 400/404/409)
 */
export async function crearPuesto(req, res) {
    const { datos, errores } = validarPuesto(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        // Verifica integridad de clave foránea antes de insertar
        const departamento = await obtenerDepartamentoPorId(datos.departamentoId);
        if (!departamento) {
            return res.status(404).json({ mensaje: 'El departamento indicado no existe.' });
        }

        const id = await crearPuestoEnModelo(datos);
        const puesto = await obtenerPuestoPorId(id);

        return res.status(201).json({
            mensaje: 'Puesto creado correctamente.',
            puesto
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'Ya existe un puesto con ese nombre.',
            referencia: 'El departamento_id indicado no existe.'
        });
    }
}

/**
 * PUT /api/puestos/:id -> Actualiza un puesto existente (200 OK, 400, 404 o 409)
 */
export async function actualizarPuesto(req, res) {
    const id = parsearId(req.params.id);
    if (!id) {
        return res.status(400).json({ mensaje: 'El id del puesto no es válido.' });
    }

    if (Object.keys(req.body ?? {}).length === 0) {
        return res.status(400).json({ mensaje: 'Envíe al menos un campo para actualizar.' });
    }

    try {
        const existente = await obtenerPuestoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
        }

        const combinado = {
            nombre: req.body.nombre !== undefined ? req.body.nombre : existente.nombre,
            salario_base_ref: req.body.salario_base_ref !== undefined ? req.body.salario_base_ref : existente.salario_base_ref,
            departamento_id: req.body.departamento_id !== undefined ? req.body.departamento_id : existente.departamento_id
        };

        const { datos, errores } = validarPuesto(combinado);
        if (errores.length > 0) {
            return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
        }

        const departamento = await obtenerDepartamentoPorId(datos.departamentoId);
        if (!departamento) {
            return res.status(404).json({ mensaje: 'El departamento indicado no existe.' });
        }

        await actualizarPuestoEnModelo(id, datos);
        const puesto = await obtenerPuestoPorId(id);

        return res.json({
            mensaje: 'Puesto actualizado correctamente.',
            puesto
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'Ya existe un puesto con ese nombre.',
            referencia: 'El departamento_id indicado no existe.'
        });
    }
}

/**
 * DELETE /api/puestos/:id -> Elimina un puesto (200 OK, 400, 404 o 409 si tiene empleados)
 */
export async function eliminarPuesto(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El id del puesto no es válido.' });
        }

        const existente = await obtenerPuestoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Puesto no encontrado.' });
        }

        await eliminarPuestoEnModelo(id);
        return res.json({ mensaje: 'Puesto eliminado correctamente.' });
    } catch (error) {
        return responderError(error, res, {
            referencia: 'No se puede eliminar el puesto porque tiene empleados asociados.'
        });
    }
}