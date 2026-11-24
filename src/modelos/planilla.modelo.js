import pool from '../config/db.js'; // Ajustar a la ruta/export real del pool de conexión (mysql2/promise)

const redondear = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Busca una planilla por ID. Devuelve null si no existe. */
export async function obtenerPlanillaPorId(id) {
    const [filas] = await pool.query(
        `SELECT id, fecha_inicio, fecha_fin, fecha_pago, estado
         FROM planillas WHERE id = ?`,
        [id]
    );
    return filas[0] ?? null;
}

/** Devuelve true si el rango de fechas se traslapa con otra planilla existente. */
export async function existeTraslape(fechaInicio, fechaFin) {
    const [filas] = await pool.query(
        `SELECT id FROM planillas
         WHERE fecha_inicio <= ? AND fecha_fin >= ?
         LIMIT 1`,
        [fechaFin, fechaInicio]
    );
    return filas.length > 0;
}

/** Abre un nuevo período de pago en estado ABIERTA. */
export async function crearPlanilla({ fecha_inicio, fecha_fin, fecha_pago }) {
    const [resultado] = await pool.query(
        `INSERT INTO planillas (fecha_inicio, fecha_fin, fecha_pago, estado)
         VALUES (?, ?, ?, 'ABIERTA')`,
        [fecha_inicio, fecha_fin, fecha_pago]
    );
    return obtenerPlanillaPorId(resultado.insertId);
}

/**
 * Calcula la nómina de todos los empleados activos dentro de una transacción.
 * - Genera un registro en detalle_planilla por empleado.
 * - Genera su desglose en movimientos_planilla (percepciones y deducciones).
 * - Si ya había un cálculo previo (planilla ABIERTA), lo reemplaza.
 *
 * Devuelve:
 *   { ok: false, motivo: 'NO_ENCONTRADA' | 'CERRADA' }
 *   { ok: true, resumen: {...} }
 */
export async function calcularPlanilla(planillaId) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // Bloquea la fila para evitar cálculos o cierres simultáneos
        const [planillas] = await conn.query(
            'SELECT id, fecha_inicio, fecha_fin, estado FROM planillas WHERE id = ? FOR UPDATE',
            [planillaId]
        );
        const planilla = planillas[0];

        if (!planilla) {
            await conn.rollback();
            return { ok: false, motivo: 'NO_ENCONTRADA' };
        }
        if (planilla.estado !== 'ABIERTA') {
            await conn.rollback();
            return { ok: false, motivo: 'CERRADA' };
        }

        // Empleados activos, reglas vigentes y ausencias del período
        const [empleados] = await conn.query(
            "SELECT id, salario_base FROM empleados WHERE estado = 'ACTIVO'"
        );
        const [conceptos] = await conn.query(
            `SELECT id, nombre, tipo, tipo_calculo, valor
             FROM conceptos_nomina WHERE activo = 1`
        );
        const [ausencias] = await conn.query(
            `SELECT empleado_id, COUNT(*) AS dias
             FROM asistencias
             WHERE fecha BETWEEN ? AND ? AND estado = 'AUSENTE'
             GROUP BY empleado_id`,
            [planilla.fecha_inicio, planilla.fecha_fin]
        );
        const ausenciasPorEmpleado = new Map(ausencias.map((a) => [a.empleado_id, Number(a.dias)]));

        // Recalcular: elimina el cálculo anterior de esta planilla
        await conn.query(
            `DELETE m FROM movimientos_planilla m
             INNER JOIN detalle_planilla d ON d.id = m.detalle_planilla_id
             WHERE d.planilla_id = ?`,
            [planillaId]
        );
        await conn.query('DELETE FROM detalle_planilla WHERE planilla_id = ?', [planillaId]);

        let totalPercepciones = 0;
        let totalDeducciones = 0;
        let totalNeto = 0;

        for (const empleado of empleados) {
            const salarioBase = Number(empleado.salario_base);
            const movimientos = [];

            // Reglas del catálogo salarial
            for (const c of conceptos) {
                const monto = c.tipo_calculo === 'PORCENTAJE'
                    ? redondear(salarioBase * (Number(c.valor) / 100))
                    : redondear(c.valor);

                movimientos.push({ concepto_id: c.id, tipo: c.tipo, descripcion: c.nombre, monto });
            }

            // Descuento por ausencias (salario diario = salario_base / 30)
            const diasAusente = ausenciasPorEmpleado.get(empleado.id) ?? 0;
            if (diasAusente > 0) {
                movimientos.push({
                    concepto_id: null,
                    tipo: 'DEDUCCION',
                    descripcion: `Descuento por ausencias (${diasAusente} día/s)`,
                    monto: redondear((salarioBase / 30) * diasAusente)
                });
            }

            const percepciones = redondear(
                movimientos.filter((m) => m.tipo === 'PERCEPCION').reduce((s, m) => s + m.monto, 0)
            );
            const deducciones = redondear(
                movimientos.filter((m) => m.tipo === 'DEDUCCION').reduce((s, m) => s + m.monto, 0)
            );
            const neto = redondear(salarioBase + percepciones - deducciones);

            const [detalle] = await conn.query(
                `INSERT INTO detalle_planilla
                    (planilla_id, empleado_id, salario_base, total_percepciones, total_deducciones, salario_neto)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [planillaId, empleado.id, salarioBase, percepciones, deducciones, neto]
            );

            if (movimientos.length > 0) {
                await conn.query(
                    `INSERT INTO movimientos_planilla
                        (detalle_planilla_id, concepto_id, tipo, descripcion, monto)
                     VALUES ?`,
                    [movimientos.map((m) => [detalle.insertId, m.concepto_id, m.tipo, m.descripcion, m.monto])]
                );
            }

            totalPercepciones += percepciones;
            totalDeducciones += deducciones;
            totalNeto += neto;
        }

        await conn.commit();

        return {
            ok: true,
            resumen: {
                planilla_id: planilla.id,
                empleados_procesados: empleados.length,
                total_percepciones: redondear(totalPercepciones),
                total_deducciones: redondear(totalDeducciones),
                total_neto: redondear(totalNeto)
            }
        };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
}

/**
 * Cambia el estado a CERRADA solo si estaba ABIERTA.
 * Devuelve true si se cerró, false si no estaba abierta.
 */
export async function cerrarPlanilla(id) {
    const [resultado] = await pool.query(
        "UPDATE planillas SET estado = 'CERRADA' WHERE id = ? AND estado = 'ABIERTA'",
        [id]
    );
    return resultado.affectedRows > 0;
}

/** Cantidad de empleados con cálculo generado en la planilla (para validar antes de cerrar). */
export async function contarDetalles(planillaId) {
    const [filas] = await pool.query(
        'SELECT COUNT(*) AS total FROM detalle_planilla WHERE planilla_id = ?',
        [planillaId]
    );
    return Number(filas[0].total);
}

/** Obtiene la colilla (detalle + movimientos) de un empleado en una planilla. */
export async function obtenerColilla(planillaId, empleadoId) {
    const [detalles] = await pool.query(
        `SELECT d.id, d.empleado_id, e.nombre, e.apellido,
                d.salario_base, d.total_percepciones, d.total_deducciones, d.salario_neto
         FROM detalle_planilla d
         INNER JOIN empleados e ON e.id = d.empleado_id
         WHERE d.planilla_id = ? AND d.empleado_id = ?`,
        [planillaId, empleadoId]
    );
    const detalle = detalles[0];
    if (!detalle) return null;

    const [movimientos] = await pool.query(
        `SELECT concepto_id, tipo, descripcion, monto
         FROM movimientos_planilla
         WHERE detalle_planilla_id = ?
         ORDER BY tipo, id`,
        [detalle.id]
    );

    return {
        empleado: {
            id: detalle.empleado_id,
            nombre: `${detalle.nombre} ${detalle.apellido}`
        },
        salario_base: Number(detalle.salario_base),
        percepciones: movimientos.filter((m) => m.tipo === 'PERCEPCION'),
        deducciones: movimientos.filter((m) => m.tipo === 'DEDUCCION'),
        total_percepciones: Number(detalle.total_percepciones),
        total_deducciones: Number(detalle.total_deducciones),
        salario_neto: Number(detalle.salario_neto)
    };
}
