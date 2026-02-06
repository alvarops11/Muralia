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

// --- SISTEMA DE LOCKS AUTORITATIVOS PARA DRAG (GLOBAL) ---
type DragLock = {
  userId: string;
  socketId: string;
  timeout: NodeJS.Timeout;
};

const dragLocks = new Map<string, DragLock>();

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

  // --- EVENTOS DE DRAG CON LOCKS AUTORITATIVOS ---

  // Evento: Solicitar permiso para arrastrar
  socket.on('solicitar_drag', (data: { boardId: string, positId: string, userId: string }) => {
    const lockKey = `${data.boardId}:${data.positId}`;

    // Verificar si ya existe un lock
    if (dragLocks.has(lockKey)) {
      // Denegar: otro usuario ya está arrastrando este posit
      socket.emit('drag_denegado', { positId: data.positId, reason: 'locked_by_other' });
      return;
    }

    // Conceder el lock
    const timeout = setTimeout(() => {
      console.log(`⏰ Timeout de drag para posit ${data.positId} en tablero ${data.boardId}`);
      dragLocks.delete(lockKey);
      io.to(data.boardId).emit('drag_liberado', { positId: data.positId });
    }, 45000); // Aumentado a 45 segundos para evitar cortes prematuros

    dragLocks.set(lockKey, {
      userId: data.userId,
      socketId: socket.id,
      timeout
    });

    // Notificar al solicitante
    socket.emit('drag_concedido', { positId: data.positId });

    // Notificar a los demás usuarios
    socket.to(data.boardId).emit('drag_bloqueado', { positId: data.positId, usuario: data.userId });
  });

  // Evento: Movimiento de posit (CON VALIDACIÓN ESTRICTA)
  socket.on('moviendo_posit', (data) => {
    const lockKey = `${data.boardId}:${data.positId}`;
    const lock = dragLocks.get(lockKey);

    // VALIDACIÓN AUTORITATIVA: Solo retransmitir si el socket tiene el lock
    if (!lock || lock.socketId !== socket.id) {
      console.warn(`⚠️ Movimiento rechazado: posit ${data.positId} no tiene lock válido para socket ${socket.id}`);
      return; // IGNORAR completamente
    }

    // Lock válido: retransmitir a los demás
    socket.to(data.boardId).emit('posit_moviendose', data);
  });

  // Evento: Parar arrastre
  socket.on('parar_posit', (data) => {
    const lockKey = `${data.boardId}:${data.positId}`;
    const lock = dragLocks.get(lockKey);

    if (lock && lock.socketId === socket.id) {
      clearTimeout(lock.timeout);
      dragLocks.delete(lockKey);
      io.to(data.boardId).emit('drag_liberado', { positId: data.positId });
    }

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

    // Limpiar todos los drag locks del socket desconectado
    dragLocks.forEach((lock, key) => {
      if (lock.socketId === socket.id) {
        clearTimeout(lock.timeout);
        dragLocks.delete(key);

        // Extraer boardId y positId del key
        const [boardId, positId] = key.split(':');
        io.to(boardId).emit('drag_liberado', { positId });
        console.log(`🔓 Drag lock liberado automáticamente para posit ${positId} (disconnect)`);
      }
    });
  });
});

// 5. Arrancar servidor
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`🚀 Servidor HTTP + WebSocket corriendo en http://localhost:${PORT}`);
  });
});