// file: src/controllers/board.controller.ts

import { Request, Response } from 'express';
import { Types } from 'mongoose';
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

export const createBoard = async (req: Request, res: Response) => {
  try {
    // 1. Validar datos de entrada con Zod
    const validatedData = createBoardSchema.parse(req.body);

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

    // 5. Guardar en MongoDB
    await newBoard.save();

    res.status(201).json({ message: 'Tablero creado', board: newBoard });
  } catch (error: any) {
    // Si falla Zod, es un error de validación (400)
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: error.message || 'Error interno' });
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
  const user = req.currentUser!;

  try {
    // Validamos input simplificado
    const data = createPositSchema.parse(req.body);

    const newPositId = generateId('posit');

    const newPosit = {
      posit_id: newPositId,
      titulo: data.titulo,
      contenido: data.contenido || '',
      color: data.color || 'yellow',
      // Forzamos X e Y a 0, usamos el orden que nos manden o 0
      posicion: { x: 0, y: 0, orden: data.orden || 0 },
      autor_id: user._id,
      fecha_creacion: new Date(),
      comentarios: []
    };

    const board = await Board.findOneAndUpdate(
      { _id: boardId, 'participantes.usuario_id': user._id },
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
  const user = req.currentUser!;

  try {
    const dataToUpdate = updatePositSchema.parse(req.body);

    // 1. Buscamos el tablero completo
    const board = await Board.findOne({
      _id: boardId,
      'participantes.usuario_id': user._id
    });

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
    const board = await Board.findOne({
      _id: boardId,
      'participantes.usuario_id': user._id // Seguridad: Solo si eres participante
    })
      .populate('participantes.usuario_id', 'email')
      .populate('posits.autor_id', 'email')
      .populate('posits.comentarios.usuario_id', 'email');

    if (!board) return res.status(404).json({ error: 'Tablero no encontrado o acceso denegado' });

    res.json(board);
  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo el tablero' });
  }
};

// 4. Borrar un Posit
export const deletePosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser!;

  try {
    const board = await Board.findOneAndUpdate(
      {
        _id: boardId,
        'participantes.usuario_id': user._id
      },
      {
        $pull: { posits: { posit_id: positId } }
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'No se pudo borrar (Tablero no encontrado)' });

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'deletePosit');

    res.json({ message: 'Posit eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando posit' });
  }
};

// 5. Invitar usuario
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

    // 3. Añadir al tablero CON SEGURIDAD
    const board = await Board.findOneAndUpdate(
      {
        _id: boardId,
        participantes: {
          $elemMatch: { usuario_id: user._id, permiso: 'admin' }
        }
      },
      {
        $addToSet: {
          participantes: {
            usuario_id: targetUser._id,
            permiso: permiso,
            fecha_incorporacion: new Date()
          }
        }
      },
      { new: true }
    );

    if (!board) {
      return res.status(403).json({
        error: 'No tienes permisos de Admin en este tablero o el tablero no existe'
      });
    }

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'inviteUser');

    res.json({
      message: `Usuario ${email} invitado correctamente`,
      participantes: board.participantes
    });

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error invitando usuario' });
  }
};

// 6. Añadir Comentario
export const addComment = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser!;

  try {
    const { contenido } = addCommentSchema.parse(req.body);

    const board = await Board.findOneAndUpdate(
      { _id: boardId, 'posits.posit_id': positId, 'participantes.usuario_id': user._id },
      {
        $push: {
          'posits.$.comentarios': {
            usuario_id: user._id,
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
    const result = await Board.deleteOne({
      _id: boardId,
      participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
    });

    if (result.deletedCount === 0) return res.status(403).json({ error: 'No se pudo borrar (Permisos o no existe)' });

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
  const user = req.currentUser!;

  try {
    console.log(`--- Intentando borrar comentario: board=${boardId}, posit=${positId}, comment=${commentId} ---`);

    // A) Verificar si el usuario es ADMIN del tablero
    const boardAdmin = await Board.findOne({
      _id: boardId,
      participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
    });

    let query: any;

    // Si es ADMIN, puede borrar cualquier comentario de ese board/posit
    if (boardAdmin) {
      query = { _id: boardId, 'posits.posit_id': positId };
    }
    // Si NO es Admin, solo puede borrar SU comentario
    else {
      query = {
        _id: boardId,
        'posits.posit_id': positId,
        'participantes.usuario_id': user._id
      };
    }

    // Convertimos commentId a ObjectId para asegurar el match en el $pull
    // Los comentarios en Mongoose tienen _id autogenerado como ObjectId por defecto
    const cid = new Types.ObjectId(commentId);

    // Ejecutamos el pull
    const pullCondition: any = boardAdmin
      ? { _id: cid }
      : { _id: cid, usuario_id: user._id };

    console.log('Query de búsqueda:', JSON.stringify(query));
    console.log('Condición de Pull:', JSON.stringify(pullCondition));

    const board = await Board.findOneAndUpdate(
      query,
      {
        $pull: {
          'posits.$.comentarios': pullCondition
        }
      },
      { new: true }
    );

    if (!board) {
      console.log('No se encontró el tablero o posit con los permisos adecuados');
      return res.status(404).json({ error: 'No se pudo borrar (No tienes permisos o no existe)' });
    }

    // Buscamos si el comentario sigue ahí (si el pull no hizo nada)
    const posit = board.posits.find(p => p.posit_id === positId);
    const commentStillExists = posit?.comentarios.some(c => c._id?.toString() === commentId);

    if (commentStillExists) {
      console.log('El comentario no se borró (probablemente no eras el autor)');
      return res.status(403).json({ error: 'No tienes permisos para borrar este comentario' });
    }

    console.log('Comentario borrado con éxito');

    // 🔥 SOCKET
    emitirActualizacion(req, boardId, 'deleteComment');

    res.json({ message: 'Comentario eliminado' });
  } catch (error: any) {
    console.error('Error eliminando comentario:', error);
    res.status(500).json({ error: 'Error eliminando comentario', details: error.message });
  }
};
