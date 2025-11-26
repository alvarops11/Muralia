// file: src/types/validators.ts
import { z } from 'zod';

// Esquema para validar la creación de un tablero
export const createBoardSchema = z.object({
  _id: z.string().optional(), // Opcional si decides generarlo en backend
  titulo: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  descripcion: z.string().optional(),
  privacidad: z.enum(['publico', 'privado']).optional(),
  colorFondo: z.string().regex(/^#/, "Debe ser un color Hex válido").optional(),
  formato: z.enum(['kanban', 'lista']).optional()
});

// Esquema para añadir un Posit
export const createPositSchema = z.object({
  titulo: z.string().min(1),
  contenido: z.string().optional(),
  color: z.string().optional(),
  orden: z.number().optional().default(0) // Simplificado: el orden directo
});

// Esquema para ACTUALIZAR (Update)
export const updatePositSchema = z.object({
  titulo: z.string().min(1).optional(),
  contenido: z.string().optional(),
  color: z.string().optional(),
  orden: z.number().optional(), // Aquí recibimos el nuevo orden
  destacado: z.boolean().optional()
});

export const inviteUserSchema = z.object({
  email: z.string().email("Debe ser un email válido"),
  permiso: z.enum(['admin', 'editor', 'lector']).default('lector')
});

export const updateBoardSchema = z.object({
  titulo: z.string().min(3, "El título es muy corto").optional(),
  colorFondo: z.string().regex(/^#/, "Debe ser color Hex").optional(),
  privacidad: z.enum(['publico', 'privado']).optional()
});

// Validar comentario nuevo
export const addCommentSchema = z.object({
  contenido: z.string().min(1, "El comentario no puede estar vacío")
});