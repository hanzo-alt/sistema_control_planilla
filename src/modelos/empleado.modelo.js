import pool from '../config/database.js';

/**
 * Campos que se devuelven en todas las consultas de empleado.
 * Incluye el puesto, el departamento y el usuario asociado.
 */
const SELECT_EMPLEADO = `
    SELECT
        e.id,
        e.dni,
        e.nombres,
        e.apellidos,
        e.fecha_ingreso,
        e.salario_base,
        e.estado,
        e.puesto_id,
        p.nombre AS puesto,
        p.departamento_id,
        d.nombre AS departamento,
        e.usuario_id,
        u.correo AS usuario_correo,
        e.created_at,
        e.updated_at
    FROM empleado e
    INNER JOIN puesto p ON p.id = e.puesto_id
    INNER JOIN departamento d ON d.id = p.departamento_id
    LEFT JOIN usuario u ON u.id = e.usuario_id
`;

/**
 * Lista empleados con filtros opcionales.
 * Los filtros se agregan con marcadores ? (RNF-04).
 */
export async function listarEmpleados(filtros = {}) {
    const condiciones = [];
    const valores = [];

    if (filtros.estado) {
        condiciones.push('e.estado = ?');
        valores.push(filtros.estado);
    }

    if (filtros.puestoId) {
        condiciones.push('e.puesto_id = ?');
        valores.push(filtros.puestoId);
    }

    if (filtros.departamentoId) {
        condiciones.push('p.departamento_id = ?');
        valores.push(filtros.departamentoId);
    }

    if (filtros.buscar) {
        condiciones.push("(e.dni LIKE ? OR CONCAT(e.nombres, ' ', e.apellidos) LIKE ?)");
        const patron = `%${filtros.buscar}%`;
        valores.push(patron, patron);
    }

    const where = condiciones.length > 0
        ? `WHERE ${condiciones.join(' AND ')}`
        : '';

    const [filas] = await pool.execute(
        `${SELECT_EMPLEADO} ${where} ORDER BY e.id ASC`,
        valores
    );

    return filas;
}

/**
 * Obtiene un empleado por id.
 * Devuelve undefined si no existe.
 */
export async function obtenerEmpleadoPorId(id) {
    const [filas] = await pool.execute(
        `${SELECT_EMPLEADO} WHERE e.id = ? LIMIT 1`,
        [id]
    );

    return filas[0];
}

/**
 * Inserta un empleado. El id lo genera AUTO_INCREMENT.
 * Devuelve el id creado.
 */
export async function crearEmpleado(datos) {
    const [resultado] = await pool.execute(
        `INSERT INTO empleado
            (dni, nombres, apellidos, fecha_ingreso, salario_base, estado, puesto_id, usuario_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            datos.dni,
            datos.nombres,
            datos.apellidos,
            datos.fechaIngreso,
            datos.salarioBase,
            datos.estado,
            datos.puestoId,
            datos.usuarioId
        ]
    );

    return String(resultado.insertId);
}

/**
 * Actualiza solo los campos recibidos.
 * Los nombres de columna son fijos; los valores van con ?.
 * Devuelve el número de filas afectadas.
 */
export async function actualizarEmpleado(id, datos) {
    const asignaciones = [];
    const valores = [];

    if (datos.dni !== undefined) {
        asignaciones.push('dni = ?');
        valores.push(datos.dni);
    }

    if (datos.nombres !== undefined) {
        asignaciones.push('nombres = ?');
        valores.push(datos.nombres);
    }

    if (datos.apellidos !== undefined) {
        asignaciones.push('apellidos = ?');
        valores.push(datos.apellidos);
    }

    if (datos.fechaIngreso !== undefined) {
        asignaciones.push('fecha_ingreso = ?');
        valores.push(datos.fechaIngreso);
    }

    if (datos.salarioBase !== undefined) {
        asignaciones.push('salario_base = ?');
        valores.push(datos.salarioBase);
    }

    if (datos.estado !== undefined) {
        asignaciones.push('estado = ?');
        valores.push(datos.estado);
    }

    if (datos.puestoId !== undefined) {
        asignaciones.push('puesto_id = ?');
        valores.push(datos.puestoId);
    }

    if (datos.usuarioId !== undefined) {
        asignaciones.push('usuario_id = ?');
        valores.push(datos.usuarioId);
    }

    if (asignaciones.length === 0) return 0;

    valores.push(id);

    const [resultado] = await pool.execute(
        `UPDATE empleado SET ${asignaciones.join(', ')} WHERE id = ?`,
        valores
    );

    return resultado.affectedRows;
}

/**
 * Elimina un empleado.
 * Si tiene asistencias o planillas asociadas, la FK lo impide.
 */
export async function eliminarEmpleado(id) {
    const [resultado] = await pool.execute(
        'DELETE FROM empleado WHERE id = ?',
        [id]
    );

    return resultado.affectedRows;
}
