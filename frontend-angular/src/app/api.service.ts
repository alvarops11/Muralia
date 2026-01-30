// archivo: src/app/api.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  // URL de tu Backend (configurado desde environment)
  private apiUrl = environment.apiUrl + '/api/boards';

  // --- TABLEROS ---
  getBoards() { return this.http.get<any[]>(this.apiUrl); }
  getBoard(id: string, guestId?: string | null) {
    const url = guestId ? `${this.apiUrl}/${id}?guestId=${guestId}` : `${this.apiUrl}/${id}`;
    return this.http.get<any>(url);
  }
  joinBoard(id: string, role: string, guestData?: { nombre: string, guestId: string }) {
    return this.http.post(`${this.apiUrl}/${id}/join`, { role, ...guestData });
  }
  createBoard(data: any) { return this.http.post(this.apiUrl, data); }
  deleteBoard(id: string) { return this.http.delete(`${this.apiUrl}/${id}`); }

  // --- POSITS ---
  createPosit(boardId: string, data: any) { return this.http.post(`${this.apiUrl}/${boardId}/posits`, data); }
  updatePosit(boardId: string, positId: string, data: any) {
    return this.http.put(`${this.apiUrl}/${boardId}/posits/${positId}`, data);
  }
  deletePosit(boardId: string, positId: string, data: any = {}) {
    return this.http.request('delete', `${this.apiUrl}/${boardId}/posits/${positId}`, { body: data });
  }
  uploadFile(boardId: string, positId: string, file: File) {
    const formData = new FormData();
    formData.append('archivo', file);
    return this.http.post(`${this.apiUrl}/${boardId}/posits/${positId}/upload`, formData);
  }
  deleteFile(boardId: string, positId: string, data: any = {}) {
    return this.http.request('delete', `${this.apiUrl}/${boardId}/posits/${positId}/file`, { body: data });
  }

  // --- COMENTARIOS ---
  addComment(boardId: string, positId: string, data: any) {
    return this.http.post(`${this.apiUrl}/${boardId}/posits/${positId}/comments`, data);
  }
  deleteComment(boardId: string, positId: string, commentId: string, data: any = {}) {
    return this.http.request('delete', `${this.apiUrl}/${boardId}/posits/${positId}/comments/${commentId}`, { body: data });
  }

  // --- PARTICIPANTES ---
  inviteUser(boardId: string, email: string, permiso: string = 'lector') {
    return this.http.post(`${this.apiUrl}/${boardId}/participants`, { email, permiso });
  }
  removeParticipant(boardId: string, userId: string) {
    return this.http.delete(`${this.apiUrl}/${boardId}/participants/${userId}`);
  }
  updateParticipantRole(boardId: string, userId: string, role: string) {
    return this.http.put(`${this.apiUrl}/${boardId}/participants/${userId}`, { role });
  }

  // --- INVITACIONES (NUEVO) ---
  getInvitations() {
    return this.http.get<any[]>(`${this.apiUrl}/invitations/me`);
  }
  acceptInvitation(invitationId: string) {
    return this.http.post(`${this.apiUrl}/invitations/${invitationId}/accept`, {});
  }
  declineInvitation(invitationId: string) {
    return this.http.post(`${this.apiUrl}/invitations/${invitationId}/decline`, {});
  }
}