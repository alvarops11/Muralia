// file: src/models/User.ts
import mongoose, { Schema } from 'mongoose';

// CORRECCIÓN: Quitamos "extends Document"
// Definimos solo la estructura de los DATOS
export interface IUser {
  _id: string; 
  email: string;
  rol: string;
  centro?: string;
}

const UserSchema = new Schema<IUser>({
  _id: { type: String, required: true }, 
  email: { type: String, required: true, unique: true },
  rol: { type: String, required: true },
  centro: { type: String }
}, {
  timestamps: false, 
  versionKey: false,
  _id: false, // Importante: Le dice a Mongoose "no toques el _id, yo lo manejo"
  collection: 'usuarios'
});

export default mongoose.model<IUser>('User', UserSchema);