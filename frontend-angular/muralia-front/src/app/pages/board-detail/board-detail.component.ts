import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../api.service';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule],
  template: `
    <div class="board-layout fade-in">
      
      <div *ngIf="cargando" class="loading-overlay"><div class="spinner"></div><p>Sincronizando...</p></div>
      <div *ngIf="error" class="error-banner">❌ {{ error }} <a routerLink="/boards" class="error-link">Salir</a></div>

      <div *ngIf="board && !cargando" class="board-wrapper">
        
        <aside class="sidebar">
          <a routerLink="/boards" class="back-link">← Mis Tableros</a>
          
          <div class="board-header-info">
            <h1 [style.color]="'#111'">{{ board.titulo }}</h1>
            <div class="meta-info">
              <span class="id-badge">{{ ($any(board._id) + '') | slice:0:6 }}...</span>
              <span class="status-badge">{{ board.privacidad }}</span>
            </div>
          </div>

          <div class="action-buttons">
            <button (click)="crearPosit()" class="btn btn-primary full-width">📝 Nueva Nota</button>
            <button (click)="invitar()" class="btn btn-secondary full-width">📧 Invitar Equipo</button>
          </div>

          <div class="participants-section">
            <h4>Equipo ({{ board.participantes.length }})</h4>
            <div class="participants-list">
              <div *ngFor="let p of board.participantes" class="participant-row">
                <div class="avatar">{{ ($any(p.usuario_id) + '') | slice:0:1 | uppercase }}</div>
                <div class="p-details">
                  <span class="p-id">{{ ($any(p.usuario_id) + '') | slice:0:10 }}</span>
                  <span class="p-role">{{ p.permiso }}</span>
                </div>
                <button (click)="echarlo(p.usuario_id)" class="btn-xs">✕</button>
              </div>
            </div>
          </div>
        </aside>

        <main class="kanban-area">
          
          <div class="posits-grid" 
               cdkDropList 
               cdkDropListOrientation="mixed"
               (cdkDropListDropped)="soltar($event)">
            
            <div *ngFor="let posit of board.posits" 
                 class="posit-card"
                 cdkDrag 
                 [style.background-color]="posit.color || '#fef3c7'">
              
              <div class="custom-placeholder" *cdkDragPlaceholder></div>

              <div class="posit-top-bar">
                <span class="drag-handle" cdkDragHandle>⣿</span>
                <span class="order-tag">#{{ posit.posicion?.orden }}</span>
                <button (click)="borrarPosit(posit.posit_id)" class="btn-icon delete-icon">🗑️</button>
              </div>

              <h3 class="posit-title">{{ posit.titulo }}</h3>
              <p class="posit-content">{{ posit.contenido }}</p>
              
              <div class="comments-box">
                <div *ngFor="let c of posit.comentarios" class="comment-item">
                  <span class="comment-text">{{ c.contenido }}</span>
                  <span (click)="borrarComentario(posit.posit_id, c._id)" class="delete-comment">×</span>
                </div>
                <button (click)="comentar(posit.posit_id)" class="add-comment-link">+ Comentar</button>
              </div>

            </div>
          </div>
        </main>
      </div>
    </div>
  `,
  styles: [`
    /* ESTILOS (Los mismos que antes) */
    .board-layout { height: 100vh; overflow: hidden; display: flex; font-family: 'Segoe UI', sans-serif; }
    .board-wrapper { display: flex; width: 100%; }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .loading-overlay { position: fixed; inset: 0; background: rgba(255,255,255,0.9); z-index: 50; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 1.2rem; color: #4f46e5; }
    .error-banner { background: #fee2e2; color: #b91c1c; padding: 20px; width: 100%; text-align: center; }
    .error-link { text-decoration: underline; font-weight: bold; margin-left: 10px; cursor: pointer; }
    .sidebar { width: 300px; background: white; border-right: 1px solid #e5e7eb; padding: 25px; display: flex; flex-direction: column; gap: 25px; flex-shrink: 0; box-shadow: 2px 0 10px rgba(0,0,0,0.02); z-index: 10; }
    .back-link { color: #6b7280; font-weight: 600; font-size: 0.9rem; text-decoration: none; display: flex; align-items: center; gap: 5px; }
    .board-header-info h1 { font-size: 1.8rem; margin: 0 0 10px 0; line-height: 1.1; }
    .meta-info { display: flex; gap: 10px; }
    .id-badge { background: #f3f4f6; font-family: monospace; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #6b7280; }
    .status-badge { background: #ecfdf5; color: #047857; padding: 2px 8px; border-radius: 99px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .action-buttons { display: flex; flex-direction: column; gap: 12px; }
    .full-width { width: 100%; }
    .btn { padding: 10px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer; transition: all 0.2s; }
    .btn-primary { background: #4f46e5; color: white; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.3); }
    .btn-secondary { background: white; border: 1px solid #d1d5db; color: #374151; }
    .participants-section h4 { text-transform: uppercase; color: #9ca3af; font-size: 0.75rem; letter-spacing: 0.05em; margin-bottom: 15px; }
    .participants-list { overflow-y: auto; max-height: 300px; }
    .participant-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; margin-bottom: 5px; transition: background 0.2s; }
    .participant-row:hover { background: #f3f4f6; }
    .avatar { width: 32px; height: 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem; }
    .p-details { flex: 1; display: flex; flex-direction: column; }
    .p-id { font-size: 0.85rem; font-weight: 500; color: #374151; }
    .p-role { font-size: 0.7rem; color: #6b7280; }
    .btn-xs { border: none; background: transparent; color: #9ca3af; cursor: pointer; font-size: 1rem; padding: 0 5px; }
    .kanban-area { flex: 1; background-color: #f3f4f6; background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 20px 20px; padding: 40px; overflow-y: auto; }
    .posits-grid { display: flex; flex-wrap: wrap; gap: 25px; align-items: flex-start; }
    .posit-card { width: 280px; min-height: 200px; padding: 20px; border-radius: 2px; box-shadow: 2px 4px 10px rgba(0,0,0,0.1); display: flex; flex-direction: column; position: relative; border-top: 1px solid rgba(255,255,255,0.6); background: #fef3c7; }
    .posit-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; opacity: 0.6; }
    .order-tag { font-family: monospace; font-weight: bold; font-size: 0.8rem; background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; }
    .btn-icon { background: none; border: none; cursor: pointer; transition: opacity 0.2s; font-size: 1rem; }
    .delete-icon:hover { color: #ef4444; opacity: 1; transform: scale(1.1); }
    .posit-title { margin: 0 0 10px 0; font-size: 1.2rem; color: #1f2937; line-height: 1.3; font-weight: 700; }
    .posit-content { font-size: 0.95rem; color: #4b5563; white-space: pre-wrap; line-height: 1.5; margin-bottom: 15px; flex: 1; }
    .comments-box { background: rgba(255,255,255,0.5); border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 8px; margin-top: auto; }
    .comment-item { background: white; padding: 6px 10px; border-radius: 6px; font-size: 0.85rem; box-shadow: 0 1px 2px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; }
    .delete-comment { color: #ef4444; font-weight: bold; cursor: pointer; padding: 0 5px; }
    .add-comment-link { background: none; border: none; color: #4f46e5; font-size: 0.8rem; font-weight: 600; cursor: pointer; text-align: left; padding: 0; margin-top: 5px; }

    /* DRAG & DROP STYLES */
    .drag-handle { cursor: grab; font-size: 1.2rem; color: #666; margin-right: 10px; }
    .drag-handle:active { cursor: grabbing; }
    .cdk-drag-preview { box-shadow: 0 20px 40px rgba(0,0,0,0.3); border-radius: 4px; opacity: 0.9; transform: rotate(3deg); }
    .custom-placeholder { background: rgba(0,0,0,0.05); border: 2px dashed rgba(0,0,0,0.2); min-height: 200px; border-radius: 4px; transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .posits-grid.cdk-drop-list-dragging .posit-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
  `]
})
export class BoardDetailComponent implements OnInit {
  @Input() id?: string; 
  api = inject(ApiService);
  cd = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);

  board: any = null;
  cargando = false;
  error = '';

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    const finalId = this.id || idUrl;
    if (finalId) { this.id = finalId; this.cargar(); } 
    else { this.error = "No se ha encontrado ID"; this.cd.detectChanges(); }
  }

  cargar() {
    if(!this.id) return;
    this.cargando = true;
    this.cd.detectChanges(); 
    this.api.getBoard(this.id).subscribe({
      next: (data) => { 
        data.posits.sort((a: any, b: any) => (a.posicion?.orden || 0) - (b.posicion?.orden || 0));
        this.board = data; 
        this.cargando = false; 
        this.cd.detectChanges(); 
      },
      error: (err) => { this.error = "Error cargando"; this.cargando = false; this.cd.detectChanges(); }
    });
  }

  soltar(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.board.posits, event.previousIndex, event.currentIndex);
    const posit = this.board.posits[event.currentIndex];
    const nuevoOrden = event.currentIndex;

    if(this.id) {
      this.api.updatePosit(this.id, posit.posit_id, { orden: nuevoOrden }).subscribe({
        next: () => console.log("Guardado"),
        error: () => { alert("Error guardando"); this.cargar(); }
      });
    }
  }

  invitar() { const email = prompt("✉️ Email:"); if(email && this.id) this.api.inviteUser(this.id, email).subscribe(() => this.cargar()); }
  echarlo(uid: string) { if(confirm("🛑 ¿Echar?")) this.api.removeParticipant(this.id!, uid).subscribe(() => this.cargar()); }
  crearPosit() { 
    if(!this.id) return; 
    const t = prompt("📝 Título:"); if(!t) return; 
    const c = prompt("Contenido:"); 
    const colores = ['#fef3c7', '#d1fae5', '#e0e7ff', '#fee2e2', '#f3f4f6'];
    const color = colores[Math.floor(Math.random() * colores.length)];
    this.api.createPosit(this.id, { titulo: t, contenido: c, color, orden: 0 }).subscribe(() => this.cargar()); 
  }
  borrarPosit(pid: string) { if(this.id && confirm("🗑️ ¿Borrar?")) this.api.deletePosit(this.id, pid).subscribe(() => this.cargar()); }
  comentar(pid: string) { const t = prompt("💬 Comentario:"); if(t && this.id) this.api.addComment(this.id, pid, t).subscribe(() => this.cargar()); }
  borrarComentario(pid: string, cid: string) { if(this.id) this.api.deleteComment(this.id, pid, cid).subscribe(() => this.cargar()); }
}