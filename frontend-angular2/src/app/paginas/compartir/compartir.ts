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

  @Output() onInvite = new EventEmitter<string>();
  @Output() onRemove = new EventEmitter<string>();

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
    return `${window.location.origin}/board/${this.boardId}`;
  }

  copyLink() {
    navigator.clipboard.writeText(this.shareLink);
    this.notify.success('¡Enlace copiado!');
  }

  invite() {
    if (this.newEmail.trim()) {
      this.onInvite.emit(this.newEmail.trim());
      this.newEmail = '';
    }
  }

  remove(uid: string) {
    this.onRemove.emit(uid);
  }
}
