// file: src/controllers/board.controller.ts

import { Request, Response } from 'express';
import Board from '../models/Board';
import { createBoardSchema } from '../types/validator'; // Asegúrate de haber creado este archivo en el paso anterior
import { generateId } from '../utils/idGenerator';
import { createPositSchema, updatePositSchema } from '../types/validator';
import User from '../models/User'; // Necesitamos importar el modelo de Usuario también
import { 
  inviteUserSchema // <--- ¡AÑADE ESTO!
} from '../types/validator';
import { 
  updateBoardSchema, // <--- NUEVO
  addCommentSchema   // <--- NUEVO
} from '../types/validator';

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

    res.status(201).json({ message: 'Posit añadido', posit: newPosit });
  } catch (error: any) {
    res.status(500).json({ error: error.errors || 'Error añadiendo posit' });
  }
};

// 2. Editar/Mover Posit (Solo Orden)
export const updatePosit = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser!;

  console.log('--- INTENTO DE ACTUALIZACIÓN ---');
  console.log('1. Buscando Tablero:', boardId);
  console.log('2. Buscando Posit:', positId);
  console.log('3. Usuario solicitante:', user._id);
  try {
    const dataToUpdate = updatePositSchema.parse(req.body);

    const updateQuery: any = {};
    
    // Mapeo directo de campos simples
    if (dataToUpdate.titulo) updateQuery['posits.$.titulo'] = dataToUpdate.titulo;
    if (dataToUpdate.contenido) updateQuery['posits.$.contenido'] = dataToUpdate.contenido;
    if (dataToUpdate.color) updateQuery['posits.$.color'] = dataToUpdate.color;
    
    // LÓGICA DE ORDEN: Actualizamos específicamente la propiedad 'orden' dentro de 'posicion'
    // Sin tocar X ni Y.
    if (dataToUpdate.orden !== undefined) {
      updateQuery['posits.$.posicion.orden'] = dataToUpdate.orden;
    }

    const board = await Board.findOneAndUpdate(
      { 
        _id: boardId, 
        'posits.posit_id': positId,
        'participantes.usuario_id': user._id 
      },
      { $set: updateQuery },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'No se pudo actualizar' });

    // Devolvemos el posit actualizado
    const updatedPosit = board.posits.find(p => p.posit_id === positId);
    res.json({ message: 'Posit actualizado', posit: updatedPosit });

  } catch (error) {
    res.status(500).json({ error: 'Error interno' });
  }
  
};
// 3. Obtener UN tablero específico (Para cuando entras en él)
export const getBoardById = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!;

  try {
    const board = await Board.findOne({
      _id: boardId,
      'participantes.usuario_id': user._id // Seguridad: Solo si eres participante
    });

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
        // $pull saca un elemento del array que cumpla la condición
        $pull: { posits: { posit_id: positId } } 
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'No se pudo borrar (Tablero no encontrado)' });

    res.json({ message: 'Posit eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando posit' });
  }
};
// 5. Invitar usuario (Añadir participante)
export const inviteUser = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!; // Tú (el que invita)

  try {
    // 1. Validar email y permiso
    const { email, permiso } = inviteUserSchema.parse(req.body);

    // 2. Buscar si el usuario invitado existe en NUESTRA base de datos
    const targetUser = await User.findOne({ email });
    if (!targetUser) {
      return res.status(404).json({ error: 'El usuario no está registrado en la App' });
    }

    // 3. Añadir al tablero CON SEGURIDAD
    // Buscamos el tablero donde:
    // a) El ID coincide
    // b) TÚ (req.currentUser) estás en participantes Y tienes permiso 'admin'
    const board = await Board.findOneAndUpdate(
      { 
        _id: boardId,
        participantes: { 
          $elemMatch: { usuario_id: user._id, permiso: 'admin' } 
        }
      },
      {
        // $addToSet añade solo si no existe ya (evita duplicados)
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

    res.json({ 
      message: `Usuario ${email} invitado correctamente`, 
      participantes: board.participantes 
    });

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error invitando usuario' });
  }
};
// 6. Añadir Comentario (VALIDADO)
export const addComment = async (req: Request, res: Response) => {
  const { boardId, positId } = req.params;
  const user = req.currentUser!;

  try {
    // Usamos Zod para validar y limpiar el body
    const { contenido } = addCommentSchema.parse(req.body);

    const board = await Board.findOneAndUpdate(
      { _id: boardId, 'posits.posit_id': positId, 'participantes.usuario_id': user._id },
      {
        $push: {
          'posits.$.comentarios': {
            usuario_id: user._id,
            contenido, // Ya sabemos que es string y no está vacío
            fecha: new Date()
          }
        }
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'No se pudo comentar' });
    res.json({ message: 'Comentario añadido', board });

  } catch (error: any) {
    if (error.name === 'ZodError') return res.status(400).json({ error: error.errors });
    res.status(500).json({ error: 'Error al comentar' });
  }
};

// 7. Editar Tablero (VALIDADO)
export const updateBoard = async (req: Request, res: Response) => {
  const { boardId } = req.params;
  const user = req.currentUser!;

  try {
    // Zod valida que si envían color, sea Hex, etc.
    const dataToUpdate = updateBoardSchema.parse(req.body);

    // Solo permitimos editar si eres ADMIN
    const board = await Board.findOneAndUpdate(
      { 
        _id: boardId, 
        participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
      },
      { $set: dataToUpdate }, // Pasamos el objeto limpio de Zod directamente
      { new: true }
    );

    if (!board) return res.status(403).json({ error: 'No tienes permisos o tablero no existe' });
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
    // Solo Admin puede borrar
    const result = await Board.deleteOne({
      _id: boardId,
      participantes: { $elemMatch: { usuario_id: user._id, permiso: 'admin' } }
    });

    if (result.deletedCount === 0) return res.status(403).json({ error: 'No se pudo borrar (Permisos o no existe)' });
    
    res.json({ message: 'Tablero eliminado permanentemente' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando tablero' });
  }
};

// 9. Eliminar Participante (Expulsar o Salirse)
export const removeParticipant = async (req: Request, res: Response) => {
  const { boardId, userIdToRemove } = req.params; // ID del usuario a borrar
  const user = req.currentUser!;

  try {
    // Lógica de permisos:
    // - Si te borras a ti mismo -> OK (Salir del tablero)
    // - Si borras a otro -> Debes ser ADMIN del tablero
    
    // Primero comprobamos si es "salir" (auto-eliminación)
    if (userIdToRemove === user._id) {
       await Board.findByIdAndUpdate(boardId, {
         $pull: { participantes: { usuario_id: user._id } }
       });
       return res.json({ message: 'Has salido del tablero' });
    }

    // Si es expulsar a otro, verificamos que tú seas admin
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
    const board = await Board.findOneAndUpdate(
      { _id: boardId, 'posits.posit_id': positId },
      {
        // Borramos el comentario si:
        // a) El ID coincide Y
        // b) Lo escribió el usuario que hace la petición (seguridad)
        $pull: { 
          'posits.$.comentarios': { 
            _id: commentId, // Mongo genera _id automáticos para subdocumentos si no se desactiva
            usuario_id: user._id 
          } 
        }
      },
      { new: true }
    );

    if (!board) return res.status(404).json({ error: 'Comentario no encontrado o no eres el autor' });
    res.json({ message: 'Comentario eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error eliminando comentario' });
  }
};