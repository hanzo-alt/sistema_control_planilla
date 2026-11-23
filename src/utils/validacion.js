/**
 * Convierte un id de la URL a string numérico.
 * Devuelve null si no es un entero positivo.
 */
export function parsearId(valor) {
    const id = String(valor ?? '').trim();
    if (!/^\d+$/.test(id) || id === '0') return null;
    return id;
}

/**
 * Valida una fecha YYYY-MM-DD y la devuelve en ese formato.
 */
export function normalizarFecha(valor) {
    if (typeof valor !== 'string') return null;

    const partes = valor.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!partes) return null;

    const [, anio, mes, dia] = partes;
    const fecha = new Date(`${anio}-${mes}-${dia}T00:00:00`);

    if (Number.isNaN(fecha.getTime())) return null;
    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() + 1 !== Number(mes) ||
        fecha.getDate() !== Number(dia)
    ) {
        return null;
    }

    return `${anio}-${mes}-${dia}`;
}

/**
 * Valida una fecha y hora YYYY-MM-DD HH:mm[:ss] (también acepta la T).
 * Devuelve la fecha en formato MySQL: YYYY-MM-DD HH:mm:ss.
 */
export function normalizarFechaHora(valor) {
    if (typeof valor !== 'string') return null;

    const partes = valor.trim().match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/
    );
    if (!partes) return null;

    const [, anio, mes, dia, hora, minuto, segundo = '00'] = partes;

    if (Number(hora) > 23 || Number(minuto) > 59 || Number(segundo) > 59) {
        return null;
    }

    const fecha = new Date(`${anio}-${mes}-${dia}T${hora}:${minuto}:${segundo}`);

    if (Number.isNaN(fecha.getTime())) return null;
    if (
        fecha.getFullYear() !== Number(anio) ||
        fecha.getMonth() + 1 !== Number(mes) ||
        fecha.getDate() !== Number(dia)
    ) {
        return null;
    }

    return `${anio}-${mes}-${dia} ${hora}:${minuto}:${segundo}`;
}
