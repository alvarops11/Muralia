// file: src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface IJwtPayload {
  id_user: string;
  rol: string;
  centro: string;
  email: string;
}

export const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload;
    const user = await User.findByIdAndUpdate(
      decoded.id_user,
      { email: decoded.email, rol: decoded.rol, centro: decoded.centro },
      { new: true, upsert: true }
    );
    req.currentUser = user!;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido' });
  }
};

// NUEVO: Middleware opcional que no bloquea si no hay token
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.header('Authorization');
  const token = authHeader?.split(' ')[1];

  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload;
    const user = await User.findById(decoded.id_user);
    if (user) req.currentUser = user;
    next();
  } catch (error) {
    // Si el token falla, seguimos como anónimo
    next();
  }
};