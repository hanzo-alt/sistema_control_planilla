import { Router } from 'express';
import {
    mostrarPuestos,
    crearPuesto,
    actualizarPuesto,
    eliminarPuesto
} from '../controladores/puesto.controlador.js';

const router = Router();

// Rutas montadas bajo /api/puestos en app.js
router.get('/', mostrarPuestos);          // Listar todos (con filtros opcionales)
router.get('/:id', mostrarPuestos);       // Consultar uno por ID
router.post('/', crearPuesto);            // Crear nuevo puesto
router.put('/:id', actualizarPuesto);     // Actualizar puesto por ID
router.delete('/:id', eliminarPuesto);    // Eliminar puesto por ID

export default router;