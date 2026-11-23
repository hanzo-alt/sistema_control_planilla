
import pool from './database.js';

try {
    const [rows] = await pool.query('show tables');

    console.log('Conexión exitosa con MariaDB:', rows);

} catch (error) {
    console.error('Error al conectar con MariaDB:', error.message);

} finally {
    await pool.end();
}
