// file: src/models/Invitation.ts
import mongoose, { Schema } from 'mongoose';

export interface IInvitation {
    board_id: string;
    sender_id: string;
    receiver_id: string;
    permiso: 'admin' | 'lector' | 'editor';
    status: 'pending' | 'accepted' | 'declined';
    fecha: Date;
}

const InvitationSchema = new Schema<IInvitation>({
    board_id: { type: String, ref: 'Board', required: true },
    sender_id: { type: String, ref: 'User', required: true },
    receiver_id: { type: String, ref: 'User', required: true },
    permiso: {
        type: String,
        enum: ['admin', 'lector', 'editor'],
        default: 'lector'
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'declined'],
        default: 'pending'
    },
    fecha: { type: Date, default: Date.now }
}, {
    timestamps: { createdAt: 'fecha', updatedAt: false },
    collection: 'invitaciones'
});

// Índice compuesto para evitar invitaciones duplicadas pendientes para el mismo usuario y tablero
InvitationSchema.index({ board_id: 1, receiver_id: 1, status: 1 }, {
    unique: true,
    partialFilterExpression: { status: 'pending' }
});

export default mongoose.model<IInvitation>('Invitation', InvitationSchema);
