import pool from '../config/db.js';

/**
 * Lista los puestos uniendo `puesto` con `departamento`
 * muestra también el nombre del departamento al que pertenece cada puesto.
 */
export async function listarPuestos(filtros = {}) {
    let sql = `
        SELECT p.id, p.nombre, p.salario_base_ref, p.departamento_id,
               d.nombre AS departamento_nombre
        FROM puesto p
        INNER JOIN departamento d ON p.departamento_id = d.id
        WHERE 1=1
    `;
    const params = [];

    // Filtro por departamento_id
    if (filtros.departamentoId) {
        sql += ' AND p.departamento_id = ?';
        params.push(filtros.departamentoId);
    }

    // Búsqueda por nombre de puesto o nombre de departamento
    if (filtros.buscar) {
        sql += ' AND (p.nombre LIKE ? OR d.nombre LIKE ?)';
        const term = `%${filtros.buscar}%`;
        params.push(term, term);
    }

    sql += ' ORDER BY p.id ASC';
    const [filas] = await pool.query(sql, params);
    return filas;
}

/**
 * Consulta un puesto por ID junto con el nombre de su departamento.
 */
export async function obtenerPuestoPorId(id) {
    const [filas] = await pool.query(
        `SELECT p.id, p.nombre, p.salario_base_ref, p.departamento_id,
                d.nombre AS departamento_nombre
         FROM puesto p
         INNER JOIN departamento d ON p.departamento_id = d.id
         WHERE p.id = ?`,
        [id]
    );
    return filas[0] || null;
}

/**
 * Inserta un nuevo puesto en la tabla `puesto` y retorna su `id`.
 */
export async function crearPuesto({ nombre, salarioBaseRef, departamentoId }) {
    const [resultado] = await pool.query(
        'INSERT INTO puesto (nombre, salario_base_ref, departamento_id) VALUES (?, ?, ?)',
        [nombre, salarioBaseRef, departamentoId]
    );
    return resultado.insertId;
}

/**
 * Actualiza los datos de un puesto por ID.
 */
export async function actualizarPuesto(id, { nombre, salarioBaseRef, departamentoId }) {
    const [resultado] = await pool.query(
        'UPDATE puesto SET nombre = ?, salario_base_ref = ?, departamento_id = ? WHERE id = ?',
        [nombre, salarioBaseRef, departamentoId, id]
    );
    return resultado.affectedRows > 0;
}

/**
 * Elimina un puesto por ID.
 * Si tiene empleados asignados, lanzará error de referencia.
 */
export async function eliminarPuesto(id) {
    const [resultado] = await pool.query(
        'DELETE FROM puesto WHERE id = ?',
        [id]
    );
    return resultado.affectedRows > 0;
}