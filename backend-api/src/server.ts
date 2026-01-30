import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import dotenv from 'dotenv';
import { connectDB } from './config/database';

dotenv.config();

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

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
// --- BLOQUEO DE EDICIÓN GLOBAL ---
// Mapa para guardar los timeouts de bloqueo y usuario: { "boardId:positId": { timeout, usuario } }
const lockRegistry = new Map<string, { timeout: NodeJS.Timeout, usuario: string }>();

// --- BLOQUEO DE ARRASTRE ---
// Mapa para saber quién está arrastrando qué: { "boardId:positId": usuario }
const dragLockRegistry = new Map<string, string>();

// 4. Lógica de Sockets
io.on('connection', (socket) => {
  console.log(`⚡ Cliente conectado: ${socket.id}`);

  // Unirse a una sala (Tablero)
  socket.on('entrar_tablero', (boardId: string) => {
    socket.join(boardId);

    // Al entrar, enviar el estado actual de bloqueos de edición de ESE tablero
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

    // Enviar el estado actual de bloqueos de arrastre
    const currentDragLocks: { [positId: string]: string } = {};
    dragLockRegistry.forEach((usuario, key) => {
      const [bId, pId] = key.split(':');
      if (bId === boardId) {
        currentDragLocks[pId] = usuario;
      }
    });

    if (Object.keys(currentDragLocks).length > 0) {
      socket.emit('estado_arrastres', currentDragLocks);
    }
  });

  // Salir de la sala
  socket.on('salir_tablero', (boardId: string) => {
    socket.leave(boardId);
  });

  // --- MOVIMIENTO EN TIEMPO REAL (GHOSTS) ---
  socket.on('moviendo_posit', (data) => {
    socket.to(data.boardId).emit('posit_moviendose', data);
  });

  socket.on('parar_posit', (data) => {
    socket.to(data.boardId).emit('posit_parado', data);
  });

  // --- BLOQUEO DE EDICIÓN ---
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

  // --- BLOQUEO DE ARRASTRE ---
  socket.on('bloquear_arrastre', (data: { boardId: string, positId: string, usuario: string }) => {
    const dragKey = `${data.boardId}:${data.positId}`;

    // Si ya está bloqueado por otro (que NO sea el mismo usuario reconectando?)
    if (dragLockRegistry.has(dragKey) && dragLockRegistry.get(dragKey) !== data.usuario) {
      console.log(`⚠️ Posit ${data.positId} ya está siendo arrastrado por otro usuario`);
      // Avisar al que intentó bloquear que falló
      socket.emit('arrastre_bloqueado_error', { positId: data.positId, usuario: dragLockRegistry.get(dragKey) });
      return;
    }

    dragLockRegistry.set(dragKey, data.usuario);
    // Confirmar al usuario que tuvo éxito
    socket.emit('arrastre_bloqueado_ok', { positId: data.positId });
    // Avisar al resto
    socket.to(data.boardId).emit('arrastre_bloqueado', data);
  });

  socket.on('desbloquear_arrastre', (data: { boardId: string, positId: string }) => {
    const dragKey = `${data.boardId}:${data.positId}`;
    dragLockRegistry.delete(dragKey);
    socket.to(data.boardId).emit('arrastre_desbloqueado', data);
  });

  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
  });
});

// 5. Arrancar servidor
connectDB().then(() => {
  httpServer.listen(Number(PORT), HOST, () => {
    console.log(`🚀 Servidor HTTP + WebSocket corriendo en http://${HOST}:${PORT}`);
  });
});