// file: src/middlewares/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';

// Definimos la estructura exacta de tu JWT
interface IJwtPayload {
  id_user: string;
  rol: string;
  centro: string;
  email: string;
  nombre?: string;
  iat?: number;
  exp?: number;
}

export const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  console.log(`[Auth] Validando token para: ${req.method} ${req.url}`);
  const authHeader = req.header('Authorization');
  // Esperamos formato: "Bearer <token>"
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  try {
    // 1. Verificar la firma del token
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as IJwtPayload;
    console.log(`[Auth] Token decodificado para user_id: ${decoded.id_user}`);

    // 2. Sincronización (Upsert)
    // Buscamos por _id (usando el id_user del token). 
    // Si existe, actualizamos email/rol/centro. Si no, lo crea.
    const user = await User.findByIdAndUpdate(
      decoded.id_user, // Tu _id es manual (string)
      {
        email: decoded.email,
        nombre: decoded.nombre,
        rol: decoded.rol,
        centro: decoded.centro
      },
      {
        new: true, // Devuelve el documento actualizado
        upsert: true, // CREA el documento si no existe
        setDefaultsOnInsert: true
      }
    );
    console.log(`[Auth] Usuario sincronizado en DB: ${user?.email}`);

    // 3. Adjuntar usuario a la request para usarlo en los controladores
    // El '!' le dice a TS que estamos seguros de que user existe gracias al upsert
    req.currentUser = user!;

    next();
  } catch (error) {
    console.error('Error de Auth:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};