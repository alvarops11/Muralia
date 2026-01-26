import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-compartir',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './compartir.html',
  styleUrl: './compartir.css',
})
export class Compartir {
  private notify = inject(NotificationService);
  @Input() boardId: string = '';
  @Input() participantes: any[] = [];
  @Input() userRole: string = 'lector';
  selectedPermiso: 'admin' | 'editor' | 'lector' = 'lector';
  roleParaLink: 'lector' | 'editor' = 'lector';

  @Output() onInvite = new EventEmitter<{ email: string, permiso: string }>();
  @Output() onRemove = new EventEmitter<string>();
  @Output() onClose = new EventEmitter<void>();
  @Output() onRoleChange = new EventEmitter<{ userId: string, role: string }>();

  newEmail: string = '';

  getMemberName(u: any): string {
    if (!u) return 'Anónimo';

    // 1. Si es un string (Email o ID directo)
    if (typeof u === 'string') {
      const str = u.trim();
      if (str.includes('@')) return str.split('@')[0];
      if (str.startsWith('guest_')) return 'Invitado';
      return str.replace('usuario_', '').slice(0, 12);
    }

    // 2. Si es un objeto (Mural, Posit, Comentario, Participante o Usuario)
    if (typeof u === 'object') {
      // Prioridad 1: Nombramientos directos guardados
      if (u.nombre) return u.nombre;
      if (u.nombre_autor) return u.nombre_autor;

      // Prioridad 2: Usuario poblado (email)
      if (u.email) return u.email.split('@')[0];

      // Prioridad 3: Seguir rastro de IDs (autor_id o usuario_id)
      const subId = u.autor_id || u.usuario_id;
      if (subId && subId !== u) {
        return this.getMemberName(subId);
      }

      // Prioridad 4: Guest ID
      if (u.guest_id) return 'Invitado';

      // Fallback: ID del propio objeto
      const objId = u._id || u.posit_id;
      if (objId) return (objId + '').replace('usuario_', '').slice(0, 12);
    }

    return 'Anónimo';
  }

  get shareLink() {
    return `${window.location.origin}/board/${this.boardId}?invite=true&role=${this.roleParaLink}`;
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareLink);
    this.notify.success('¡Enlace copiado!');
  }

  invite() {
    if (this.userRole !== 'admin') {
      this.notify.error("Solo los administradores pueden invitar");
      return;
    }
    if (this.newEmail.trim()) {
      this.onInvite.emit({
        email: this.newEmail.trim(),
        permiso: this.selectedPermiso
      });
      this.newEmail = '';
    }
  }

  remove(uid: string) {
    this.onRemove.emit(uid);
  }
}
