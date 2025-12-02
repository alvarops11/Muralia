import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="container fade-in">
      <header class="dashboard-header">
        <h1>Mis Tableros</h1>
        <button (click)="crearTablero()" class="btn btn-primary">+ Nuevo Tablero</button>
      </header>

      <div *ngIf="cargando" class="loading">⏳ Sincronizando tu espacio...</div>
      
      <div *ngIf="!cargando && boards.length === 0" class="empty-state">
        <p>No tienes tableros aún. ¡Crea el primero!</p>
      </div>

      <div class="board-grid">
        <div *ngFor="let board of boards" class="board-card">
          <div class="card-content">
            <a [routerLink]="['/board', board._id]">
              <h3>{{ board.titulo }}</h3>
              <span class="badge" [class.badge-private]="board.privacidad === 'privado'">
                {{ board.privacidad }}
              </span>
            </a>
          </div>
          <div class="card-footer">
            <small class="id-text">ID: {{ board._id | slice:0:8 }}...</small>
            <button (click)="borrarTablero(board._id)" class="btn btn-ghost" title="Eliminar tablero">🗑️</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .fade-in { animation: fadeIn 0.4s ease-out; }
    @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

    .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; margin-top: 20px; }
    .loading, .empty-state { text-align: center; color: #6b7280; margin-top: 40px; font-size: 1.1rem; }

    /* BOTONES */
    .btn { padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #4f46e5; color: white; }
    .btn-primary:hover { background: #4338ca; transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: #9ca3af; font-size: 1.2rem; padding: 4px 8px; }
    .btn-ghost:hover { color: #ef4444; background: #fee2e2; border-radius: 4px; }

    /* GRID */
    .board-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 25px; }
    
    /* TARJETA */
    .board-card { 
      background: white; border-radius: 12px; 
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); 
      transition: transform 0.2s, box-shadow 0.2s; 
      display: flex; flex-direction: column; justify-content: space-between; 
      overflow: hidden; border: 1px solid #f3f4f6;
    }
    .board-card:hover { transform: translateY(-4px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border-color: #c7d2fe; }
    
    .card-content { padding: 25px; cursor: pointer; }
    .card-content a { text-decoration: none; color: inherit; display: block; }
    .card-content h3 { margin: 0 0 10px 0; color: #1f2937; font-size: 1.25rem; }
    
    .badge { background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 99px; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
    .badge-private { background: #fee2e2; color: #991b1b; }

    .card-footer { background: #f9fafb; padding: 12px 25px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f3f4f6; }
    .id-text { color: #9ca3af; font-family: monospace; font-size: 0.85rem; }
  `]
})
export class DashboardComponent implements OnInit {
  api = inject(ApiService);
  cd = inject(ChangeDetectorRef);
  
  boards: any[] = [];
  cargando = true;

  ngOnInit() { 
    this.cargar(); 
  }

  cargar() {
    this.cargando = true;
    this.api.getBoards().subscribe({
      next: (data) => {
        this.boards = data;
        this.cargando = false;
        this.cd.detectChanges(); // Forzamos actualización visual
      },
      error: (err) => {
        console.error(err);
        this.cargando = false;
        this.cd.detectChanges();
      }
    });
  }

  crearTablero() {
    const titulo = prompt("Título del nuevo tablero:");
    if (!titulo) return;
    this.api.createBoard({ titulo, privacidad: 'privado' }).subscribe(() => this.cargar());
  }

  borrarTablero(id: string) {
    if(confirm("¿Seguro que quieres eliminar este tablero?")) {
      this.api.deleteBoard(id).subscribe(() => this.cargar());
    }
  }
}