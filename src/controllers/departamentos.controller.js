import {
    listarDepartamentos as listarDepartamentosEnModelo,
    obtenerDepartamentoPorId,
    crearDepartamento as crearDepartamentoEnModelo,
    actualizarDepartamento as actualizarDepartamentoEnModelo,
    eliminarDepartamento as eliminarDepartamentoEnModelo
} from '../modelos/departamento.modelo.js';
import { parsearId } from '../utils/validacion.js'; // Valida que el ID sea entero positivo
import { responderError } from '../utils/errores.js';   // Formatea errores HTTP y SQL

/**
 * Valida y limpia los campos del cuerpo (`req.body`) para crear o actualizar.
 * Devuelve errores si hay fallos, o datos si todo está correcto.
 */
function validarDepartamento(body = {}) {
    const errores = [];
    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : '';

    // 1. Validar nombre obligatorio y longitud máxima (60 caracteres)
    if (!nombre) {
        errores.push('El campo nombre es obligatorio.');
    } else if (nombre.length > 60) {
        errores.push('El nombre no puede superar los 60 caracteres.');
    }

    // 2. Normalizar descripción opcional 
    let descripcion = null;
    if (body.descripcion !== undefined && body.descripcion !== null && String(body.descripcion).trim() !== '') {
        descripcion = String(body.descripcion).trim();
        if (descripcion.length > 200) {
            errores.push('La descripción no puede superar los 200 caracteres.');
        }
    }

    if (errores.length > 0) return { errores };

    return {
        datos: { nombre, descripcion },
        errores: []
    };
}

/**
 * GET /api/departamentos -> Lista todos los departamentos, con opción de búsqueda por nombre o descripción.
 * GET /api/departamentos/:id  -> Consulta un departamento específico por ID
 */
export async function mostrarDepartamentos(req, res) {
    try {
        // Si viene `:id` en la URL, devolvemos un solo registro
        if (req.params.id !== undefined) {
            const id = parsearId(req.params.id);
            if (!id) {
                return res.status(400).json({ mensaje: 'El id del departamento no es válido.' });
            }

            const departamento = await obtenerDepartamentoPorId(id);
            if (!departamento) {
                return res.status(404).json({ mensaje: 'Departamento no encontrado.' });
            }

            return res.json({ departamento });
        }

        // Si no hay `:id`, listamos todos los departamentos
        const departamentos = await listarDepartamentosEnModelo(req.query.buscar);
        return res.json({
            total: departamentos.length,
            departamentos
        });
    } catch (error) {
        return responderError(error, res);
    }
}

/**
 * POST /api/departamentos -> Crea un departamento (201 Created o 400/409)
 */
export async function crearDepartamento(req, res) {
    const { datos, errores } = validarDepartamento(req.body);
    if (errores.length > 0) {
        return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
    }

    try {
        const id = await crearDepartamentoEnModelo(datos);
        const departamento = await obtenerDepartamentoPorId(id);

        return res.status(201).json({
            mensaje: 'Departamento creado correctamente.',
            departamento
        });
    } catch (error) {
        // Si el nombre ya existe en la BD, `responderError` traduce el duplicado a 409
        return responderError(error, res, {
            duplicado: 'Ya existe un departamento con ese nombre.'
        });
    }
}

/**
 * PUT /api/departamentos/:id -> Actualiza un departamento existente (200 OK, 400, 404 o 409)
 */
export async function actualizarDepartamento(req, res) {
    const id = parsearId(req.params.id);
    if (!id) {
        return res.status(400).json({ mensaje: 'El id del departamento no es válido.' });
    }

    if (Object.keys(req.body ?? {}).length === 0) {
        return res.status(400).json({ mensaje: 'Envíe al menos un campo para actualizar.' });
    }

    try {
        const existente = await obtenerDepartamentoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Departamento no encontrado.' });
        }

        // Combina los campos enviados con los actuales para soportar actualizaciones parciales o completas
        const combinado = {
            nombre: req.body.nombre !== undefined ? req.body.nombre : existente.nombre,
            descripcion: req.body.descripcion !== undefined ? req.body.descripcion : existente.descripcion
        };

        const { datos, errores } = validarDepartamento(combinado);
        if (errores.length > 0) {
            return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
        }

        await actualizarDepartamentoEnModelo(id, datos);
        const departamento = await obtenerDepartamentoPorId(id);

        return res.json({
            mensaje: 'Departamento actualizado correctamente.',
            departamento
        });
    } catch (error) {
        return responderError(error, res, {
            duplicado: 'Ya existe un departamento con ese nombre.'
        });
    }
}

/**
 * DELETE /api/departamentos/:id -> Elimina un departamento (200 OK, 400, 404 o 409 si tiene puestos)
 */
export async function eliminarDepartamento(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El id del departamento no es válido.' });
        }

        const existente = await obtenerDepartamentoPorId(id);
        if (!existente) {
            return res.status(404).json({ mensaje: 'Departamento no encontrado.' });
        }

        await eliminarDepartamentoEnModelo(id);
        return res.json({ mensaje: 'Departamento eliminado correctamente.' });
    } catch (error) {
        // Si hay puestos ligados a este departamento, devuelve conflicto (409)
        return responderError(error, res, {
            referencia: 'No se puede eliminar el departamento porque tiene puestos asociados.'
        });
    }
}