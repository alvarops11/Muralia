// file: src/server.ts
import app from './app';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 3000;

// 1. Conectamos a la Base de Datos
connectDB().then(() => {
  // 2. Una vez conectados, levantamos el servidor
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
});