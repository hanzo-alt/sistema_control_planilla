import { Router } from 'express';
import {
    crearPlanilla,
    calcularPlanilla,
    cerrarPlanilla,
    obtenerColilla
} from '../controllers/planillas.controller.js';
// Ajustar nombres/rutas a los middlewares reales del proyecto
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Solo ADMIN_RRHH
router.post('/', verificarToken, permitirRoles('ADMIN_RRHH'), crearPlanilla);
router.post('/:id/calcular', verificarToken, permitirRoles('ADMIN_RRHH'), calcularPlanilla);
router.patch('/:id/cerrar', verificarToken, permitirRoles('ADMIN_RRHH'), cerrarPlanilla);

// ADMIN_RRHH o el propio empleado (el controlador valida que sea su colilla)
router.get('/:id/colilla/:empleadoId', verificarToken, obtenerColilla);

export default router;
