// archivo: src/app/pages/dashboard/dashboard.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Mis Tableros 📋</h1>
      <button (click)="crearTablero()" style="padding: 10px; background: green; color: white; border: none; cursor: pointer;">
        + Nuevo Tablero
      </button>
      <hr>
      
      <div *ngIf="boards.length === 0">No tienes tableros. ¡Crea uno!</div>

      <div *ngFor="let board of boards" style="border:1px solid #ccc; margin: 10px 0; padding: 15px; border-radius: 5px;">
        <h3 style="margin: 0 0 10px 0;">
            <a [routerLink]="['/board', board._id]" style="color: #007bff; text-decoration: none;">
              {{ board.titulo }}
            </a>
        </h3>
        <small>Privacidad: {{ board.privacidad }} | ID: {{ board._id }}</small>
        <br><br>
        <button (click)="borrarTablero(board._id)" style="background: red; color: white; border: none; padding: 5px 10px; cursor: pointer;">
          Eliminar Tablero
        </button>
      </div>
      
      <br>
      <a routerLink="/login">Cerrar Sesión (Ir a Login)</a>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  api = inject(ApiService);
  boards: any[] = [];

  ngOnInit() { this.cargar(); }

  cargar() {
    this.api.getBoards().subscribe({
      next: (data) => this.boards = data,
      error: (err) => console.error("Error cargando tableros", err)
    });
  }

  crearTablero() {
    const titulo = prompt("Título del nuevo tablero:");
    if (!titulo) return;
    
    this.api.createBoard({ titulo, privacidad: 'privado' }).subscribe(() => {
      this.cargar();
    });
  }

  borrarTablero(id: string) {
    if(confirm("¿Seguro que quieres borrar este tablero?")) {
      this.api.deleteBoard(id).subscribe(() => this.cargar());
    }
  }
}