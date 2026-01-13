import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {
    private toastSubject = new Subject<ToastMessage>();
    toasts$ = this.toastSubject.asObservable();

    private dialogSubject = new Subject<any>();
    dialogs$ = this.dialogSubject.asObservable();

    private counter = 0;

    show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
        this.toastSubject.next({
            id: this.counter++,
            message,
            type,
            duration
        });
    }

    success(message: string) { this.show(message, 'success'); }
    error(message: string) { this.show(message, 'error'); }
    info(message: string) { this.show(message, 'info'); }
    warning(message: string) { this.show(message, 'warning'); }

    confirm(message: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.dialogSubject.next({
                type: 'confirm',
                message,
                resolve
            });
        });
    }

    prompt(message: string, defaultValue: string = ''): Promise<string | null> {
        return new Promise((resolve) => {
            this.dialogSubject.next({
                type: 'prompt',
                message,
                defaultValue,
                resolve
            });
        });
    }
}
