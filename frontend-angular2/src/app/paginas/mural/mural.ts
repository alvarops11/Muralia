import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { DragDropModule, CdkDragDrop, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription, Subject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';

import { BuscarPosit } from '../buscar-posit/buscar-posit';
import { Compartir } from '../compartir/compartir';
import { Exportar } from '../exportar/exportar';
import { Estadisticas } from '../estadisticas/estadisticas';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-mural',
  standalone: true,
  imports: [CommonModule, RouterLink, DragDropModule, FormsModule, BuscarPosit, Compartir, Exportar, Estadisticas],
  templateUrl: './mural.html',
  styleUrl: './mural.css',
})
export class Mural implements OnInit, OnDestroy {
  @Input() id?: string;

  api = inject(ApiService);
  cd = inject(ChangeDetectorRef);
  route = inject(ActivatedRoute);
  wsService = inject(WebsocketService);
  private notify = inject(NotificationService);

  board: any = null;
  cargando = false;
  error = '';

  // Helper para mostrar nombres reales o IDs
  getMemberName(u: any): string {
    if (!u) return 'Anónimo';
    if (typeof u === 'object') {
      if (u.nombre) return u.nombre;
      if (u.email) return u.email.split('@')[0];
      return u._id ? (u._id + '').slice(0, 10) : 'Usuario';
    }
    const str = u + '';
    return str.includes('@') ? str.split('@')[0] : str.slice(0, 10);
  }

  // Modal state
  mostrarModal = false;
  mostrarBuscar = false;
  mostrarCompartir = false;
  mostrarExportar = false;
  mostrarEstadisticas = false;
  guardandoPosit = false;
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
        this.wsService.onUpdate().subscribe((data: any) => {
          console.log('🔄 Update DB:', data);
          this.cargar(true); // Recarga silenciosa
        })
      );

      // 4. Suscribirse a movimientos de otros (Ghosts)
      this.subs.push(
        this.wsService.onDragMove().subscribe((data: any) => {
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
        this.wsService.onDragStop().subscribe((data: any) => {
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
        error: () => { this.notify.error("Error al guardar la posición"); this.cargar(); }
      });
    }
  }

  // --- Métodos Auxiliares ---
  async invitar(emailManual?: string) {
    const email = emailManual || await this.notify.prompt("✉️ Email:");
    if (email && this.id) {
      this.api.inviteUser(this.id, email).subscribe(() => this.cargar());
    }
  }

  async echarlo(uid: string) {
    if (await this.notify.confirm("🛑 ¿Echar al colaborador?")) {
      this.api.removeParticipant(this.id!, uid).subscribe(() => this.cargar());
    }
  }

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
    if (!this.id || !this.nuevoPosit.contenido.trim() || this.guardandoPosit) return;

    this.guardandoPosit = true;
    this.api.createPosit(this.id, {
      titulo: this.nuevoPosit.contenido.substring(0, 30) + (this.nuevoPosit.contenido.length > 30 ? '...' : ''),
      contenido: this.nuevoPosit.contenido,
      color: this.nuevoPosit.color,
      orden: 0
    }).subscribe({
      next: () => {
        this.guardandoPosit = false;
        this.cerrarModal();
        this.cargar(true); // Recarga silenciosa para no bloquear
      },
      error: () => {
        this.notify.error("❌ Error al crear la nota. Inténtalo de nuevo.");
        this.guardandoPosit = false;
      }
    });
  }

  crearPosit() {
    this.abrirModal();
  }

  async borrarPosit(pid: string) {
    if (this.id && await this.notify.confirm("🗑️ ¿Estás seguro de que quieres borrar este posit?")) {
      this.api.deletePosit(this.id, pid).subscribe(() => this.cargar());
    }
  }

  async comentar(pid: string) {
    const t = await this.notify.prompt("💬 Escribe tu comentario:");
    if (t && this.id) {
      this.api.addComment(this.id, pid, t).subscribe(() => this.cargar());
    }
  }

  async borrarComentario(pid: string, cid: string) {
    if (this.id && await this.notify.confirm("🗑️ ¿Borrar comentario?")) {
      this.api.deleteComment(this.id, pid, cid).subscribe(() => this.cargar());
    }
  }

  abrirBuscar() {
    this.mostrarBuscar = true;
  }

  cerrarBuscar() {
    this.mostrarBuscar = false;
  }

  abrirCompartir() {
    this.mostrarCompartir = true;
  }

  cerrarCompartir() {
    this.mostrarCompartir = false;
  }

  abrirExportar() {
    this.mostrarExportar = true;
  }

  cerrarExportar() {
    this.mostrarExportar = false;
  }

  abrirEstadisticas() {
    this.mostrarEstadisticas = true;
  }

  cerrarEstadisticas() {
    this.mostrarEstadisticas = false;
  }

  navegarAPosit(pid: string) {
    this.cerrarBuscar();
    // Esperar un poco a que el modal se cierre
    setTimeout(() => {
      const el = document.querySelector(`[data-posit-id="${pid}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-posit');
        setTimeout(() => el.classList.remove('highlight-posit'), 2000);
      }
    }, 100);
  }
}
