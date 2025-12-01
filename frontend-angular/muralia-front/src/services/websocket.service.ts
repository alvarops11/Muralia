import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: Socket;
  private readonly URL = 'http://localhost:3000'; 

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
}