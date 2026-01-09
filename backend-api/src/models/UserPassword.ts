// file: src/models/UserPassword.ts
import mongoose, { Schema } from 'mongoose';

// Interfaz para la colección de contraseñas (1:1 con usuarios)
export interface IUserPassword {
    _id: string;  // Mismo _id que en la colección usuarios
    contrasena: string;
}

const UserPasswordSchema = new Schema<IUserPassword>({
    _id: { type: String, required: true },
    contrasena: { type: String, required: true }
}, {
    timestamps: false,
    versionKey: false,
    _id: false,
    collection: 'usuariosContrasena'
});

export default mongoose.model<IUserPassword>('UserPassword', UserPasswordSchema);
