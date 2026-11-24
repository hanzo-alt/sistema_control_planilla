import { Router } from 'express';
import {
    mostrarDepartamentos,
    crearDepartamento,
    actualizarDepartamento,
    eliminarDepartamento
} from '../controladores/departamento.controlador.js';

const router = Router();

// Rutas montadas bajo /api/departamentos en app.js
router.get('/', mostrarDepartamentos);       // Listar todos
router.get('/:id', mostrarDepartamentos);    // Consultar uno por ID
router.post('/', crearDepartamento);         // Crear
router.put('/:id', actualizarDepartamento);  // Actualizar por ID
router.delete('/:id', eliminarDepartamento); // Eliminar por ID

export default router;