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
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.3s ease;
    }
    .modal-card {
      background: white;
      border-radius: 20px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      overflow: hidden;
      animation: slideUp 0.3s ease;
    }
    .modal-header {
      background: linear-gradient(135deg, #6c5ce7, #5570f1);
      color: white;
      padding: 24px 30px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .modal-header h3 { 
      margin: 0; 
      font-size: 20px; 
      font-weight: 700;
      color: white;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .icon {
      font-size: 24px;
    }
    .modal-body { 
      padding: 30px 40px; 
    }
    .modal-body p {
      color: #4a5568;
      font-size: 15px;
      margin-bottom: 16px;
    }
    .modal-input {
      width: 100%;
      padding: 14px 16px;
      font-size: 15px;
      color: #2d3748;
      background-color: #f7fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      box-sizing: border-box;
      font-family: 'Roboto', sans-serif;
      transition: all 0.2s;
      outline: none;
    }
    .modal-input:focus { 
      background-color: white;
      border-color: #5570f1; 
      box-shadow: 0 0 0 3px rgba(85, 112, 241, 0.1);
    }
    .modal-input::placeholder {
      color: #a0aec0;
    }
    .modal-footer {
      padding: 0 40px 40px;
      display: flex;
      gap: 15px;
      justify-content: flex-end;
    }
    .btn { 
      padding: 14px 24px; 
      border-radius: 12px; 
      border: none; 
      cursor: pointer; 
      font-weight: 700;
      font-size: 15px;
      transition: all 0.2s;
    }
    .btn-primary { 
      background: linear-gradient(135deg, #6c5ce7, #5570f1); 
      color: white;
      box-shadow: 0 4px 12px rgba(85, 112, 241, 0.3);
    }
    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(85, 112, 241, 0.4);
    }
    .btn-secondary { 
      background: #edf2f7; 
      color: #4a5568;
    }
    .btn-secondary:hover {
      background: #e2e8f0;
      color: #2d3748;
    }

    @keyframes fadeIn { 
      from { opacity: 0; } 
      to { opacity: 1; } 
    }
    @keyframes slideUp { 
      from { transform: translateY(20px); opacity: 0; } 
      to { transform: translateY(0); opacity: 1; } 
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
      this.currentDialog.resolve(value);
      this.currentDialog = null;
    }
  }
}
