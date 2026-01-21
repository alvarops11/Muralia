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
    if (typeof u === 'object') {
      if (u.nombre) return u.nombre;
      if (u.email) return u.email.split('@')[0];
      return u._id ? (u._id + '').slice(0, 10) : 'Usuario';
    }
    const str = u + '';
    return str.includes('@') ? str.split('@')[0] : str.slice(0, 10);
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
