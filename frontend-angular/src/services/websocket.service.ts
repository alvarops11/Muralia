import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;
  private readonly URL = environment.apiUrl + '/';

  constructor() {
    this.socket = io(this.URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true
    });
  }

  // --- GESTIÓN DE SALAS ---
  joinBoard(boardId: string) {
    this.socket.emit('entrar_tablero', boardId);
  }

  leaveBoard(boardId: string) {
    this.socket.emit('salir_tablero', boardId);
  }

  // --- DATA SYNC (Base de Datos) ---
  onUpdate(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('tablero_actualizado', (data) => subscriber.next(data));
      return () => this.socket.off('tablero_actualizado');
    });
  }

  // --- MOVIMIENTO EN TIEMPO REAL (Ghosts) ---

  // Enviar mis coordenadas
  emitDrag(boardId: string, positId: string, pos: { x: number, y: number }, usuario: string) {
    this.socket.emit('moviendo_posit', { boardId, positId, ...pos, usuario });
  }

  // Enviar que solté
  emitStopDrag(boardId: string, positId: string) {
    this.socket.emit('parar_posit', { boardId, positId });
  }

  // Escuchar a otros moviendo
  onDragMove(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('posit_moviendose', (data) => subscriber.next(data));
      return () => this.socket.off('posit_moviendose');
    });
  }

  // Escuchar cuando otros sueltan
  onDragStop(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('posit_parado', (data) => subscriber.next(data));
      return () => this.socket.off('posit_parado');
    });
  }

  // --- BLOQUEO DE EDICIÓN ---

  emitLock(boardId: string, positId: string, usuario: string) {
    this.socket.emit('bloquear_posit', { boardId, positId, usuario });
  }

  emitUnlock(boardId: string, positId: string) {
    this.socket.emit('desbloquear_posit', { boardId, positId });
  }

  onLock(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('posit_bloqueado', (data) => subscriber.next(data));
      return () => this.socket.off('posit_bloqueado');
    });
  }

  onUnlock(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('posit_desbloqueado', (data) => subscriber.next(data));
      return () => this.socket.off('posit_desbloqueado');
    });
  }

  onLockSync(): Observable<any> {
    return new Observable((subscriber) => {
      this.socket.on('estado_bloqueos', (data) => subscriber.next(data));
      return () => this.socket.off('estado_bloqueos');
    });
  }
}