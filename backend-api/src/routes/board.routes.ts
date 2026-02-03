// file: src/routes/board.routes.ts
import { Router } from 'express';
import {
  createBoard, getMyBoards, getBoardById, updateBoard, deleteBoard,
  addPosit, updatePosit, deletePosit, swapPosits,
  addComment, deleteComment, // <--- NUEVO
  inviteUser, removeParticipant, // <--- NUEVO
  uploadFileToPosit, deleteFileFromPosit, // <--- NUEVO
  joinBoardViaLink,
  updateParticipantRole,
  getMyInvitations,
  acceptInvitation,
  declineInvitation
} from '../controllers/board.controller';
import { validateToken, optionalAuth } from '../middlewares/auth.middleware';
import { upload } from '../middlewares/upload.middleware';

const router = Router();
// --- TABLEROS ---
router.get('/', validateToken, getMyBoards);
router.post('/', validateToken, createBoard);
router.get('/:boardId', optionalAuth, getBoardById);
router.put('/:boardId', validateToken, updateBoard);
router.delete('/:boardId', validateToken, deleteBoard);
router.post('/:boardId/join', optionalAuth, joinBoardViaLink);

// --- POSITS ---
router.post('/:boardId/posits', optionalAuth, addPosit);
router.put('/:boardId/posits/:positId', optionalAuth, updatePosit);
router.post('/:boardId/swap', optionalAuth, swapPosits);
router.delete('/:boardId/posits/:positId', optionalAuth, deletePosit);
router.post('/:boardId/posits/:positId/upload', optionalAuth, upload.single('archivo'), uploadFileToPosit); // <--- NUEVO
router.delete('/:boardId/posits/:positId/file', optionalAuth, deleteFileFromPosit); // <--- NUEVO

// --- COMENTARIOS ---
router.post('/:boardId/posits/:positId/comments', optionalAuth, addComment);
router.delete('/:boardId/posits/:positId/comments/:commentId', optionalAuth, deleteComment); // <--- NUEVO (Borrar comentario)

// --- PARTICIPANTES ---
router.post('/:boardId/participants', validateToken, inviteUser);
router.put('/:boardId/participants/:userId', validateToken, updateParticipantRole); // <--- NUEVO (Cambiar rol)
router.delete('/:boardId/participants/:userIdToRemove', validateToken, removeParticipant); // <--- NUEVO (Expulsar/Salir)

// --- INVITACIONES ---
router.get('/invitations/me', validateToken, getMyInvitations);
router.post('/invitations/:invitationId/accept', validateToken, acceptInvitation);
router.post('/invitations/:invitationId/decline', validateToken, declineInvitation);

export default router;