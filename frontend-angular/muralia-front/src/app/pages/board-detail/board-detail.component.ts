// archivo: src/app/pages/board-detail/board-detail.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';
import { RouterLink, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div style="padding: 20px; font-family: sans-serif;">
      
      <div *ngIf="loading">⏳ Cargando tablero...</div>
      <div *ngIf="error" style="color: red; font-weight: bold; padding: 20px; border: 1px solid red;">
        ❌ {{ error }}
        <br><br>
        <button (click)="cargar()">Reintentar</button>
      </div>

      <div *ngIf="board && !loading">
        <a routerLink="/boards" style="display:inline-block; margin-bottom: 20px;">← Volver al listado</a>
        
        <div [style.border-left]="'10px solid ' + (board.colorFondo || '#ccc')" style="padding-left: 15px;">
          <h1>{{ board.titulo }}</h1>
          <p>{{ board.descripcion }}</p>
          <button (click)="invitar()">📧 Invitar Usuario</button>
        </div>
        
        <div style="background: #f9f9f9; padding: 10px; margin: 20px 0; border-radius: 5px;">
          <strong>Participantes:</strong>
          <span *ngFor="let p of board.participantes" style="margin-left: 10px; background: #ddd; padding: 2px 8px; border-radius: 10px;">
             {{ p.usuario_id }} ({{ p.permiso }}) 
             <button (click)="echarlo(p.usuario_id)" style="border:none; background:none; color:red; cursor:pointer; font-weight:bold;">x</button>
          </span>
        </div>

        <hr>
        <button (click)="crearPosit()" style="font-size: 1.2em; padding: 10px 20px; background: #6f42c1; color: white; border: none; cursor:pointer;">
          + Añadir Nota
        </button>

        <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px;">
          
          <div *ngFor="let posit of board.posits" 
               [style.background]="posit.color || '#fff3cd'" 
               style="width: 250px; padding: 15px; border: 1px solid #999; box-shadow: 3px 3px 5px rgba(0,0,0,0.1); position: relative;">
            
            <button (click)="borrarPosit(posit.posit_id)" style="position: absolute; top: 5px; right: 5px; cursor: pointer;">🗑️</button>
            
            <h3 style="margin-top:0;">{{ posit.titulo }}</h3>
            <p>{{ posit.contenido }}</p>
            <small>Orden: {{ posit.posicion?.orden || 0 }}</small>
            
            <div style="margin-top: 10px;">
               <button (click)="mover(posit)">🔄 Cambiar Orden</button>
            </div>

            <div style="background: rgba(255,255,255,0.6); margin-top: 15px; padding: 5px; font-size: 0.9em;">
              <strong>Comentarios:</strong>
              <ul style="padding-left: 20px; margin: 5px 0;">
                  <li *ngFor="let c of posit.comentarios">
                      {{ c.contenido }} 
                      <a href="#" (click)="$event.preventDefault(); borrarComentario(posit.posit_id, c._id)" style="color:red; text-decoration:none;">[x]</a>
                  </li>
              </ul>
              <button (click)="comentar(posit.posit_id)" style="font-size: 0.8em;">+ Comentar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class BoardDetailComponent implements OnInit {
  api = inject(ApiService);
  route = inject(ActivatedRoute);

  board: any = null;
  id: string = '';
  loading = true;
  error = '';

  ngOnInit() { 
    const idUrl = this.route.snapshot.paramMap.get('id');
    if (idUrl) {
      this.id = idUrl;
      this.cargar();
    } else {
      this.error = 'No se encontró el ID del tablero en la URL';
      this.loading = false;
    }
  }

  cargar() {
    this.loading = true;
    this.error = '';
    this.api.getBoard(this.id).subscribe({
      next: (data) => {
        this.board = data;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.error = 'No se pudo conectar con el servidor. Asegúrate de que el Backend (puerto 3000) está encendido.';
        this.loading = false;
      }
    });
  }

  invitar() {
    const email = prompt("Email del usuario a invitar:");
    if(email) this.api.inviteUser(this.id, email).subscribe(() => this.cargar());
  }

  echarlo(uid: string) {
    if(confirm("¿Expulsar del tablero?")) this.api.removeParticipant(this.id, uid).subscribe(() => this.cargar());
  }

  crearPosit() {
    const titulo = prompt("Título de la nota:");
    if(!titulo) return;
    const contenido = prompt("Contenido:");
    
    this.api.createPosit(this.id, { titulo, contenido, color: 'lightblue', orden: 0 })
      .subscribe(() => this.cargar());
  }

  borrarPosit(pid: string) {
    if(confirm("¿Borrar nota?")) this.api.deletePosit(this.id, pid).subscribe(() => this.cargar());
  }

  mover(posit: any) {
    const ordenStr = prompt("Nuevo número de orden:", posit.posicion?.orden);
    if(ordenStr !== null) {
        this.api.updatePosit(this.id, posit.posit_id, { orden: parseInt(ordenStr) })
          .subscribe(() => this.cargar());
    }
  }

  comentar(pid: string) {
    const txt = prompt("Escribe tu comentario:");
    if(txt) this.api.addComment(this.id, pid, txt).subscribe(() => this.cargar());
  }

  borrarComentario(pid: string, cid: string) {
    if(confirm("¿Borrar comentario?")) 
        this.api.deleteComment(this.id, pid, cid).subscribe(() => this.cargar());
  }
}