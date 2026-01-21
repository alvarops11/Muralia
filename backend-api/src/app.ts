// file: src/app.ts
import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import boardRoutes from './routes/board.routes';
import authRoutes from './routes/auth.routes';

const app = express();

// --- Middlewares Globales ---
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
})); // Seguridad HTTP
app.use(cors());   // Permitir peticiones externas
app.use(express.json()); // Entender JSON en el body

// Servir archivos estáticos (uploads)
// Usamos path.resolve para asegurar que la ruta es correcta e independiente del CWD
const uploadsPath = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// --- Rutas ---
// Rutas de autenticación
app.use('/api/auth', authRoutes);
// Rutas de tableros
app.use('/api/boards', boardRoutes);

// Ruta de prueba simple
app.get('/', (req, res) => {
  res.send('API Funcionando 🚀');
});

export default app;