// file: src/controllers/board.controller.ts

import { Request, Response } from 'express';
import { Types } from 'mongoose';
import path from 'path';
import fs from 'fs';
import Board from '../models/Board';
import { generateId } from '../utils/idGenerator';
import User from '../models/User';
import {
  createBoardSchema,
  createPositSchema,
  updatePositSchema,
  inviteUserSchema,
  updateBoardSchema,
  addCommentSchema
} from '../types/validator';
import Invitation from '../models/Invitation';

// --- HELPER PARA SOCKETS (NUEVO) ---
// Función auxiliar para no repetir código. Emite el evento a la sala del tablero.
const emitirActualizacion = (req: Request, boardId: string, accion: string) => {
  const io = req.app.get('socketio');
  if (io) {
    // Enviamos un evento 'tablero_actualizado' a todos en la sala 'boardId'
    io.to(boardId).emit('tablero_actualizado', {
      accion,
      autor: req.currentUser?.email
    });
  }
};
// -----------------------------------

// --- HELPER PARA BORRAR ARCHIVOS (NUEVO) ---
const eliminarArchivoFisico = (archivoUrl?: string) => {
  if (!archivoUrl) return;
  try {
    const relativePath = archivoUrl.startsWith('/') ? archivoUrl.substring(1) : archivoUrl;
    // Estamos en src/controllers, uploads está en ../../uploads
    const filePath = path.join(__dirname, '../../', relativePath);

    console.log(`[DEBUG] Intentando borrar: ${filePath}`);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`[SUCCESS] Archivo eliminado: ${filePath}`);
    } else {
      console.warn(`[WARN] El archivo no existe: ${filePath}`);
    }
  } catch (error) {
    console.error('[ERROR] Error eliminando archivo físico:', error);
  }
};
// -------------------------------------------

export const createBoard = async (req: Request, res: Response) => {
  console.log('[createBoard] Body recibido:', JSON.stringify(req.body, null, 2));
  try {
    // 1. Validar datos de entrada con Zod
    const validatedData = createBoardSchema.parse(req.body);
    console.log('[createBoard] Datos validados:', JSON.stringify(validatedData, null, 2));

    // 2. Obtener usuario autenticado (garantizado por el middleware)
    const user = req.currentUser!;

    // 3. Generar ID si no viene (ej: tablero_12345)
    const boardId = validatedData._id || generateId('tablero');

    // 4. Crear instancia del modelo
    const newBoard = new Board({
      ...validatedData,
      _id: boardId,
      // Añadimos al creador como primer participante ADMIN
      participantes: [{
        usuario_id: user._id,
        permiso: 'admin',
        fecha_incorporacion: new Date()
      }]
    });

    console.log('[createBoard] Intentando guardar en DB...');
    // 5. Guardar en MongoDB
    await newBoard.save();
    console.log('[createBoard] Tablero guardado con éxito');

    res.status(201).json({ message: 'Tablero creado', board: newBoard });
  } catch (error: any) {
    console.error('[createBoard] ERROR DETECTADO:', error);

    // Si falla Zod, es un error de validación (400)
    if (error.name === 'ZodError') {
      const messages = error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`);
      console.error('[createBoard] Errores de Zod:', messages);
      return res.status(400).json({ error: 'Error de validación', messages });
    }

    // Si es error de duplicado (ej: boardId ya existe)
    if (error.code === 11000) {
      console.error('[createBoard] Error de duplicidad');
      return res.status(409).json({ error: 'Ya existe un tablero con ese ID' });
    }

    // Error genérico
    console.error('[createBoard] Error final:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: error.message,
      fullError: error // Enviamos el objeto completo para debuguear en consola del navegador
    });
  }
};

export const getMyBoards = async (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;

    // Buscar tableros donde el usuario esté en el array de participantes
    const boards = await Board.find({
      'participantes.usuario_id': user._id
    });

    res.json(boards);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo tableros' });
  }
};

// 1. Añadir Posit (Simplificado)
export const addPosit = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser; // Opcional

  try {
    const data = createPositSchema.parse(req.body);
    const newPositId = generateId('posit');

    // Identificar autor
    let autor_id: string | undefined = undefined;
    let nombre_autor: string = 'Anónimo';

    if (user) {
      autor_id = user._id;
      nombre_autor = user.email;
    } else {
      const { nombre, guestId } = req.body;
      if (!nombre) return res.status(400).json({ error: 'Falta nombre del autor' });
      autor_id = undefined; // No tiene usuario_id de ref
      nombre_autor = nombre;
    }

    const newPosit = {
      posit_id: newPositId,
      titulo: data.titulo,
      contenido: data.contenido || '',
      color: data.color || 'yellow',
      posicion: { x: 0, y: 0, orden: data.orden || 0 },
      autor_id,
      nombre_autor,
      fecha_creacion: new Date(),
      comentarios: []
    };

    // Seguridad: Verificar permisos (admin, editor o invitado registrado en el board)
    const boardQuery: any = { _id: boardId };
    if (user) {
      boardQuery.participantes = {
        $elemMatch: { usuario_id: user._id, permiso: { $in: ['admin', 'editor'] } }
      };
    } else {
      boardQuery.participantes = {
        $elemMatch: { guest_id: req.body.guestId, permiso: { $in: ['admin', 'editor'] } }
      };
    }

    const board = await Board.findOneAndUpdate(
      boardQuery,
      { $push: { posits: newPosit } },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // Enviar respuesta HTTP primero para liberar al frontend
    res.status(201).json({ message: 'Posit añadido', posit: newPosit });

    // 🔥 SOCKET después
    emitirActualizacion(req, boardId, 'addPosit');
  } catch (error: any) {
    res.status(500).json({ error: error.errors || 'Error añadiendo posit' });
  }
};

// 2. Editar/Mover un Posit (CON REORDENAMIENTO INTELIGENTE)
export const updatePosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser;

  try {
    const dataToUpdate = updatePositSchema.parse(req.body);

    // 1. Buscamos el tablero completo con permisos
    const boardQuery: any = { _id: boardId };

    if (user) {
      boardQuery.participantes = {
        $elemMatch: { usuario_id: user._id, permiso: { $in: ['admin', 'editor'] } }
      };
    } else {
      boardQuery.participantes = {
        $elemMatch: { guest_id: req.body.guestId, permiso: { $in: ['admin', 'editor'] } }
      };
    }

    const board = await Board.findOne(boardQuery);

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // 2. Encontramos el posit dentro del array
    const positIndex = board.posits.findIndex(p => p.posit_id === positId);
    if (positIndex === -1) return res.status(404).json({ error: 'Posit no encontrado' });

    const posit = board.posits[positIndex];

    // --- LOGICA DE ACTUALIZACIÓN ---

    // A) Si solo cambiamos texto/color (sin mover orden)
    if (dataToUpdate.orden === undefined) {
      if (dataToUpdate.titulo) posit.titulo = dataToUpdate.titulo;
      if (dataToUpdate.contenido) posit.contenido = dataToUpdate.contenido;
      if (dataToUpdate.color) posit.color = dataToUpdate.color;

      // Marcamos a Mongoose que hemos modificado el array
      board.markModified('posits');
    }

    // B) Si cambiamos el ORDEN (Drag & Drop)
    else {
      if (dataToUpdate.titulo) posit.titulo = dataToUpdate.titulo;
      if (dataToUpdate.contenido) posit.contenido = dataToUpdate.contenido;
      if (dataToUpdate.color) posit.color = dataToUpdate.color;

      // 1. Sacamos el posit de su lugar actual
      board.posits.splice(positIndex, 1);

      // 2. Ordenamos el resto
      board.posits.sort((a, b) => (a.posicion.orden || 0) - (b.posicion.orden || 0));

      // 3. Calculamos dónde meterlo
      let nuevoIndice = dataToUpdate.orden;
      if (nuevoIndice < 0) nuevoIndice = 0;
      if (nuevoIndice > board.posits.length) nuevoIndice = board.posits.length;

      // 4. Lo insertamos en la nueva posición
      board.posits.splice(nuevoIndice, 0, posit);

      // 5. RE-NUMERAMOS TODO
      board.posits.forEach((p, index) => {
        p.posicion.orden = index;
      });

      board.markModified('posits');
    }

    // Guardamos todos los cambios
    await board.save();

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'updatePosit');

    res.json({ message: 'Posit actualizado y reordenado', posit });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error actualizando posit' });
  }
};

// 3. Obtener UN tablero específico
export const getBoardById = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!;

  try {
    const board = await Board.findById(boardId)
      .populate('participantes.usuario_id', 'email')
      .populate('posits.autor_id', 'email')
      .populate('posits.comentarios.usuario_id', 'email');

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // Seguridad: Si es privado, solo participantes. Si es enlace-abierto o publico, cualquiera.
    const isParticipant = board.participantes.some(p => {
      // 1. Caso Usuario Registrado
      if (user) {
        const puid = (p.usuario_id as any)?._id || p.usuario_id;
        if (puid && puid.toString() === user._id.toString()) return true;
      }

      // 2. Caso Invitado (Guest)
      const guestId_req = req.query.guestId;
      if (guestId_req && p.guest_id === guestId_req) return true;

      return false;
    });

    if (board.privacidad === 'privado' && !isParticipant) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo el tablero' });
  }
};

// 4. Borrar un Posit
export const deletePosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser;

  try {
    // 1. Buscamos el board para ver si el posit tiene archivo
    const board = await Board.findOne({ _id: boardId });
    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    const posit = board.posits.find(p => p.posit_id === positId);
    if (posit && posit.archivoUrl) {
      eliminarArchivoFisico(posit.archivoUrl);
    }

    // 2. Quitamos el posit del array con permisos
    const boardQuery: any = { _id: boardId };
    if (user) {
      boardQuery.participantes = {
        $elemMatch: { usuario_id: user._id, permiso: { $in: ['admin', 'editor'] } }
      };
    } else {
      boardQuery.participantes = {
        $elemMatch: { guest_id: req.body.guestId, permiso: { $in: ['admin', 'editor'] } }
      };
    }

    const result = await Board.findOneAndUpdate(
      boardQuery,
      { $pull: { posits: { posit_id: positId } } },
      { new: true }
    );

    if (!result) return res.status(403).json({ error: 'No tienes permisos para borrar' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'deletePosit');

    res.json({ message: 'Posit eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando posit' });
  }
};

// 5. Invitar usuario (Ahora crea una invitación formal)
export const inviteUser = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!; // Tú

  try {
    // 1. Validar email y permiso
    const { email, permiso } = inviteUserSchema.parse(req.body);

    // 2. Buscar si el usuario invitado existe
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ error: 'El usuario no está registrado en la App' });
    }

    if (targetUser._id === user._id) {
      return res.status(400).json({ error: 'No puedes invitarte a ti mismo' });
    }

    // 3. Verificar si ya es participante
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    const isAlreadyParticipant = board.participantes.some(p => {
      const puid = (p.usuario_id as any)?._id || p.usuario_id;
      return puid && puid.toString() === targetUser._id.toString();
    });

    if (isAlreadyParticipant) {
      return res.status(400).json({ error: 'El usuario ya es participante de este tablero' });
    }

    // 4. Verificar si ya tiene una invitación pendiente
    const existingInvite = await Invitation.findOne({
      board_id: boardId,
      receiver_id: targetUser._id,
      status: 'pending'
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'Ya existe una invitación pendiente para este usuario' });
    }

    // 5. Crear la invitación
    const newInvitation = new Invitation({
      board_id: boardId,
      sender_id: user._id,
      receiver_id: targetUser._id,
      permiso,
      status: 'pending'
    });

    await newInvitation.save();

    res.json({
      message: `Invitación enviada a ${email} correctamente`,
      invitation: newInvitation
    });

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    console.error('[inviteUser] Error:', error);
    res.status(500).json({ error: 'Error invitando usuario' });
  }
};

// 15. Obtener invitaciones pendientes del usuario (NUEVO)
export const getMyInvitations = async (req: Request, res: Response) => {
  try {
    const user = req.currentUser!;
    const invitations = await Invitation.find({
      receiver_id: user._id,
      status: 'pending'
    }).populate('board_id', 'titulo').populate('sender_id', 'email');

    res.json(invitations);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo invitaciones' });
  }
};

// 16. Aceptar invitación (NUEVO)
export const acceptInvitation = async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const user = req.currentUser!;

  try {
    const invite = await Invitation.findOne({
      _id: invitationId,
      receiver_id: user._id,
      status: 'pending'
    });

    if (!invite) return res.status(404).json({ error: 'Invitación no encontrada' });

    // Añadir al tablero
    const board = await Board.findByIdAndUpdate(
      invite.board_id,
      {
        $addToSet: {
          participantes: {
            usuario_id: user._id,
            permiso: invite.permiso,
            fecha_incorporacion: new Date()
          }
        }
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // Marcar invitación como aceptada
    invite.status = 'accepted';
    await invite.save();

    res.json({ message: 'Invitación aceptada', board });
  } catch (error) {
    res.status(500).json({ error: 'Error aceptando invitación' });
  }
};

// 17. Rechazar invitación (NUEVO)
export const declineInvitation = async (req: Request, res: Response) => {
  const { invitationId } = req.params;
  const user = req.currentUser!;

  try {
    const invite = await Invitation.findOneAndUpdate(
      { _id: invitationId, receiver_id: user._id, status: 'pending' },
      { $set: { status: 'declined' } },
      { new: true }
    );

    if (!invite) return res.status(404).json({ error: 'Invitación no encontrada' });

    res.json({ message: 'Invitación rechazada' });
  } catch (error) {
    res.status(500).json({ error: 'Error rechazando invitación' });
  }
};

// 6. Añadir Comentario
export const addComment = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser;

  try {
    const { contenido } = addCommentSchema.parse(req.body);

    const boardQuery: any = { _id: boardId, 'posits.posit_id': positId };

    let commentAuthorId: string;
    let commentAuthorName: string | undefined = undefined;

    if (user) {
      boardQuery['participantes.usuario_id'] = user._id;
      commentAuthorId = user._id;
    } else {
      const { guestId, nombre } = req.body;
      if (!guestId) return res.status(400).json({ error: 'Falta guestId' });
      boardQuery['participantes.guest_id'] = guestId;
      commentAuthorId = guestId;
      commentAuthorName = nombre;
    }

    const board = await Board.findOneAndUpdate(
      boardQuery,
      {
        $push: {
          'posits.$.comentarios': {
            usuario_id: commentAuthorId,
            nombre: commentAuthorName, // Añadido para mostrar nombre de invitado
            contenido,
            fecha: new Date()
          }
        }
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'No se pudo comentar' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'addComment');

    res.json({ message: 'Comentario añadido', board });

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error al comentar' });
  }
};

// 7. Editar Tablero
export const updateBoard = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!;

  try {
    const dataToUpdate = updateBoardSchema.parse(req.body);

    const board = await Board.findOneAndUpdate(
      {
        _id: boardId,
        participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
      },
      { $set: dataToUpdate },
      { new: true }
    );

    if (!board) return res.status(403).json({ error: 'No tienes permisos o tablero no existe' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'updateBoard');

    res.json(board);

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error actualizando tablero' });
  }
};

// 8. Eliminar Tablero Completo
export const deleteBoard = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!;

  try {
    // 1. Buscamos el tablero para limpiar archivos
    const board = await Board.findOne({
      _id: boardId,
      participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
    });

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado o no eres admin' });

    // 2. Borrar archivos físicos de todos los posits
    board.posits.forEach(p => {
      if (p.archivoUrl) eliminarArchivoFisico(p.archivoUrl);
    });

    // 3. Borrar el tablero de la DB
    await Board.deleteOne({ _id: boardId });

    // 🔥 SOCKET (Para avisar a otros que se cierra)
    emitirActualizacion(req, boardId, 'deleteBoard');

    res.json({ message: 'Tablero eliminado permanentemente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando tablero' });
  }
};

// 9. Eliminar Participante (Expulsar o Salirse)
export const removeParticipant = async (req: Request, res: Response) => {
  const { boardId, userIdToRemove } = req.params;
  const user = req.currentUser!;

  try {
    // Si te borras a ti mismo
    if (userIdToRemove === user._id) {
      await Board.findByIdAndUpdate(boardId, {
        $pull: { participantes: { usuario_id: user._id } }
      });

      // 🔥 SOCKET (Avisar que salí)
      emitirActualizacion(req, boardId, 'removeParticipant');

      return res.json({ message: 'Has salido del tablero' });
    }

    // Si es expulsar a otro
    const board = await Board.findOneAndUpdate(
      {
        _id: boardId,
        participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
      },
      {
        $pull: { participantes: { usuario_id: userIdToRemove } }
      },
      { new: true }
    );

    if (!board) return res.status(403).json({ error: 'No tienes permisos para expulsar o tablero no existe' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'removeParticipant');

    res.json({ message: 'Participante eliminado', participantes: board.participantes });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando participante' });
  }
};

// 10. Eliminar Comentario
export const deleteComment = async (req: Request, res: Response) => {
  const { boardId, positId, commentId } = req.params;
  const user = req.currentUser;

  try {
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // 1. ¿Quién intenta borrar?
    let actorId: string;
    let isAdmin = false;

    if (user) {
      actorId = user._id;
      isAdmin = board.participantes.some(p => p.usuario_id && p.usuario_id.toString() === user._id.toString() && p.permiso === 'admin');
    } else {
      const { guestId } = req.body;
      if (!guestId) return res.status(400).json({ error: 'Falta guestId' });
      actorId = guestId;
      isAdmin = false; // Los invitados por ahora no son admins
    }

    // 2. Ejecutar el pull con permiso: si es admin O si el comentario es suyo
    const pullCondition: any = isAdmin
      ? { _id: commentId }
      : { _id: commentId, usuario_id: actorId };

    const updatedBoard = await Board.findOneAndUpdate(
      { _id: boardId, 'posits.posit_id': positId },
      { $pull: { 'posits.$.comentarios': pullCondition } },
      { new: true }
    );

    if (!updatedBoard) {
      return res.status(403).json({ error: 'No tienes permisos o no existe el comentario' });
    }

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'deleteComment');
    res.json({ message: 'Comentario eliminado' });

  } catch (error: any) {
    res.status(500).json({ error: 'Error eliminando comentario', details: error.message });
  }
};

// 11. Subir Archivo a un Posit (NUEVO)
export const uploadFileToPosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha subido ningún archivo' });
    }

    // El middleware de multer guarda el archivo y pone info en req.file
    const archivoUrl = `/uploads/${req.file.filename}`;
    const archivoNombre = req.file.originalname;

    const boardQuery: any = { _id: boardId, 'posits.posit_id': positId };
    if (user) {
      boardQuery.participantes = {
        $elemMatch: { usuario_id: user._id, permiso: { $in: ['admin', 'editor'] } }
      };
    } else {
      boardQuery.participantes = {
        $elemMatch: { guest_id: req.body.guestId, permiso: { $in: ['admin', 'editor'] } }
      };
    }

    const board = await Board.findOneAndUpdate(
      boardQuery,
      {
        $set: {
          'posits.$.archivoUrl': archivoUrl,
          'posits.$.archivoNombre': archivoNombre
        }
      },
      { new: true }
    );

    if (!board) {
      return res.status(404).json({ error: 'Tablero o Posit no encontrado' });
    }

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'uploadFile');

    res.json({
      message: 'Archivo subido correctamente',
      archivoUrl,
      archivoNombre
    });

  } catch (error) {
    console.error('Error al subir archivo:', error);
    res.status(500).json({ error: 'Error interno al subir el archivo' });
  }
};

// 12. Borrar Archivo de un Posit (NUEVO)
export const deleteFileFromPosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser;

  try {
    // 1. Buscar el posit para saber la ruta del archivo
    const board = await Board.findOne({ _id: boardId, 'posits.posit_id': positId });
    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    const posit = board.posits.find(p => p.posit_id === positId);
    if (!posit) return res.status(404).json({ error: 'Posit no encontrado' });

    // 2. Si tiene archivo, borrarlo del disco
    eliminarArchivoFisico(posit.archivoUrl);

    // 3. Quitar del documento en MongoDB con permisos
    const boardQuery: any = { _id: boardId, 'posits.posit_id': positId };
    if (user) {
      boardQuery.participantes = {
        $elemMatch: { usuario_id: user._id, permiso: { $in: ['admin', 'editor'] } }
      };
    } else {
      boardQuery.participantes = {
        $elemMatch: { guest_id: req.body.guestId, permiso: { $in: ['admin', 'editor'] } }
      };
    }

    const updatedBoard = await Board.findOneAndUpdate(
      boardQuery,
      {
        $unset: {
          'posits.$.archivoUrl': "",
          'posits.$.archivoNombre': ""
        }
      },
      { new: true }
    );

    if (!updatedBoard) return res.status(403).json({ error: 'No tienes permisos' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'deleteFile');

    res.json({ message: 'Archivo eliminado' });

  } catch (error) {
    console.error('Error eliminando archivo:', error);
    res.status(500).json({ error: 'Error eliminando el archivo' });
  }
};

// 13. Unirse a un Tablero vía Enlace (NUEVO)
export const joinBoardViaLink = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const { role } = req.body; // 'editor' o 'lector'
  const user = req.currentUser; // Ahora es opcional

  try {
    // 1. Verificar si el tablero existe
    const board = await Board.findById(boardId);
    if (!board) return res.status(404).json({ error: 'Tablero no encontrado' });

    // 2. Verificar si ya es participante y actualizar datos si es necesario
    const guestId_req = req.body.guestId;
    let userName_final = req.body.nombre || (user ? user.email : 'Invitado');

    const pIndex = board.participantes.findIndex(p => {
      if (user) {
        const puid = (p.usuario_id as any)?._id || p.usuario_id;
        if (puid && puid.toString() === user._id.toString()) return true;
      }
      if (guestId_req && p.guest_id === guestId_req) return true;
      // Fallback: si el usuario_id coincide con el guestId_req (por registros antiguos)
      if (guestId_req && p.usuario_id && p.usuario_id === guestId_req) return true;
      return false;
    });

    const finalRole = role === 'editor' ? 'editor' : 'lector';

    if (pIndex !== -1) {
      // YA EXISTE:
      const existingParticipant = board.participantes[pIndex];

      // Proteccion contra downgrade: no bajar de admin a editor/lector, ni de editor a lector
      const rolesOrder = { 'admin': 3, 'editor': 2, 'lector': 1 };
      const currentRoleWeight = rolesOrder[existingParticipant.permiso as keyof typeof rolesOrder] || 0;
      const newRoleWeight = rolesOrder[finalRole as keyof typeof rolesOrder] || 0;

      if (newRoleWeight > currentRoleWeight) {
        existingParticipant.permiso = finalRole;
      }

      existingParticipant.nombre = userName_final;
      if (guestId_req) existingParticipant.guest_id = guestId_req;

      board.markModified('participantes');
      await board.save();
      console.log(`[joinBoard] Datos actualizados para: ${userName_final} (${existingParticipant.permiso})`);
      emitirActualizacion(req, boardId, 'userJoined');
      return res.json({ message: 'Datos de colaborador actualizados', board });
    }

    // 3. NO EXISTE: Crear nuevo participante
    const nuevoParticipante = {
      usuario_id: user ? user._id : undefined,
      guest_id: user ? undefined : (guestId_req || `guest_${new Date().getTime()}`),
      nombre: userName_final,
      permiso: finalRole,
      fecha_incorporacion: new Date()
    };

    board.participantes.push(nuevoParticipante as any);
    await board.save();

    console.log(`[joinBoard] Nuevo colaborador añadido: ${userName_final} (${finalRole})`);

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'userJoined');

    res.json({ message: 'Te has unido al tablero', board });

  } catch (error) {
    console.error('Error al unirse al tablero:', error);
    res.status(500).json({ error: 'Error interno al unirse al tablero' });
  }
};

// 14. Actualizar Rol de un Participante (NUEVO)
export const updateParticipantRole = async (req: Request, res: Response) => {
  const { boardId, userId } = req.params;
  const { role } = req.body; // 'admin' | 'editor' | 'lector'
  const user = req.currentUser!;

  try {
    // 1. Verificar si el cargando es admin del tablero
    const board = await Board.findOne({
      _id: boardId,
      participantes: {
        $elemMatch: { usuario_id: user._id, permiso: 'admin' }
      }
    });

    if (!board) return res.status(403).json({ error: 'No tienes permisos de administrador' });

    // 2. Actualizar el rol del participante específico
    const updatedBoard = await Board.findOneAndUpdate(
      { _id: boardId, "participantes.usuario_id": userId },
      { $set: { "participantes.$.permiso": role } },
      { new: true }
    );

    if (!updatedBoard) return res.status(404).json({ error: 'Participante no encontrado' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'roleUpdated');

    res.json({ message: 'Rol actualizado correctamente', board: updatedBoard });

  } catch (error) {
    console.error('Error actualizando rol:', error);
    res.status(500).json({ error: 'Error interno al actualizar rol' });
  }
};
