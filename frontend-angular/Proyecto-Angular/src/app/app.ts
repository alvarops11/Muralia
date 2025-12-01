import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { BoardService } from './services/board.service'; // Asegúrate de que esta ruta sea correcta

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  // Ponemos el HTML aquí dentro (template) para no depender de archivos externos
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1> Prueba de Conexión (Desde app.ts) </h1>
      
      @if (errorMessage) {
        <p style="color: red; font-weight: bold;">❌ Error: {{ errorMessage }}</p>
      }

      @if (backendData) {
        <p style="color: green; font-weight: bold;">✅ ¡Conexión Exitosa!</p>
        <pre style="background: #f0f0f0; padding: 10px;">{{ backendData | json }}</pre>
      } @else if (!errorMessage) {
        <p>Cargando datos del backend...</p>
      }
    </div>
  `,
  styles: []
})
// IMPORTANTE: Aquí la clase se llama 'App' porque así la importas en tu main.ts
export class App implements OnInit {
  private boardService = inject(BoardService);

  backendData: any = null;
  errorMessage: string = '';

  ngOnInit() {
    console.log('Componente App iniciado');
    this.boardService.getBoards().subscribe({
      next: (response) => {
        this.backendData = response;
      },
      error: (error) => {
        this.errorMessage = error.message;
      }
    });
  }
}