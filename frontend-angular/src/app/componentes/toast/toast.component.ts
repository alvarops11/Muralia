import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, ToastMessage } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-toast',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="toast-container">
      <div *ngFor="let toast of toasts" 
           class="toast-item" 
           [class]="toast.type"
           (click)="removeToast(toast.id)">
        <span class="toast-icon">{{ getIcon(toast.type) }}</span>
        <span class="toast-message">{{ toast.message }}</span>
        <span class="toast-close">×</span>
      </div>
    </div>
  `,
    styles: [`
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    }
    .toast-item {
      pointer-events: auto;
      min-width: 250px;
      padding: 12px 20px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      color: #333;
      font-size: 14px;
      cursor: pointer;
      animation: slideIn 0.3s ease-out forwards;
      border-left: 4px solid #ccc;
    }
    .toast-item.success { border-left-color: #10b981; }
    .toast-item.error { border-left-color: #ef4444; }
    .toast-item.info { border-left-color: #3b82f6; }
    .toast-item.warning { border-left-color: #f59e0b; }

    .toast-icon { font-size: 18px; }
    .toast-message { flex: 1; font-weight: 500; }
    .toast-close { color: #aaa; font-size: 18px; }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
    private notify = inject(NotificationService);
    toasts: ToastMessage[] = [];
    private sub?: Subscription;

    ngOnInit() {
        this.sub = this.notify.toasts$.subscribe(toast => {
            this.toasts.push(toast);
            if (toast.duration !== 0) {
                setTimeout(() => this.removeToast(toast.id), toast.duration || 3000);
            }
        });
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }

    removeToast(id: number) {
        this.toasts = this.toasts.filter(t => t.id !== id);
    }

    getIcon(type: string) {
        switch (type) {
            case 'success': return '✅';
            case 'error': return '❌';
            case 'warning': return '⚠️';
            default: return 'ℹ️';
        }
    }
}
