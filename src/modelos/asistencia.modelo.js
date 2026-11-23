import pool from '../config/database.js';

const SELECT_ASISTENCIA = `
    SELECT
        a.id,
        a.empleado_id,
        e.dni,
        e.nombres,
        e.apellidos,
        a.fecha,
        a.hora_entrada,
        a.hora_salida,
        a.horas_trabajadas,
        a.horas_extra,
        a.observacion,
        a.created_at,
        a.updated_at
    FROM asistencia a
    INNER JOIN empleado e ON e.id = a.empleado_id
`;

export async function listarAsistencias(filtros = {}) {
    const condiciones = [];
    const valores = [];

    if (filtros.empleadoId) {
        condiciones.push('a.empleado_id = ?');
        valores.push(filtros.empleadoId);
    }

    if (filtros.fecha) {
        condiciones.push('a.fecha = ?');
        valores.push(filtros.fecha);
    }

    if (filtros.fechaDesde) {
        condiciones.push('a.fecha >= ?');
        valores.push(filtros.fechaDesde);
    }

    if (filtros.fechaHasta) {
        condiciones.push('a.fecha <= ?');
        valores.push(filtros.fechaHasta);
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [filas] = await pool.execute(
        `${SELECT_ASISTENCIA} ${where} ORDER BY a.fecha DESC, a.hora_entrada DESC`,
        valores
    );

    return filas;
}

export async function obtenerAsistenciaPorId(id) {
    const [filas] = await pool.execute(
        `${SELECT_ASISTENCIA} WHERE a.id = ? LIMIT 1`,
        [id]
    );

    return filas[0];
}

export async function crearAsistencia(datos) {
    const [resultado] = await pool.execute(
        `INSERT INTO asistencia
            (empleado_id, fecha, hora_entrada, hora_salida, horas_trabajadas, horas_extra, observacion)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
            datos.empleadoId,
            datos.fecha,
            datos.horaEntrada,
            datos.horaSalida,
            datos.horasTrabajadas,
            datos.horasExtra,
            datos.observacion
        ]
    );

    return String(resultado.insertId);
}

export async function actualizarAsistencia(id, datos) {
    const [resultado] = await pool.execute(
        `UPDATE asistencia
         SET empleado_id = ?, fecha = ?, hora_entrada = ?, hora_salida = ?,
             horas_trabajadas = ?, horas_extra = ?, observacion = ?
         WHERE id = ?`,
        [
            datos.empleadoId,
            datos.fecha,
            datos.horaEntrada,
            datos.horaSalida,
            datos.horasTrabajadas,
            datos.horasExtra,
            datos.observacion,
            id
        ]
    );

    return resultado.affectedRows;
}

export async function eliminarAsistencia(id) {
    const [resultado] = await pool.execute(
        'DELETE FROM asistencia WHERE id = ?',
        [id]
    );

    return resultado.affectedRows;
}

/**
 * Busca una jornada abierta (sin hora_salida) de un empleado.
 */
export async function obtenerAsistenciaAbierta(empleadoId) {
    const [filas] = await pool.execute(
        `${SELECT_ASISTENCIA}
         WHERE a.empleado_id = ? AND a.hora_salida IS NULL
         ORDER BY a.hora_entrada DESC
         LIMIT 1`,
        [empleadoId]
    );

    return filas[0];
}

/**
 * Registra la entrada con la fecha y hora actuales de la base de datos.
 */
export async function registrarEntrada(empleadoId) {
    const [resultado] = await pool.execute(
        `INSERT INTO asistencia
            (empleado_id, fecha, hora_entrada, horas_trabajadas, horas_extra)
         VALUES (?, CURDATE(), NOW(), 0, 0)`,
        [empleadoId]
    );

    return String(resultado.insertId);
}

/**
 * Registra la salida y las horas calculadas de una asistencia.
 */
export async function registrarSalida(id, horaSalida, horasTrabajadas, horasExtra) {
    const [resultado] = await pool.execute(
        `UPDATE asistencia
         SET hora_salida = ?, horas_trabajadas = ?, horas_extra = ?
         WHERE id = ?`,
        [horaSalida, horasTrabajadas, horasExtra, id]
    );

    return resultado.affectedRows;
}
