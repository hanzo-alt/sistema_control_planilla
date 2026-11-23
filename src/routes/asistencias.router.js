import { Router } from 'express';
import {
    mostrarAsistencias,
    mostrarMisAsistencias,
    crearAsistencia,
    registrarEntrada,
    marcarSalida,
    actualizarAsistencia,
    eliminarAsistencia
} from '../controllers/asistencias.controller.js';

const router = Router();

// Rutas específicas primero (antes de /:id)
router.get('/mias', mostrarMisAsistencias);
router.post('/entrada', registrarEntrada);

router.get('/', mostrarAsistencias);
router.get('/:id', mostrarAsistencias);
router.post('/', crearAsistencia);
router.put('/:id', actualizarAsistencia);
router.patch('/:id/salida', marcarSalida);
router.delete('/:id', eliminarAsistencia);

export default router;
