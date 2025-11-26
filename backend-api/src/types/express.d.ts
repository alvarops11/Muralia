// file: src/types/express.d.ts
import { IUser } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      currentUser?: IUser; // Aquí guardaremos el usuario completo de la DB
    }
  }
}