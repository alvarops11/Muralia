import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DragDropModule, CdkDragDrop, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription, Subject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

@Component({
  selector: 'app-board-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule, FormsModule],
  template: `
    <!-- Modal Overlay -->
    <div *ngIf="mostrarModal" class="modal-overlay" (click)="cerrarModal()">
      <div class="modal-popup" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h2>✏️ Nuevo Post-it</h2>
        </div>
        
        <div class="modal-body">
          <label class="form-label">Contenido *</label>
          <textarea 
            [(ngModel)]="nuevoPosit.contenido" 
            class="form-textarea"
            placeholder="Escribe tu idea, nota o comentario..."
            rows="6"
          ></textarea>
          
          <label class="form-label">Color del Post-it</label>
          <div class="color-picker">
            <div 
              *ngFor="let c of coloresDisponibles" 
              class="color-option"
              [class.selected]="nuevoPosit.color === c"
              [style.background-color]="c"
              (click)="seleccionarColor(c)"
            ></div>
          </div>
          
          <label class="form-label attachment-label">
            <span>🔗 Adjuntar archivo</span>
          </label>
          <button class="file-button">Seleccionar archivo</button>
        </div>
        
        <div class="modal-footer">
          <button class="btn-save" (click)="guardarPosit()">Guardar</button>
          <button class="btn-cancel" (click)="cerrarModal()">Cancelar</button>
        </div>
      </div>
    </div>

    <div class="board-layout fade-in">
      
      <div class="ghost-layer">
        <div *ngFor="let ghost of ghosts | keyvalue" 
             class="ghost-posit"
             [style.transform]="'translate3d(' + ghost.value.x + 'px, ' + ghost.value.y + 'px, 0)'"
             [style.background-color]="ghost.value.color">
          <div class="ghost-user-badge">👤 {{ ghost.value.usuario || '?' }}</div>
          <strong>{{ ghost.value.titulo }}</strong>
        </div>
      </div>

      <div *ngIf="cargando" class="loading-overlay"><div class="spinner"></div><p>Sincronizando...</p></div>
      
      <div *ngIf="error" class="error-banner">❌ {{ error }} <a routerLink="/boards" class="error-link">Salir</a></div>

      <div *ngIf="board" class="board-wrapper"> 
        
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
                 (cdkDragMoved)="alMoverDrag($event, posit)"
                 (cdkDragEnded)="alSoltarDrag(posit)"
                 [style.background-color]="posit.color || '#fef3c7'"
                 [class.being-moved-remote]="ghosts[posit.posit_id]"> <div class="custom-placeholder" *cdkDragPlaceholder></div>

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
    /* --- ESTILOS DE GHOSTS (NUEVO) --- */
    .ghost-layer { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 9999; overflow: hidden; }
    
    .ghost-posit {
      position: absolute; top:0; left:0;
      width: 280px; height: 200px; padding: 20px;
      box-shadow: 0 15px 30px rgba(0,0,0,0.4);
      opacity: 0.85; border: 2px dashed #4f46e5;
      border-radius: 4px; display: flex; flex-direction: column;
      will-change: transform; 
      background: white; /* Fallback */
    }
    
    .ghost-user-badge {
      position: absolute; top: -12px; right: -10px;
      background: #4f46e5; color: white; padding: 4px 10px;
      border-radius: 12px; font-size: 0.8rem; font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    /* Clase para ocultar el posit original si alguien más lo está moviendo */
    .being-moved-remote { opacity: 0.3; filter: grayscale(1); transition: opacity 0.3s; }

    /* --- ESTILOS ORIGINALES --- */
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
    .drag-handle { cursor: grab; font-size: 1.2rem; color: #666; margin-right: 10px; }
    .drag-handle:active { cursor: grabbing; }
    .cdk-drag-preview { box-shadow: 0 20px 40px rgba(0,0,0,0.3); border-radius: 4px; opacity: 0.9; transform: rotate(3deg); }
    .custom-placeholder { background: rgba(0,0,0,0.05); border: 2px dashed rgba(0,0,0,0.2); min-height: 200px; border-radius: 4px; transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .cdk-drag-animating { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    .posits-grid.cdk-drop-list-dragging .posit-card:not(.cdk-drag-placeholder) { transition: transform 250ms cubic-bezier(0, 0, 0.2, 1); }
    
    /* --- MODAL STYLES --- */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.2s; }
    .modal-popup { background: white; border-radius: 8px; width: 90%; max-width: 600px; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); overflow: hidden; }
    .modal-header { background: #5B6ED9; color: white; padding: 20px 30px; }
    .modal-header h2 { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .modal-body { padding: 30px; }
    .form-label { display: block; font-size: 1rem; font-weight: 500; color: #111; margin-bottom: 10px; }
    .attachment-label { margin-top: 20px; }
    .form-textarea { width: 100%; padding: 15px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; font-family: inherit; resize: vertical; background: #f9fafb; }
    .form-textarea::placeholder { color: #9ca3af; }
    .color-picker { display: flex; gap: 15px; margin-bottom: 20px; }
    .color-option { width: 50px; height: 50px; border-radius: 8px; cursor: pointer; border: 3px solid transparent; transition: all 0.2s; }
    .color-option:hover { transform: scale(1.1); }
    .color-option.selected { border-color: #4f46e5; box-shadow: 0 0 0 2px white, 0 0 0 4px #4f46e5; }
    .file-button { width: 100%; padding: 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.9rem; color: #6b7280; cursor: pointer; text-align: left; }
    .file-button:hover { background: #e5e7eb; }
    .modal-footer { padding: 20px 30px; display: flex; gap: 15px; }
    .btn-save { flex: 1; padding: 12px; background: #5B6ED9; color: white; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
    .btn-save:hover { background: #4c5ec4; }
    .btn-cancel { flex: 1; padding: 12px; background: #e5e7eb; color: #374151; border: none; border-radius: 6px; font-weight: 600; font-size: 1rem; cursor: pointer; transition: background 0.2s; }
    .btn-cancel:hover { background: #d1d5db; }
  `]
})
export class BoardDetailComponent implements OnInit, OnDestroy {
  @Input() id?: string;

  api = inject(ApiService);
  cd = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  wsService = inject(WebsocketService);

  board: any = null;
  cargando = false;
  error = '';

  // Modal state
  mostrarModal = false;
  nuevoPosit = { contenido: '', color: '#fef3c7' };
  coloresDisponibles = ['#fef3c7', '#a5f3fc', '#fbcfe8', '#bbf7d0', '#fed7aa'];

  // -- Control de Sockets y Ghosts --
  wsSubscription?: Subscription;
  private subs: Subscription[] = [];

  // Diccionario para guardar los "fantasmas" (posits movidos por otros)
  ghosts: { [key: string]: any } = {};

  // Subject para controlar la emisión de eventos de drag (Throttling)
  private dragSubject = new Subject<any>();

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    const finalId = this.id || idUrl;

    if (finalId) {
      this.id = finalId;

      // 1. Carga inicial
      this.cargar();

      // 2. Unirse a la sala de Socket.io
      this.wsService.joinBoard(this.id);

      // 3. Suscribirse a cambios en DB (Sync)
      this.subs.push(
        this.wsService.onUpdate().subscribe((data) => {
          console.log('🔄 Update DB:', data);
          this.cargar(true); // Recarga silenciosa
        })
      );

      // 4. Suscribirse a movimientos de otros (Ghosts)
      this.subs.push(
        this.wsService.onDragMove().subscribe((data) => {
          // Buscamos el original para copiar color/título
          const original = this.board?.posits.find((p: any) => p.posit_id === data.positId);
          if (original) {
            this.ghosts[data.positId] = {
              x: data.x,
              y: data.y,
              usuario: data.usuario,
              color: original.color,
              titulo: original.titulo
            };
            this.cd.detectChanges();
          }
        })
      );

      // 5. Borrar fantasma cuando el otro usuario suelta
      this.subs.push(
        this.wsService.onDragStop().subscribe((data) => {
          delete this.ghosts[data.positId];
          this.cd.detectChanges();
        })
      );

      // 6. Configurar Throttling para mis movimientos (máx 1 envío cada 30ms)
      this.subs.push(
        this.dragSubject.pipe(throttleTime(30)).subscribe((pos) => {
          // 'Yo' es un placeholder. Lo ideal es usar tu AuthService para poner tu nombre real
          this.wsService.emitDrag(this.id!, pos.positId, { x: pos.x, y: pos.y }, 'Yo');
        })
      );

    } else {
      this.error = "No se ha encontrado ID";
      this.cd.detectChanges();
    }
  }

  ngOnDestroy() {
    if (this.id) {
      this.wsService.leaveBoard(this.id);
    }
    // Desuscribirse de todo para evitar memory leaks
    this.subs.forEach(s => s.unsubscribe());
    this.wsSubscription?.unsubscribe();
  }

  cargar(silent = false) {
    if (!this.id) return;

    if (!silent) {
      this.cargando = true;
      this.cd.detectChanges();
    }

    this.api.getBoard(this.id).subscribe({
      next: (data) => {
        data.posits.sort((a: any, b: any) => (a.posicion?.orden || 0) - (b.posicion?.orden || 0));
        this.board = data;

        this.cargando = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        if (!silent) {
          this.error = "Error cargando";
          this.cargando = false;
        }
        this.cd.detectChanges();
      }
    });
  }

  // --- EVENTOS DRAG LOCALES ---

  // Se dispara mientras arrastro (Angular CDK)
  alMoverDrag(event: CdkDragMove, posit: any) {
    // Obtenemos coordenadas absolutas del ratón
    const { x, y } = event.pointerPosition;
    // Emitimos al Subject (que controla la frecuencia de envío)
    this.dragSubject.next({
      positId: posit.posit_id,
      x: x - 20, // Ajuste visual para el cursor
      y: y - 20
    });
  }

  // Se dispara al soltar (antes de guardar)
  alSoltarDrag(posit: any) {
    if (this.id) this.wsService.emitStopDrag(this.id, posit.posit_id);
  }

  // Se dispara al completar el drop (Guardar en BD)
  soltar(event: CdkDragDrop<any[]>) {
    moveItemInArray(this.board.posits, event.previousIndex, event.currentIndex);

    const posit = this.board.posits[event.currentIndex];
    const nuevoOrden = event.currentIndex;

    // Aseguramos enviar señal de stop
    this.alSoltarDrag(posit);

    if (this.id) {
      this.api.updatePosit(this.id, posit.posit_id, { orden: nuevoOrden }).subscribe({
        next: () => console.log("Guardado"),
        error: () => { alert("Error guardando"); this.cargar(); }
      });
    }
  }

  // --- Métodos Auxiliares ---
  invitar() { const email = prompt("✉️ Email:"); if (email && this.id) this.api.inviteUser(this.id, email).subscribe(() => this.cargar()); }
  echarlo(uid: string) { if (confirm("🛑 ¿Echar?")) this.api.removeParticipant(this.id!, uid).subscribe(() => this.cargar()); }
  abrirModal() {
    this.mostrarModal = true;
    this.nuevoPosit = { contenido: '', color: '#fef3c7' };
  }

  cerrarModal() {
    this.mostrarModal = false;
  }

  seleccionarColor(color: string) {
    this.nuevoPosit.color = color;
  }

  guardarPosit() {
    if (!this.id || !this.nuevoPosit.contenido.trim()) return;

    this.api.createPosit(this.id, {
      titulo: this.nuevoPosit.contenido.substring(0, 30) + '...',
      contenido: this.nuevoPosit.contenido,
      color: this.nuevoPosit.color,
      orden: 0
    }).subscribe(() => {
      this.cargar();
      this.cerrarModal();
    });
  }

  crearPosit() {
    this.abrirModal();
  }
  borrarPosit(pid: string) { if (this.id && confirm("🗑️ ¿Borrar?")) this.api.deletePosit(this.id, pid).subscribe(() => this.cargar()); }
  comentar(pid: string) { const t = prompt("💬 Comentario:"); if (t && this.id) this.api.addComment(this.id, pid, t).subscribe(() => this.cargar()); }
  borrarComentario(pid: string, cid: string) { if (this.id) this.api.deleteComment(this.id, pid, cid).subscribe(() => this.cargar()); }
}