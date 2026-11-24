import pool from '../config/db.js'; // Pool de conexiones a MariaDB/MySQL

/**
 * Obtiene los departamentos de la tabla `departamento`.
 * Si se envía el parámetro `buscar`, filtra por coincidencia en nombre o descripción.
 */
export async function listarDepartamentos(buscar = '') {
    let sql = 'SELECT id, nombre, descripcion FROM departamento WHERE 1=1';
    const params = []; // Valores parametrizados para evitar inyección SQL

    if (buscar && String(buscar).trim() !== '') {
        sql += ' AND (nombre LIKE ? OR descripcion LIKE ?)';
        const term = `%${String(buscar).trim()}%`;
        params.push(term, term);
    }

    sql += ' ORDER BY id ASC';
    const [filas] = await pool.query(sql, params);
    return filas;
}

/**
 * Busca un único departamento por su `id`.
 * Retorna el objeto encontrado o `null` si no existe.
 */
export async function obtenerDepartamentoPorId(id) {
    const [filas] = await pool.query(
        'SELECT id, nombre, descripcion FROM departamento WHERE id = ?',
        [id]
    );
    return filas[0] || null;
}

/**
 * Inserta un nuevo departamento y devuelve el `id` autogenerado.
 */
export async function crearDepartamento({ nombre, descripcion }) {
    const [resultado] = await pool.query(
        'INSERT INTO departamento (nombre, descripcion) VALUES (?, ?)',
        [nombre, descripcion]
    );
    return resultado.insertId;
}

/**
 * Actualiza nombre y descripción de un departamento existente.
 * Retorna `true` si se modificó al menos una fila, o `false` si no existía.
 */
export async function actualizarDepartamento(id, { nombre, descripcion }) {
    const [resultado] = await pool.query(
        'UPDATE departamento SET nombre = ?, descripcion = ? WHERE id = ?',
        [nombre, descripcion, id]
    );
    return resultado.affectedRows > 0;
}

/**
 * Elimina un departamento por su `id`.
 * Si tiene puestos asociados, MySQL lanzará error de clave foránea (manejado en controlador).
 */
export async function eliminarDepartamento(id) {
    const [resultado] = await pool.query(
        'DELETE FROM departamento WHERE id = ?',
        [id]
    );
    return resultado.affectedRows > 0;
}