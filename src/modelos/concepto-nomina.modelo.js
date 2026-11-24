import pool from '../config/db.js'; // Ajustar a la ruta/export real del pool de conexión

/**
 * Lista los conceptos de nómina (percepciones y deducciones).
 * Filtros opcionales: tipo ('PERCEPCION' | 'DEDUCCION') y activo (0 | 1).
 */
export async function listarConceptos({ tipo, activo } = {}) {
    const condiciones = [];
    const valores = [];

    if (tipo) {
        condiciones.push('tipo = ?');
        valores.push(tipo);
    }
    if (activo !== undefined) {
        condiciones.push('activo = ?');
        valores.push(activo);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const [filas] = await pool.query(
        `SELECT id, nombre, tipo, tipo_calculo, valor, descripcion, activo
         FROM conceptos_nomina
         ${where}
         ORDER BY tipo, nombre`,
        valores
    );
    return filas;
}

/** Busca un concepto por nombre (sin distinguir mayúsculas). Devuelve null si no existe. */
export async function obtenerConceptoPorNombre(nombre) {
    const [filas] = await pool.query(
        'SELECT id FROM conceptos_nomina WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
        [nombre]
    );
    return filas[0] ?? null;
}

/** Busca un concepto por ID. Devuelve null si no existe. */
export async function obtenerConceptoPorId(id) {
    const [filas] = await pool.query(
        `SELECT id, nombre, tipo, tipo_calculo, valor, descripcion, activo
         FROM conceptos_nomina WHERE id = ?`,
        [id]
    );
    return filas[0] ?? null;
}

/** Inserta un nuevo concepto y devuelve el registro creado. */
export async function crearConcepto({ nombre, tipo, tipo_calculo, valor, descripcion }) {
    const [resultado] = await pool.query(
        `INSERT INTO conceptos_nomina (nombre, tipo, tipo_calculo, valor, descripcion, activo)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [nombre, tipo, tipo_calculo, valor, descripcion]
    );
    return obtenerConceptoPorId(resultado.insertId);
}
