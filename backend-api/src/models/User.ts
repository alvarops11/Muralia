// file: src/models/User.ts
import mongoose, { Schema } from 'mongoose';

// Interfaz del usuario (sin password - está en colección separada)
export interface IUser {
  _id: string;
  email: string;
  rol: string;
  centro: string | null;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  rol: { type: String, required: true },
  // Usamos Schema.Types.Mixed para permitir null y siempre incluir el campo
  centro: { type: Schema.Types.Mixed, default: null }
}, {
  timestamps: false,
  versionKey: false,
  _id: false,
  collection: 'usuarios'
});

export default mongoose.model<IUser>('User', UserSchema);