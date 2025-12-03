// archivo: src/app/api.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // URL de tu Backend (Asegúrate de que el puerto 3000 sea correcto)
  private apiUrl = 'https://lpn41v3w-3000.uks1.devtunnels.ms/api/boards'; 

  // --- TABLEROS ---
  getBoards() { return this.http.get<any[]>(this.apiUrl); }
  getBoard(id: string) { return this.http.get<any>(`${this.apiUrl}/${id}`); }
  createBoard(data: any) { return this.http.post(this.apiUrl, data); }
  deleteBoard(id: string) { return this.http.delete(`${this.apiUrl}/${id}`); }
  
  // --- POSITS ---
  createPosit(boardId: string, data: any) { return this.http.post(`${this.apiUrl}/${boardId}/posits`, data); }
  updatePosit(boardId: string, positId: string, data: any) { return this.http.put(`${this.apiUrl}/${boardId}/posits/${positId}`, data); }
  deletePosit(boardId: string, positId: string) { return this.http.delete(`${this.apiUrl}/${boardId}/posits/${positId}`); }

  // --- COMENTARIOS ---
  addComment(boardId: string, positId: string, contenido: string) { 
    return this.http.post(`${this.apiUrl}/${boardId}/posits/${positId}/comments`, { contenido }); 
  }
  deleteComment(boardId: string, positId: string, commentId: string) {
    return this.http.delete(`${this.apiUrl}/${boardId}/posits/${positId}/comments/${commentId}`);
  }

  // --- PARTICIPANTES ---
  inviteUser(boardId: string, email: string) {
    return this.http.post(`${this.apiUrl}/${boardId}/participants`, { email });
  }
  removeParticipant(boardId: string, userId: string) {
    return this.http.delete(`${this.apiUrl}/${boardId}/participants/${userId}`);
  }
}