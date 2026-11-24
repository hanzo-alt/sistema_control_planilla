import {
    listarConceptos as listarConceptosEnModelo,
    obtenerConceptoPorNombre,
    crearConcepto as crearConceptoEnModelo
} from '../models/concepto-nomina.modelo.js';
import { responderError } from '../utils/errores.js'; // Formatea errores HTTP y SQL

const TIPOS = ['PERCEPCION', 'DEDUCCION'];
const TIPOS_CALCULO = ['MONTO_FIJO', 'PORCENTAJE'];

/**
 * Valida y limpia el cuerpo (`req.body`) para crear un concepto de nómina.
 * Devuelve errores si hay fallos, o datos si todo está correcto.
 */
function validarConcepto(body = {}) {
    const errores = [];

    const nombre = body.nombre !== undefined ? String(body.nombre).trim() : '';
    const tipo = body.tipo !== undefined ? String(body.tipo).trim().toUpperCase() : '';
    const tipoCalculo = body.tipo_calculo !== undefined ? String(body.tipo_calculo).trim().toUpperCase() : '';
    const valor = Number(body.valor);
    const descripcion = body.descripcion !== undefined && body.descripcion !== null
        ? String(body.descripcion).trim()
        : null;

    // 1. Nombre obligatorio y longitud máxima (60 caracteres)
    if (!nombre) {
        errores.push('El campo nombre es obligatorio.');
    } else if (nombre.length > 60) {
        errores.push('El nombre no puede superar los 60 caracteres.');
    }

    // 2. Tipo: PERCEPCION o DEDUCCION
    if (!TIPOS.includes(tipo)) {
        errores.push(`El tipo debe ser uno de: ${TIPOS.join(', ')}.`);
    }

    // 3. Tipo de cálculo: MONTO_FIJO o PORCENTAJE
    if (!TIPOS_CALCULO.includes(tipoCalculo)) {
        errores.push(`El tipo_calculo debe ser uno de: ${TIPOS_CALCULO.join(', ')}.`);
    }

    // 4. Valor numérico positivo (si es porcentaje, máximo 100)
    if (body.valor === undefined || body.valor === null || body.valor === '' || !Number.isFinite(valor)) {
        errores.push('El campo valor es obligatorio y debe ser numérico.');
    } else if (valor <= 0) {
        errores.push('El valor debe ser mayor que cero.');
    } else if (tipoCalculo === 'PORCENTAJE' && valor > 100) {
        errores.push('Un porcentaje no puede ser mayor a 100.');
    }

    // 5. Descripción opcional (máximo 255 caracteres)
    if (descripcion && descripcion.length > 255) {
        errores.push('La descripción no puede superar los 255 caracteres.');
    }

    if (errores.length > 0) {
        return { errores };
    }

    return {
        datos: {
            nombre,
            tipo,
            tipo_calculo: tipoCalculo,
            valor: Math.round(valor * 100) / 100,
            descripcion: descripcion || null
        }
    };
}

/** GET /api/conceptos-nomina — Lista las reglas de percepción y deducción. */
export async function listarConceptos(req, res) {
    try {
        const filtros = {};

        if (req.query.tipo) {
            const tipo = String(req.query.tipo).toUpperCase();
            if (!TIPOS.includes(tipo)) {
                return res.status(400).json({ mensaje: `El filtro tipo debe ser uno de: ${TIPOS.join(', ')}.` });
            }
            filtros.tipo = tipo;
        }

        if (req.query.activo !== undefined) {
            if (!['0', '1'].includes(String(req.query.activo))) {
                return res.status(400).json({ mensaje: 'El filtro activo debe ser 0 o 1.' });
            }
            filtros.activo = Number(req.query.activo);
        }

        const conceptos = await listarConceptosEnModelo(filtros);
        return res.status(200).json({ total: conceptos.length, data: conceptos });
    } catch (error) {
        return responderError(res, error);
    }
}

/** POST /api/conceptos-nomina — Crea una nueva regla de percepción o deducción. */
export async function crearConcepto(req, res) {
    try {
        const { errores, datos } = validarConcepto(req.body);
        if (errores) {
            return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
        }

        const existente = await obtenerConceptoPorNombre(datos.nombre);
        if (existente) {
            return res.status(409).json({ mensaje: 'Ya existe un concepto con ese nombre.' });
        }

        const concepto = await crearConceptoEnModelo(datos);
        return res.status(201).json({ mensaje: 'Concepto creado correctamente.', data: concepto });
    } catch (error) {
        return responderError(res, error);
    }
}
