/**
 * Traduce errores comunes de MySQL/MariaDB a respuestas HTTP.
 * Cada controlador puede personalizar los mensajes con el objeto mensajes.
 */
export function responderError(error, res, mensajes = {}) {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            mensaje: mensajes.duplicado ?? 'El registro ya existe.'
        });
    }

    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            mensaje: mensajes.referencia ?? 'Uno de los identificadores relacionados no existe.'
        });
    }

    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        return res.status(409).json({
            mensaje: mensajes.borrado ?? 'No se puede eliminar porque tiene registros asociados.'
        });
    }

    if (error.code === 'ER_WARN_DATA_OUT_OF_RANGE' || error.code === 'WARN_DATA_TRUNCATED') {
        return res.status(400).json({
            mensaje: 'Uno de los valores enviados no es válido para la base de datos.'
        });
    }

    console.error('Error en la API:', error);
    return res.status(500).json({
        mensaje: 'Error interno del servidor.'
    });
}
