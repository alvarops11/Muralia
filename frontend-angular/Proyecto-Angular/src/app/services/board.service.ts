import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  // Inyectamos el cliente HTTP moderno
  private http = inject(HttpClient);

  // La URL de tu backend (Asegúrate de que el puerto 3000 sea correcto)
  // NOTA: Si tu ruta en backend es diferente, cámbiala aquí.
  // Basado en tu server.ts, usaste el prefijo '/api/boards'
  private apiUrl = 'http://localhost:3000/';

  constructor() { }

  // Función para obtener los tableros
  getBoards(): Observable<any> {
    // Esto hace una petición GET a http://localhost:3000/api/boards
    return this.http.get(this.apiUrl ,{ responseType: 'text' });
  }
}