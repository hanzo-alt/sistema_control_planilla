import { Router } from 'express';
import { listarConceptos, crearConcepto } from '../controllers/conceptos-nomina.controller.js';
// Ajustar nombres/rutas a los middlewares reales del proyecto
import { verificarToken, permitirRoles } from '../middlewares/auth.middleware.js';

const router = Router();

// Todas las rutas requieren JWT válido y rol ADMIN_RRHH
router.use(verificarToken, permitirRoles('ADMIN_RRHH'));

router.get('/', listarConceptos);
router.post('/', crearConcepto);

export default router;
