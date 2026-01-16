import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" *ngIf="currentDialog" (click)="resolve(null)">
      <div class="modal-card" [class.destructive]="isDestructive()" [class.prompt-dialog]="currentDialog.type === 'prompt'" (click)="$event.stopPropagation()">
        <div class="modal-header" [class.header-destructive]="isDestructive()">
          <div class="icon-container">
            <span class="icon">{{ getIcon() }}</span>
          </div>
          <h3>{{ getTitle() }}</h3>
        </div>
        <div class="modal-body">
          <p class="message-text">{{ getCleanMessage() }}</p>
          <textarea *ngIf="currentDialog.type === 'prompt'" 
                 class="modal-textarea" 
                 [(ngModel)]="inputValue"
                 (keyup.enter.ctrl)="resolve(inputValue)"
                 placeholder="Escribe tu comentario aquí..."
                 rows="4"
                 autofocus></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="resolve(null)">
            <span *ngIf="currentDialog.type === 'confirm'">Cancelar</span>
            <span *ngIf="currentDialog.type === 'prompt'">Cancelar</span>
          </button>
          <button class="btn btn-primary" [class.btn-destructive]="isDestructive()" (click)="resolve(currentDialog.type === 'confirm' ? true : inputValue)">
            <span *ngIf="currentDialog.type === 'confirm'">Confirmar</span>
            <span *ngIf="currentDialog.type === 'prompt'">Enviar</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.25s ease;
      padding: 20px;
    }
    .modal-card {
      background: white;
      border-radius: 24px;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      animation: slideUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      transform-origin: center;
    }
    .modal-card.destructive {
      border-top: 4px solid #ef4444;
    }
    .modal-card.prompt-dialog {
      border-top: 4px solid #5570f1;
    }
    .modal-header {
      background: linear-gradient(135deg, #6c5ce7, #5570f1);
      color: white;
      padding: 28px 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .modal-header.header-destructive {
      background: linear-gradient(135deg, #ef4444, #dc2626);
    }
    .icon-container {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(10px);
      flex-shrink: 0;
    }
    .icon {
      font-size: 28px;
      line-height: 1;
    }
    .modal-header h3 { 
      margin: 0; 
      font-size: 22px; 
      font-weight: 800;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      letter-spacing: -0.3px;
    }
    .modal-body { 
      padding: 32px 32px 24px; 
    }
    .message-text {
      color: #374151;
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 24px;
      font-weight: 500;
    }
    .modal-textarea {
      width: 100%;
      padding: 16px 18px;
      font-size: 15px;
      color: #2d3748;
      background-color: #f9fafb;
      border: 2px solid #e5e7eb;
      border-radius: 14px;
      box-sizing: border-box;
      font-family: 'Roboto', sans-serif;
      transition: all 0.2s;
      outline: none;
      resize: vertical;
      min-height: 100px;
    }
    .modal-textarea:focus { 
      background-color: white;
      border-color: #5570f1; 
      box-shadow: 0 0 0 4px rgba(85, 112, 241, 0.1);
    }
    .modal-textarea::placeholder {
      color: #9ca3af;
    }
    .modal-footer {
      padding: 0 32px 28px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .btn { 
      padding: 14px 28px; 
      border-radius: 12px; 
      border: none; 
      cursor: pointer; 
      font-weight: 700;
      font-size: 15px;
      transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      min-width: 100px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .btn-primary { 
      background: linear-gradient(135deg, #6c5ce7, #5570f1); 
      color: white;
      box-shadow: 0 4px 12px rgba(85, 112, 241, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(85, 112, 241, 0.4);
    }
    .btn-primary:active {
      transform: translateY(0);
    }
    .btn-destructive {
      background: linear-gradient(135deg, #ef4444, #dc2626) !important;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important;
    }
    .btn-destructive:hover {
      box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4) !important;
    }
    .btn-secondary { 
      background: #f3f4f6; 
      color: #6b7280;
    }
    .btn-secondary:hover {
      background: #e5e7eb;
      color: #374151;
    }

    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    @keyframes slideUp { 
      from { 
        transform: translateY(30px) scale(0.95); 
        opacity: 0; 
      } 
      to { 
        transform: translateY(0) scale(1); 
        opacity: 1; 
      } 
    }
  `]
})
export class DialogComponent implements OnInit, OnDestroy {
  private notify = inject(NotificationService);
  currentDialog: any = null;
  inputValue = '';
  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.notify.dialogs$.subscribe(dialog => {
      this.currentDialog = dialog;
      this.inputValue = dialog.defaultValue || '';
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  resolve(value: any) {
    if (this.currentDialog) {
      // Para prompts, solo resolver si hay valor o si es null (cancelar)
      if (this.currentDialog.type === 'prompt' && value === '') {
        return; // No permitir enviar vacío
      }
      this.currentDialog.resolve(value);
      this.currentDialog = null;
      this.inputValue = '';
    }
  }

  isDestructive(): boolean {
    if (!this.currentDialog) return false;
    const msg = this.currentDialog.message.toLowerCase();
    return msg.includes('borrar') || msg.includes('eliminar') || msg.includes('🗑️');
  }

  getIcon(): string {
    if (!this.currentDialog) return '❓';
    if (this.currentDialog.type === 'prompt') return '💬';
    if (this.isDestructive()) return '⚠️';
    return '❓';
  }

  getTitle(): string {
    if (!this.currentDialog) return 'Confirmación';
    if (this.currentDialog.type === 'prompt') return 'Nuevo Comentario';
    if (this.isDestructive()) return 'Confirmar Acción';
    return 'Confirmación';
  }

  getCleanMessage(): string {
    if (!this.currentDialog) return '';
    // Remover solo emojis y símbolos especiales, pero preservar letras con tildes
    return this.currentDialog.message.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
  }
}
