// file: src/models/Board.ts
import mongoose, { Schema } from 'mongoose';

// --- Interfaces (Tipos TypeScript Planos) ---

interface IComentario {
  usuario_id: string;
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
  autor_id: string;
  fecha_creacion: Date;
  comentarios: IComentario[];
}

interface IParticipante {
  usuario_id: string;
  permiso: 'admin' | 'lector' | 'editor';
  fecha_incorporacion: Date;
}

// CORRECCIÓN: Quitamos "extends Document"
export interface IBoard {
  _id: string;
  titulo: string;
  descripcion: string;
  privacidad: 'publico' | 'privado';
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
  usuario_id: { type: String, ref: 'User', required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now }
}, { _id: false }); 

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
  autor_id: { type: String, ref: 'User', required: true },
  fecha_creacion: { type: Date, default: Date.now },
  comentarios: [ComentarioSchema]
}, { _id: false });

const ParticipanteSchema = new Schema({
  usuario_id: { type: String, ref: 'User', required: true },
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
    enum: ['publico', 'privado'], 
    default: 'privado' 
  },
  colorFondo: { type: String, default: '#FFFFFF' },
  formato: { type: String, default: 'kanban' },
  enlace_compartido: { type: String },
  participantes: [ParticipanteSchema],
  posits: [PositSchema]
}, {
  timestamps: { createdAt: 'fecha_creacion', updatedAt: 'fecha_modificacion' },
  _id: false, // Desactiva la generación automática de _id
  collection: 'tableros'
});

export default mongoose.model<IBoard>('Board', BoardSchema);