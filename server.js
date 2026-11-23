import dotenv from 'dotenv';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import empleadosRouter from './src/routes/empleados.router.js';
import asistenciasRouter from './src/routes/asistencias.router.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// RNF-03: toda la configuración y credenciales se leen desde .env
dotenv.config({ path: resolve(__dirname, '.env') });

const app = express();

app.use(express.json());

app.use('/api/empleados', empleadosRouter);
app.use('/api/asistencias', asistenciasRouter);

app.use((req, res) => {
    res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la petición no es un JSON válido.' });
    }

    console.error('Error no controlado:', error);
    return res.status(500).json({ mensaje: 'Error interno del servidor.' });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
