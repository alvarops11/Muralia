import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3000;

// 1. Creamos el servidor HTTP envolviendo a Express
const httpServer = createServer(app);

// 2. Inicializamos Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: "*", // En producción, pon la URL de tu frontend (ej: http://localhost:4200)
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// 3. Guardamos la instancia para usarla en los controladores
app.set('socketio', io);

// 4. Lógica de Sockets
io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado: ${socket.id}`);

  // Unirse a una sala (Tablero)
  socket.on('entrar_tablero', (boardId: string) => {
    socket.join(boardId);
  });

  // Salir de la sala
  socket.on('salir_tablero', (boardId: string) => {
    socket.leave(boardId);
  });

  // --- MOVIMIENTO EN TIEMPO REAL (GHOSTS) ---
  // Estos eventos son ligeros y NO tocan la base de datos.
  // Solo rebotan las coordenadas a los otros usuarios.

  socket.on('moviendo_posit', (data) => {
    // data = { boardId, positId, x, y, usuario, color, titulo }
    // Enviamos a todos en la sala MENOS al que lo envía (broadcast)
    socket.to(data.boardId).emit('posit_moviendose', data);
  });

  socket.on('parar_posit', (data) => {
    socket.to(data.boardId).emit('posit_parado', data);
  });
});

// --- BLOQUEO DE EDICIÓN GLOBAL ---
// Mapa para guardar los timeouts de bloqueo y usuario: { "boardId:positId": { timeout, usuario } }
const lockRegistry = new Map<string, { timeout: NodeJS.Timeout, usuario: string }>();

// 4. Lógica de Sockets
io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado: ${socket.id}`);

  // Unirse a una sala (Tablero)
  socket.on('entrar_tablero', (boardId: string) => {
    socket.join(boardId);

    // Al entrar, enviar el estado actual de bloqueos de ESE tablero
    const currentLocks: { [positId: string]: string } = {};
    lockRegistry.forEach((value, key) => {
      const [bId, pId] = key.split(':');
      if (bId === boardId) {
        currentLocks[pId] = value.usuario;
      }
    });

    if (Object.keys(currentLocks).length > 0) {
      socket.emit('estado_bloqueos', currentLocks);
    }
  });

  socket.on('bloquear_posit', (data: { boardId: string, positId: string, usuario: string }) => {
    const lockKey = `${data.boardId}:${data.positId}`;

    if (lockRegistry.has(lockKey)) {
      clearTimeout(lockRegistry.get(lockKey)!.timeout);
    }

    socket.to(data.boardId).emit('posit_bloqueado', data);

    const timeout = setTimeout(() => {
      console.log(`⏰ Límite de tiempo excedido para posit ${data.positId} en tablero ${data.boardId}`);
      io.to(data.boardId).emit('posit_desbloqueado', { boardId: data.boardId, positId: data.positId });
      lockRegistry.delete(lockKey);
    }, 120000);

    lockRegistry.set(lockKey, { timeout, usuario: data.usuario });
  });

  socket.on('desbloquear_posit', (data: { boardId: string, positId: string }) => {
    const lockKey = `${data.boardId}:${data.positId}`;
    if (lockRegistry.has(lockKey)) {
      clearTimeout(lockRegistry.get(lockKey)!.timeout);
      lockRegistry.delete(lockKey);
    }
    socket.to(data.boardId).emit('posit_desbloqueado', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// 5. Arrancar servidor
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP + WebSocket corriendo en http://localhost:${PORT}`);
  });
});