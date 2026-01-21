// file: src/routes/board.routes.ts
import { Router } from 'express';
import {
  createBoard, getMyBoards, getBoardById, updateBoard, deleteBoard,
  addPosit, updatePosit, deletePosit,
  addComment, deleteComment, // <--- NUEVO
  inviteUser, removeParticipant, // <--- NUEVO
  uploadFileToPosit, deleteFileFromPosit, // <--- NUEVO
  joinBoardViaLink, // <--- NUEVO
  updateParticipantRole // <--- NUEVO
} from '../controllers/board.controller';
import { validateToken } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();
router.use(validateToken);

// --- TABLEROS ---
router.get('/', getMyBoards);
router.post('/', createBoard);
router.get('/:boardId', getBoardById);
router.put('/:boardId', updateBoard);
router.delete('/:boardId', deleteBoard);
router.post('/:boardId/join', joinBoardViaLink); // <--- NUEVO

// --- POSITS ---
router.post('/:boardId/posits', addPosit);
router.put('/:boardId/posits/:positId', updatePosit);
router.delete('/:boardId/posits/:positId', deletePosit);
router.post('/:boardId/posits/:positId/upload', upload.single('archivo'), uploadFileToPosit); // <--- NUEVO
router.delete('/:boardId/posits/:positId/file', deleteFileFromPosit); // <--- NUEVO

// --- COMENTARIOS ---
router.post('/:boardId/posits/:positId/comments', addComment);
router.delete('/:boardId/posits/:positId/comments/:commentId', deleteComment); // <--- NUEVO (Borrar comentario)

// --- PARTICIPANTES ---
router.post('/:boardId/participants', inviteUser);
router.put('/:boardId/participants/:userId', updateParticipantRole); // <--- NUEVO (Cambiar rol)
router.delete('/:boardId/participants/:userIdToRemove', removeParticipant); // <--- NUEVO (Expulsar/Salir)

export default router;