// file: src/routes/board.routes.ts
import { Router } from 'express';
import { 
  createBoard, getMyBoards, getBoardById, updateBoard, deleteBoard, 
  addPosit, updatePosit, deletePosit, 
  addComment, deleteComment, // <--- NUEVO
  inviteUser, removeParticipant // <--- NUEVO
} from '../controllers/board.controller';
import { validateToken } from '../middlewares/auth.middleware';

const router = Router();
router.use(validateToken);

// --- TABLEROS ---
router.get('/', getMyBoards);
router.post('/', createBoard);
router.get('/:boardId', getBoardById);
router.put('/:boardId', updateBoard);
router.delete('/:boardId', deleteBoard);

// --- POSITS ---
router.post('/:boardId/posits', addPosit);
router.put('/:boardId/posits/:positId', updatePosit);
router.delete('/:boardId/posits/:positId', deletePosit);

// --- COMENTARIOS ---
router.post('/:boardId/posits/:positId/comments', addComment);
router.delete('/:boardId/posits/:positId/comments/:commentId', deleteComment); // <--- NUEVO (Borrar comentario)

// --- PARTICIPANTES ---
router.post('/:boardId/participants', inviteUser);
router.delete('/:boardId/participants/:userIdToRemove', removeParticipant); // <--- NUEVO (Expulsar/Salir)

export default router;