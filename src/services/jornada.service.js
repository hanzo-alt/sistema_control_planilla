/**
 * Servicio de jornada.
 * Reglas de negocio de asistencias: duración de la jornada y horas extra.
 */

export const JORNADA_HORAS = 8;

/**
 * Calcula horas trabajadas y horas extra entre dos fechas MySQL.
 * Formato esperado: YYYY-MM-DD HH:mm:ss.
 */
export function calcularHoras(horaEntrada, horaSalida, jornadaHoras = JORNADA_HORAS) {
    if (!horaSalida) {
        return { horasTrabajadas: '0.00', horasExtra: '0.00' };
    }

    const entrada = new Date(horaEntrada.replace(' ', 'T'));
    const salida = new Date(horaSalida.replace(' ', 'T'));
    const horas = (salida.getTime() - entrada.getTime()) / 3600000;

    const trabajadas = Math.round(horas * 100) / 100;
    const extra = Math.max(0, Math.round((horas - jornadaHoras) * 100) / 100);

    return {
        horasTrabajadas: trabajadas.toFixed(2),
        horasExtra: extra.toFixed(2)
    };
}

/**
 * Devuelve la fecha y hora local actual en formato MySQL.
 */
export function fechaHoraActual() {
    const ahora = new Date();
    const dosDigitos = (numero) => String(numero).padStart(2, '0');

    return [
        ahora.getFullYear(),
        dosDigitos(ahora.getMonth() + 1),
        dosDigitos(ahora.getDate())
    ].join('-') + ' ' + [
        dosDigitos(ahora.getHours()),
        dosDigitos(ahora.getMinutes()),
        dosDigitos(ahora.getSeconds())
    ].join(':');
}
