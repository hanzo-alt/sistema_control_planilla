import { Router } from 'express';
import {
    mostrarEmpleados,
    crearEmpleado,
    actualizarEmpleado,
    eliminarEmpleado
} from '../controllers/empleados.controller.js';

const router = Router();

router.get('/', mostrarEmpleados);
router.get('/:id', mostrarEmpleados);
router.post('/', crearEmpleado);
router.put('/:id', actualizarEmpleado);
router.delete('/:id', eliminarEmpleado);

export default router;
