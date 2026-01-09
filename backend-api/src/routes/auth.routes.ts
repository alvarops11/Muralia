// file: src/routes/auth.routes.ts
import { Router } from 'express';
import { register, login } from '../controllers/auth.controller';

const router = Router();

// POST /api/auth/register - Registro de nuevo usuario
router.post('/register', register);

// POST /api/auth/login - Inicio de sesión
router.post('/login', login);

export default router;
