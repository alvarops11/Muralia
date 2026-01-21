// file: src/models/Board.ts
import mongoose, { Schema } from 'mongoose';

// --- Interfaces (Tipos TypeScript Planos) ---

interface IComentario {
  _id?: string;
  usuario_id: string;
  nombre?: string; // Para invitados
  contenido: string;
  fecha: Date;
}

interface IPosit {
  posit_id: string;
  titulo: string;
  contenido: string;
  color: string;
  posicion: { x: number; y: number; orden: number };
  destacado: boolean;
  imagen?: string;
  archivoUrl?: string;
  archivoNombre?: string;
  autor_id?: string;    // Opcional para invitados
  nombre_autor?: string; // Nombre legible (email o pseudónimo)
  fecha_creacion: Date;
  comentarios: IComentario[];
}

interface IParticipante {
  usuario_id: string; // Para usuarios registrados (ref)
  guest_id?: string;  // Para invitados anónimos
  nombre?: string;    // Nombre para mostrar
  permiso: 'admin' | 'lector' | 'editor';
  fecha_incorporacion: Date;
}

// CORRECCIÓN: Quitamos "extends Document"
export interface IBoard {
  _id: string;
  titulo: string;
  descripcion: string;
  privacidad: 'publico' | 'privado' | 'enlace-abierto';
  colorFondo: string;
  formato: 'kanban' | 'lista';
  enlace_compartido?: string;
  participantes: IParticipante[];
  posits: IPosit[];
  // Campos de timestamps automáticos (opcional declararlos aquí)
  fecha_creacion?: Date;
  fecha_modificacion?: Date;
}

// --- Schemas ---

const ComentarioSchema = new Schema({
  usuario_id: { type: String, ref: 'User' }, // Opcional para invitados
  nombre: { type: String },                 // Nombre de invitado si aplica
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
});

const PositSchema = new Schema({
  posit_id: { type: String, required: true },
  titulo: { type: String, required: true },
  contenido: { type: String },
  color: { type: String, default: '#yellow' },
  posicion: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    orden: { type: Number, default: 0 }
  },
  destacado: { type: Boolean, default: false },
  imagen: { type: String },
  archivoUrl: { type: String },
  archivoNombre: { type: String },
  autor_id: { type: String, ref: 'User' }, // Opcional
  nombre_autor: { type: String },         // Para mostrar quién lo hizo sin populate
  fecha_creacion: { type: Date, default: Date.now },
  comentarios: [ComentarioSchema]
}, { _id: false });

const ParticipanteSchema = new Schema({
  usuario_id: { type: String, ref: 'User' }, // Opcional para invitados
  guest_id: { type: String },               // Requerido para invitados
  nombre: { type: String },
  permiso: {
    type: String,
    enum: ['admin', 'lector', 'editor'],
    default: 'lector'
  },
  fecha_incorporacion: { type: Date, default: Date.now }
}, { _id: false });

// --- Schema Principal ---

const BoardSchema = new Schema<IBoard>({
  _id: { type: String, required: true },
  titulo: { type: String, required: true },
  descripcion: { type: String },
  privacidad: {
    type: String,
    enum: ['publico', 'privado', 'enlace-abierto'],
    default: 'privado'
  },
  colorFondo: { type: String, default: '#FFFFFF' },
  formato: { type: String, default: 'kanban' },
  enlace_compartido: { type: String },
  participantes: [ParticipanteSchema],
  posits: [PositSchema]
}, {
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_modificacion' },
  collection: 'tableros'
});

export default mongoose.model<IBoard>('Board', BoardSchema);