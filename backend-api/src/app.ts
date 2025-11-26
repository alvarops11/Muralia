// file: src/app.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import boardRoutes from './routes/board.routes';

const app = express();

// --- Middlewares Globales ---
app.use(helmet()); // Seguridad HTTP
app.use(cors());   // Permitir peticiones externas
app.use(express.json()); // Entender JSON en el body

// --- Rutas ---
// Aquí montamos las rutas de tableros bajo el prefijo /api/boards
app.use('/api/boards', boardRoutes);

// Ruta de prueba simple
app.get('/', (req, res) => {
  res.send('API Funcionando 🚀');
});

export default app;