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
    <div class="modal-overlay" *ngIf="currentDialog">
      <div class="modal-card">
        <div class="modal-header">
           <span class="icon">{{ currentDialog.type === 'confirm' ? '❓' : '✏️' }}</span>
           <h3>{{ currentDialog.type === 'confirm' ? 'Confirmación' : '¡Escribe algo guay!' }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ currentDialog.message }}</p>
          <input *ngIf="currentDialog.type === 'prompt'" 
                 type="text" 
                 class="modal-input" 
                 [(ngModel)]="inputValue"
                 (keyup.enter)="resolve(inputValue)"
                 autofocus>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" (click)="resolve(null)">Cancelar</button>
          <button class="btn btn-primary" (click)="resolve(currentDialog.type === 'confirm' ? true : inputValue)">
            Aceptar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      backdrop-filter: blur(4px);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.2s ease-out;
    }
    .modal-card {
      background: white;
      width: 100%;
      max-width: 400px;
      border-radius: 12px;
      box-shadow: 0 15px 35px rgba(0,0,0,0.3);
      overflow: hidden;
      animation: scaleUp 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .modal-header {
      padding: 15px 20px;
      background: #5c6bc0;
      color: white;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-header h3 { margin: 0; font-size: 18px; }
    .modal-body { padding: 20px; }
    .modal-input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      margin-top: 10px;
      outline: none;
    }
    .modal-input:focus { border-color: #5c6bc0; box-shadow: 0 0 0 2px rgba(92,107,192,0.2); }
    .modal-footer {
      padding: 15px 20px;
      background: #f9fafb;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn { padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer; font-weight: 500; }
    .btn-primary { background: #5c6bc0; color: white; }
    .btn-secondary { background: #e5e7eb; color: #374151; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
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
      this.currentDialog.resolve(value);
      this.currentDialog = null;
    }
  }
}
