import {
    obtenerPlanillaPorId,
    existeTraslape,
    crearPlanilla as crearPlanillaEnModelo,
    calcularPlanilla as calcularPlanillaEnModelo,
    cerrarPlanilla as cerrarPlanillaEnModelo,
    contarDetalles,
    obtenerColilla as obtenerColillaEnModelo
} from '../models/planilla.modelo.js';
import { parsearId } from '../utils/validacion.js'; // Valida que el ID sea entero positivo
import { responderError } from '../utils/errores.js'; // Formatea errores HTTP y SQL

const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Convierte 'YYYY-MM-DD' a Date válida (UTC) o null si no es una fecha real. */
function parsearFecha(valor) {
    if (typeof valor !== 'string' || !REGEX_FECHA.test(valor.trim())) return null;
    const texto = valor.trim();
    const fecha = new Date(`${texto}T00:00:00Z`);
    if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== texto) return null;
    return { texto, fecha };
}

/**
 * Valida y limpia el cuerpo (`req.body`) para abrir una planilla.
 * Devuelve errores si hay fallos, o datos si todo está correcto.
 */
function validarPlanilla(body = {}) {
    const errores = [];

    const inicio = parsearFecha(body.fecha_inicio);
    const fin = parsearFecha(body.fecha_fin);
    const pago = parsearFecha(body.fecha_pago);

    // 1. Formato de fechas (YYYY-MM-DD)
    if (!inicio) errores.push('fecha_inicio es obligatoria y debe tener formato YYYY-MM-DD.');
    if (!fin) errores.push('fecha_fin es obligatoria y debe tener formato YYYY-MM-DD.');
    if (!pago) errores.push('fecha_pago es obligatoria y debe tener formato YYYY-MM-DD.');

    // 2. Coherencia entre fechas
    if (inicio && fin && fin.fecha < inicio.fecha) {
        errores.push('fecha_fin no puede ser anterior a fecha_inicio.');
    }
    if (fin && pago && pago.fecha < fin.fecha) {
        errores.push('fecha_pago no puede ser anterior a fecha_fin.');
    }

    if (errores.length > 0) {
        return { errores };
    }

    return {
        datos: {
            fecha_inicio: inicio.texto,
            fecha_fin: fin.texto,
            fecha_pago: pago.texto
        }
    };
}

/** POST /api/planillas — Abre un nuevo período de pago en estado ABIERTA. */
export async function crearPlanilla(req, res) {
    try {
        const { errores, datos } = validarPlanilla(req.body);
        if (errores) {
            return res.status(400).json({ mensaje: 'Datos inválidos.', errores });
        }

        if (await existeTraslape(datos.fecha_inicio, datos.fecha_fin)) {
            return res.status(409).json({ mensaje: 'El período se traslapa con otra planilla existente.' });
        }

        const planilla = await crearPlanillaEnModelo(datos);
        return res.status(201).json({ mensaje: 'Planilla abierta correctamente.', data: planilla });
    } catch (error) {
        return responderError(res, error);
    }
}

/** POST /api/planillas/:id/calcular — Cálculo masivo de la nómina. */
export async function calcularPlanilla(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El ID de la planilla debe ser un entero positivo.' });
        }

        const resultado = await calcularPlanillaEnModelo(id);

        if (!resultado.ok) {
            if (resultado.motivo === 'NO_ENCONTRADA') {
                return res.status(404).json({ mensaje: 'Planilla no encontrada.' });
            }
            return res.status(409).json({ mensaje: 'La planilla está CERRADA y no se puede recalcular.' });
        }

        return res.status(200).json({ mensaje: 'Planilla calculada correctamente.', data: resultado.resumen });
    } catch (error) {
        return responderError(res, error);
    }
}

/** PATCH /api/planillas/:id/cerrar — Cierra la planilla y bloquea modificaciones. */
export async function cerrarPlanilla(req, res) {
    try {
        const id = parsearId(req.params.id);
        if (!id) {
            return res.status(400).json({ mensaje: 'El ID de la planilla debe ser un entero positivo.' });
        }

        const planilla = await obtenerPlanillaPorId(id);
        if (!planilla) {
            return res.status(404).json({ mensaje: 'Planilla no encontrada.' });
        }
        if (planilla.estado === 'CERRADA') {
            return res.status(409).json({ mensaje: 'La planilla ya está CERRADA.' });
        }
        if ((await contarDetalles(id)) === 0) {
            return res.status(409).json({ mensaje: 'No se puede cerrar una planilla sin haber ejecutado el cálculo.' });
        }

        const cerrada = await cerrarPlanillaEnModelo(id);
        if (!cerrada) {
            return res.status(409).json({ mensaje: 'La planilla ya está CERRADA.' });
        }

        return res.status(200).json({ mensaje: 'Planilla cerrada correctamente.', data: { id, estado: 'CERRADA' } });
    } catch (error) {
        return responderError(res, error);
    }
}

/** GET /api/planillas/:id/colilla/:empleadoId — Colilla de pago individual. */
export async function obtenerColilla(req, res) {
    try {
        const planillaId = parsearId(req.params.id);
        const empleadoId = parsearId(req.params.empleadoId);
        if (!planillaId || !empleadoId) {
            return res.status(400).json({ mensaje: 'Los IDs deben ser enteros positivos.' });
        }

        // ADMIN_RRHH ve cualquier colilla; el resto solo la propia
        // (req.usuario lo asigna el middleware JWT; ajustar nombres de campos)
        const esAdmin = req.usuario?.rol === 'ADMIN_RRHH';
        if (!esAdmin && Number(req.usuario?.empleado_id) !== empleadoId) {
            return res.status(403).json({ mensaje: 'No tienes permiso para ver esta colilla.' });
        }

        const planilla = await obtenerPlanillaPorId(planillaId);
        if (!planilla) {
            return res.status(404).json({ mensaje: 'Planilla no encontrada.' });
        }

        const colilla = await obtenerColillaEnModelo(planillaId, empleadoId);
        if (!colilla) {
            return res.status(404).json({ mensaje: 'No hay colilla para ese empleado en esta planilla.' });
        }

        return res.status(200).json({
            data: {
                planilla: {
                    id: planilla.id,
                    fecha_inicio: planilla.fecha_inicio,
                    fecha_fin: planilla.fecha_fin,
                    fecha_pago: planilla.fecha_pago,
                    estado: planilla.estado
                },
                ...colilla
            }
        });
    } catch (error) {
        return responderError(res, error);
    }
}
