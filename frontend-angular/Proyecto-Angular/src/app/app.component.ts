import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common'; // Importante para usar JSON pipe
import { BoardService } from './services/board.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1> Prueba de Conexión </h1>
      
      <!-- Si hay error, lo mostramos en rojo -->
      @if (errorMessage) {
        <p style="color: red; font-weight: bold;">❌ Error: {{ errorMessage }}</p>
        <p>Verifica que tu backend esté corriendo en el puerto 3000.</p>
      }

      <!-- Si hay datos, los mostramos en verde -->
      @if (backendData) {
        <p style="color: green; font-weight: bold;">✅ ¡Conexión Exitosa!</p>
        <pre style="background: #f0f0f0; padding: 10px; border-radius: 5px;">{{ backendData | json }}</pre>
      } @else if (!errorMessage) {
        <p>Cargando datos del backend...</p>
      }
    </div>
  `,
  styles: []
})
export class AppComponent implements OnInit {
  // 1. Inyectamos el servicio que acabamos de crear
  private boardService = inject(BoardService);

  backendData: any = null;
  errorMessage: string = '';

  // 2. Al iniciar el componente (ngOnInit), llamamos al backend
  ngOnInit() {
    console.log('Intentando conectar con el backend...');
    
    this.boardService.getBoards().subscribe({
      next: (response) => {
        console.log('Respuesta recibida:', response);
        this.backendData = response;
      },
      error: (error) => {
        console.error('Error conectando:', error);
        this.errorMessage = error.message;
      }
    });
  }
}