import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { ApiService } from '../../api.service';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { DragDropModule, CdkDragDrop, CdkDragMove, moveItemInArray } from '@angular/cdk/drag-drop';
import { WebsocketService } from '../../../services/websocket.service';
import { Subscription, Subject } from 'rxjs';
import { throttleTime } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';

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
  private auth = inject(AuthService);
  private router = inject(Router);

  board: any = null;
  cargando = false;
  error = '';
  currentUserRole: 'admin' | 'editor' | 'lector' = 'lector';

  // Helper para mostrar nombres reales o IDs
  getMemberName(u: any): string {
    if (!u) return 'Anónimo';

    // 1. Si es un string (Email o ID directo)
    if (typeof u === 'string') {
      const str = u.trim();
      if (str.includes('@')) return str.split('@')[0];
      if (str.startsWith('guest_')) return 'Invitado';
      // Slicing moderado para IDs puros
      return str.replace('usuario_', '').slice(0, 12);
    }

    // 2. Si es un objeto (Mural, Posit, Comentario, Participante o Usuario)
    if (typeof u === 'object') {
      // Prioridad 1: Nombramientos directos guardados
      if (u.nombre) return u.nombre;
      if (u.nombre_autor) return u.nombre_autor;

      // Prioridad 2: Usuario poblado (email)
      if (u.email) return u.email.split('@')[0];

      // Prioridad 3: Seguir rastro de IDs (autor_id o usuario_id)
      const subId = u.autor_id || u.usuario_id;
      if (subId && subId !== u) {
        return this.getMemberName(subId);
      }

      // Prioridad 4: Guest ID
      if (u.guest_id) return 'Invitado';

      // Fallback: ID del propio objeto
      const objId = u._id || u.posit_id;
      if (objId) return (objId + '').replace('usuario_', '').slice(0, 12);
    }

    return 'Anónimo';
  }

  // Modal state
  mostrarModal = false;
  mostrarBuscar = false;
  mostrarCompartir = false;
  mostrarExportar = false;
  mostrarEstadisticas = false;
  mostrarComentarios = false;

  // Guest Access State
  mostrarLoginInvitado = false;
  nombreInvitado = '';
  guestId: string | null = null;
  private isListening = false;
  private guardandoInvitado = false; // Flag para evitar bucles de unión
  positComentarios: any = null; // Posit seleccionado para ver comentarios
  guardandoPosit = false;
  subiendoArchivo = false;
  isEditing = false;
  editPositId: string | null = null;
  nuevoPosit = { titulo: '', contenido: '', color: '#fef3c7' };
  coloresDisponibles = ['#fef3c7', '#a5f3fc', '#fbcfe8', '#bbf7d0', '#fed7aa'];

  // Timers para el modo edición
  editTimer: any = null;
  countdownInterval: any = null;
  tiempoRestante = 120; // 2 minutos en segundos

  // Locks: { positId: usuario }
  locks: { [key: string]: string } = {};

  // -- Control de Sockets y Ghosts --
  wsSubscription?: Subscription;
  private subs: Subscription[] = [];

  // Diccionario para guardar los "fantasmas" (posits movidos por otros)
  ghosts: { [key: string]: any } = {};

  // Subject para controlar la emisión de eventos de drag (Throttling)
  private dragSubject = new Subject<{ positId: string, x: number, y: number }>();

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id');
    const finalId = this.id || idUrl;

    if (finalId) {
      this.id = finalId;
      // 1. Carga inicial (Llamará a escucharCambios y verificarInvitacion si es necesario)
      this.cargar();
    } else {
      this.error = "No se ha encontrado ID";
      this.cd.detectChanges();
    }
  }

  escucharCambios() {
    if (this.isListening) return;
    this.isListening = true;

    // 1. Unirse a la sala de Socket.io (si no estamos ya)
    this.wsService.joinBoard(this.id!);

    // 2. Suscribirse a cambios en DB (Sync)
    this.subs.push(
      this.wsService.onUpdate().subscribe((data: any) => {
        console.log('🔄 Update DB:', data);
        if (data.accion === 'userJoined') {
          console.log('👥 Usuario nuevo unido');
        }
        this.cargar(true); // Recarga silenciosa
      })
    );

    // 3. Suscribirse a movimientos de otros (Ghosts)
    this.subs.push(
      this.wsService.onDragMove().subscribe((data: any) => {
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

    // 4. Borrar fantasma cuando el otro usuario suelta
    this.subs.push(
      this.wsService.onDragStop().subscribe((data: any) => {
        delete this.ghosts[data.positId];
        this.cd.detectChanges();
      })
    );

    // 5. Configurar Throttling para mis movimientos
    this.subs.push(
      this.dragSubject.pipe(throttleTime(16)).subscribe((pos) => {
        const name = this.auth.getUserName() || this.getGuestData()?.nombre || 'Colaborador';
        this.wsService.emitDrag(this.id!, pos.positId, { x: pos.x, y: pos.y }, name);
      })
    );

    // 6. Bloqueos de edición
    this.subs.push(
      this.wsService.onLock().subscribe((data: any) => {
        this.locks[data.positId] = data.usuario;
        this.cd.detectChanges();
      })
    );

    this.subs.push(
      this.wsService.onUnlock().subscribe((data: any) => {
        delete this.locks[data.positId];
        if (this.isEditing && this.editPositId === data.positId) {
          this.notify.info("Se ha agotado el tiempo de edición.");
          this.cerrarModal();
        }
        this.cd.detectChanges();
      })
    );

    this.subs.push(
      this.wsService.onLockSync().subscribe((data: any) => {
        // data = { positId: usuario, ... }
        this.locks = { ...this.locks, ...data };
        this.cd.detectChanges();
      })
    );
  }

  verificarInvitacion() {
    // 1. Verificar si ya tenemos los parámetros en el snapshot (útil para llamadas directas tras 403)
    const snapshotParams = this.route.snapshot.queryParamMap;
    const invite = snapshotParams.get('invite');
    const role = snapshotParams.get('role');

    if (invite === 'true' && role && this.id) {
      this.procesarInvitacion(invite, role);
      return;
    }

    // 2. Suscribirse por si cambian los parámetros (ya existía)
    this.subs.push(
      this.route.queryParamMap.subscribe(params => {
        const inv = params.get('invite');
        const rol = params.get('role');
        if (inv === 'true' && rol && this.id) {
          this.procesarInvitacion(inv, rol);
        }
      })
    );
  }

  private procesarInvitacion(invite: string, role: string) {
    if (!this.id || this.guardandoInvitado) return;
    this.guardandoInvitado = true; // Reutilizamos flag para evitar dobles uniones

    this.api.joinBoard(this.id, role).subscribe({
      next: () => {
        this.guardandoInvitado = false;
        this.notify.success(`¡Bienvenido! Te has unido como ${role}`);
        // Limpiar parámetros de la URL
        this.router.navigate([], {
          queryParams: { invite: null, role: null },
          queryParamsHandling: 'merge',
          replaceUrl: true
        });
        this.cargar(true); // Recargar datos del tablero ahora que somos participantes
      },
      error: (err) => {
        this.guardandoInvitado = false;
        console.error('Error al unirse via link:', err);
        // Si falló, intentar cargar de todas formas (mostrará error si sigue siendo 403)
        this.cargar(true);
      }
    });
  }

  ngOnDestroy() {
    if (this.id) {
      this.wsService.leaveBoard(this.id);
    }
    // Desuscribirse de todo para evitar memory leaks
    this.subs.forEach(s => s.unsubscribe());
    this.wsSubscription?.unsubscribe();
    this.limpiarTimers();
  }

  cargar(silent = false) {
    if (!this.id) return;

    if (!silent) {
      this.cargando = true;
      this.cd.detectChanges();
    }

    const guestData = this.getGuestData();
    this.api.getBoard(this.id, guestData?.guestId).subscribe({
      next: (data) => {
        data.posits.sort((a: any, b: any) => (a.posicion?.orden || 0) - (b.posicion?.orden || 0));
        this.board = data;
        this.error = '';

        const uid = this.auth.getUserId();

        // 1. Verificar si ya soy participante con cuenta real
        let participante = data.participantes?.find((p: any) => {
          const puid = p.usuario_id?._id || p.usuario_id;
          return uid && puid === uid;
        });

        // 2. Si no, verificar si soy participante con Guest ID
        if (!participante && guestData) {
          console.log('[Mural] Soy invitado, buscando mi guestId:', guestData.guestId);
          participante = data.participantes?.find((p: any) => {
            // Prioridad absoluta al nuevo guest_id
            if (p.guest_id && p.guest_id === guestData.guestId) {
              console.log('[Mural] ¡Encontrado por guest_id!', p.nombre);
              return true;
            }
            // Fallback para IDs antiguos en usuario_id
            const puid = (p.usuario_id?._id || p.usuario_id || '').toString();
            const matching = puid === guestData.guestId;
            if (matching) console.log('[Mural] ¡Encontrado por usuario_id (fallback)!', p.nombre);
            return matching;
          });
        }

        if (participante) {
          console.log('[Mural] Participante reconocido:', JSON.stringify(participante));
          this.currentUserRole = participante.permiso || 'lector';
          console.log('[Mural] Rol activado:', this.currentUserRole);
          this.cargando = false;
          if (!this.isListening) {
            this.escucharCambios();
          }
        } else {
          console.log('[Mural] Usuario no es participante aún.');

          // Caso: Board de acceso abierto
          if (data.privacidad === 'enlace-abierto') {
            if (guestData) {
              console.log('[Mural] Tengo guestData, intentando auto-unirse...');
              this.unirseComoInvitado(guestData.nombre, guestData.guestId);
            } else {
              console.log('[Mural] No tengo guestData, pidiendo nombre...');
              this.mostrarLoginInvitado = true;
              this.cargando = false;
            }
          } else {
            // Caso: Board privado/cerrado -> Priorizar Login si no estoy dentro
            const params = this.route.snapshot.queryParamMap;
            if (!this.auth.getUserId()) {
              console.log('[Mural] Board privado y no logeado. Redirigiendo al login...');
              this.notify.info("Este tablero es privado. Por favor, inicia sesión.");
              this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
            } else {
              console.log('[Mural] Estoy logeado pero no soy participante. Verificando invitacion...');
              this.verificarInvitacion();
            }
            this.cargando = false;
          }
        }

        // Actualizar el posit del panel de comentarios si está abierto
        if (this.positComentarios && this.positComentarios.posit_id) {
          const updatedPosit = data.posits.find((p: any) => p.posit_id === this.positComentarios.posit_id);
          if (updatedPosit) {
            this.positComentarios = updatedPosit;
          }
        }

        this.cd.detectChanges();
      },
      error: (err) => {
        this.cargando = false;
        if (!silent) {
          // Si es un 403 (Prohibido)
          if (err.status === 403) {
            const params = this.route.snapshot.queryParamMap;
            const isInvite = params.get('invite') === 'true' && params.get('role');

            // Si no estamos logeados, SIEMPRE redirigir al login para tableros prohibidos
            if (!this.auth.getUserId()) {
              console.log('[Mural] 403 Prohibido. Redirigiendo al login...');
              this.notify.info("Este tablero es privado. Por favor, inicia sesión.");
              this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
              return;
            }

            // Si estamos logeados pero dio 403, intentar procesar invitación si la hay
            if (isInvite) {
              console.log('[Mural] 403 detectado estando logeado, intentando unirse...');
              this.verificarInvitacion();
              return;
            }
          }
          this.error = "Error cargando";
        }
        this.cd.detectChanges();
      }
    });
  }

  // --- Helpers de Permisos ---
  canEdit(): boolean {
    return this.currentUserRole === 'admin' || this.currentUserRole === 'editor';
  }

  isAdmin(): boolean {
    return this.currentUserRole === 'admin';
  }

  // --- EVENTOS DRAG LOCALES ---
  alEmpezarDrag() {
    this.cd.detectChanges();
  }

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
      this.api.updatePosit(this.id, posit.posit_id, {
        orden: nuevoOrden,
        ...(this.auth.getUserId() ? {} : { guestId: this.getGuestData()?.guestId })
      }).subscribe({
        next: () => console.log("Guardado"),
        error: () => { this.notify.error("Error al guardar la posición"); this.cargar(); }
      });
    }
  }

  // --- Métodos Auxiliares ---
  async invitar(data?: any) {
    let email: string | null = null;
    let permiso: string = 'lector';

    if (data && typeof data === 'object') {
      email = data.email;
      permiso = data.permiso;
    } else {
      email = data || await this.notify.prompt("✉️ Email:");
    }

    if (email && this.id) {
      if (!this.isAdmin()) {
        this.notify.error("No tienes permisos para invitar usuarios");
        return;
      }
      this.api.inviteUser(this.id, email, permiso).subscribe(() => this.cargar());
    }
  }

  async echarlo(uid: string) {
    if (await this.notify.confirm("🛑 ¿Echar al colaborador?")) {
      this.api.removeParticipant(this.id!, uid).subscribe(() => this.cargar());
    }
  }

  actualizarRol(event: { userId: string, role: string }) {
    if (this.id) {
      this.api.updateParticipantRole(this.id, event.userId, event.role).subscribe({
        next: () => {
          this.notify.success("Rol actualizado");
          this.cargar(true);
        },
        error: () => this.notify.error("Error al actualizar el rol")
      });
    }
  }

  abrirModal() {
    this.mostrarModal = true;
    this.isEditing = false;
    this.editPositId = null;
    this.nuevoPosit = { titulo: '', contenido: '', color: '#fef3c7' };
  }

  abrirEditar(posit: any) {
    if (this.locks[posit.posit_id]) return; // Si está bloqueado no hacemos nada

    this.mostrarModal = true;
    this.isEditing = true;
    this.editPositId = posit.posit_id;
    this.nuevoPosit = {
      titulo: posit.titulo,
      contenido: posit.contenido,
      color: posit.color
    };

    // Emitir bloqueo
    if (this.id) {
      this.wsService.emitLock(this.id, posit.posit_id, this.auth.getUserName());
      this.iniciarTimerEdicion();
    }
  }

  iniciarTimerEdicion() {
    this.limpiarTimers();
    this.tiempoRestante = 120; // 2 minutos

    // Mostramos aviso si queda poco tiempo (opcional, pero mejora UX)
    this.countdownInterval = setInterval(() => {
      this.tiempoRestante--;
      if (this.tiempoRestante <= 0) {
        this.limpiarTimers();
        this.cerrarModal();
        this.notify.info("Tiempo de edición agotado.");
      }
      this.cd.detectChanges();
    }, 1000);
  }

  limpiarTimers() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  get tiempoFormateado(): string {
    const mins = Math.floor(this.tiempoRestante / 60);
    const segs = this.tiempoRestante % 60;
    return `${mins}:${segs.toString().padStart(2, '0')}`;
  }

  cerrarModal() {
    if (this.isEditing && this.id && this.editPositId) {
      this.wsService.emitUnlock(this.id, this.editPositId);
    }
    this.limpiarTimers();
    this.mostrarModal = false;
    this.isEditing = false;
    this.editPositId = null;
  }

  seleccionarColor(color: string) {
    this.nuevoPosit.color = color;
  }

  guardarPosit() {
    if (!this.id || this.guardandoPosit) return;

    this.guardandoPosit = true;

    if (this.isEditing && this.editPositId) {
      // Editar
      const guestData = this.getGuestData();
      this.api.updatePosit(this.id, this.editPositId, {
        titulo: this.nuevoPosit.titulo.trim(),
        contenido: this.nuevoPosit.contenido || '',
        color: this.nuevoPosit.color,
        // Si no hay usuario logueado, mandamos datos de invitado para el check de permisos
        ...(this.auth.getUserId() ? {} : { nombre: guestData?.nombre, guestId: guestData?.guestId })
      }).subscribe({
        next: () => {
          this.guardandoPosit = false;
          const pid = this.editPositId!;
          this.wsService.emitUnlock(this.id!, pid); // Desbloqueamos
          this.cerrarModal();
          this.cargar(true);
        },
        error: () => {
          this.notify.error("❌ Error al editar la nota.");
          this.guardandoPosit = false;
        }
      });
    } else {
      // Crear
      const contenido = this.nuevoPosit.contenido || '';
      const guestData = this.getGuestData();

      this.api.createPosit(this.id, {
        titulo: this.nuevoPosit.titulo.trim() || (contenido ? (contenido.substring(0, 30) + (contenido.length > 30 ? '...' : '')) : 'Nota sin título'),
        contenido: contenido,
        color: this.nuevoPosit.color,
        orden: 0,
        // Si no hay usuario logueado, mandamos datos de invitado para autoría
        ...(this.auth.getUserId() ? {} : { nombre: guestData?.nombre, guestId: guestData?.guestId })
      }).subscribe({
        next: () => {
          this.guardandoPosit = false;
          this.cerrarModal();
          this.cd.detectChanges();
          this.cargar(true); // Recarga silenciosa para no bloquear
        },
        error: () => {
          this.notify.error("❌ Error al crear la nota. Inténtalo de nuevo.");
          this.guardandoPosit = false;
          this.cd.detectChanges();
        }
      });
    }
  }

  alSeleccionarArchivo(event: any, positId: string | null) {
    const file = event.target.files[0];
    if (!file || !this.id || !positId) return;

    this.subiendoArchivo = true;
    this.api.uploadFile(this.id, positId, file).subscribe({
      next: (res: any) => {
        this.subiendoArchivo = false;
        this.notify.success("Archivo subido correctamente");
        this.cargar(true);
        // Si estamos en modal de edición, podríamos querer actualizar la vista previa
        // Pero cargar(true) ya debería refrescar el board.
      },
      error: () => {
        this.subiendoArchivo = false;
        this.notify.error("Error al subir el archivo");
      }
    });
  }

  async borrarArchivo(positId: string | null) {
    if (!this.id || !positId) return;
    if (await this.notify.confirm("🗑️ ¿Estás seguro de que quieres borrar el archivo adjunto?")) {
      this.api.deleteFile(this.id, positId, { guestId: this.getGuestData()?.guestId }).subscribe({
        next: () => {
          this.notify.success("Archivo eliminado");
          this.cargar(true);
        },
        error: () => this.notify.error("Error al eliminar el archivo")
      });
    }
  }

  descargarArchivo(url: string) {
    window.open(this.getFullUrl(url), '_blank');
  }

  getFullUrl(path: string): string {
    if (!path) return '';
    return `${environment.apiUrl}${path}`;
  }

  getFileType(filename: string): 'image' | 'audio' | 'video' | 'other' {
    if (!filename) return 'other';
    const ext = filename.trim().split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext!)) return 'image';
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext!)) return 'audio';
    if (['mp4', 'webm', 'ogg'].includes(ext!)) return 'video';
    return 'other';
  }

  crearPosit() {
    this.abrirModal();
  }

  async borrarPosit(pid: string) {
    if (this.locks[pid]) {
      this.notify.error(`🔒 Este posit está siendo editado por ${this.locks[pid]}`);
      return;
    }

    if (this.id && await this.notify.confirm("🗑️ ¿Estás seguro de que quieres borrar este posit? Esta acción no se puede deshacer y se perderá toda la información del posit.")) {
      this.api.deletePosit(this.id, pid, { guestId: this.getGuestData()?.guestId }).subscribe(() => this.cargar());
    }
  }

  abrirComentarios(posit: any) {
    this.positComentarios = posit;
    this.mostrarComentarios = true;
  }

  cerrarComentarios() {
    this.mostrarComentarios = false;
    this.positComentarios = null;
  }

  async comentar(pid: string) {
    const t = await this.notify.prompt("💬 ¿Qué quieres comentar?");
    if (t && this.id && this.board) {
      // Actualización optimista: agregar el comentario inmediatamente
      const posit = this.board.posits.find((p: any) => p.posit_id === pid);
      if (posit) {
        // Obtener usuario del board actual si está disponible
        const currentUser = this.board.participantes?.find((p: any) => {
          const userId = p.usuario_id?._id || p.usuario_id;
          return userId; // El primero debería ser el actual en algunos casos, pero mejor dejarlo así
        });
        const userId = currentUser?.usuario_id?._id || currentUser?.usuario_id || null;

        const nuevoComentario = {
          _id: 'temp_' + Date.now(), // ID temporal
          usuario_id: userId || { email: this.auth.getUserName() },
          contenido: t,
          fecha: new Date()
        };

        // Agregar el comentario localmente de inmediato
        if (!posit.comentarios) {
          posit.comentarios = [];
        }
        posit.comentarios.push(nuevoComentario);

        // Actualizar también el posit en el panel si está abierto (actualización optimista)
        if (this.positComentarios && this.positComentarios.posit_id === pid) {
          if (!this.positComentarios.comentarios) {
            this.positComentarios.comentarios = [];
          }
          this.positComentarios.comentarios.push(nuevoComentario);
        }

        this.cd.detectChanges();

        // Enviar al backend
        const guestData = this.getGuestData();
        this.api.addComment(this.id, pid, {
          contenido: t.trim(),
          ...(this.auth.getUserId() ? {} : { guestId: guestData?.guestId, nombre: guestData?.nombre })
        }).subscribe({
          next: (response: any) => {
            // La respuesta del backend tiene el board actualizado
            // Actualizamos solo el posit específico para mantener el orden
            if (response.board) {
              const updatedPosit = response.board.posits.find((p: any) => p.posit_id === pid);
              if (updatedPosit && posit) {
                posit.comentarios = updatedPosit.comentarios || [];
                // Actualizar también el posit en el panel si está abierto con datos reales
                if (this.positComentarios && this.positComentarios.posit_id === pid) {
                  this.positComentarios.comentarios = updatedPosit.comentarios || [];
                }
                this.cd.detectChanges();
              }
            }
          },
          error: () => {
            // Si falla, revertir el cambio
            if (posit.comentarios) {
              const index = posit.comentarios.findIndex((c: any) => c._id === nuevoComentario._id);
              if (index !== -1) {
                posit.comentarios.splice(index, 1);
              }
            }
            // Revertir también en el panel si está abierto
            if (this.positComentarios && this.positComentarios.posit_id === pid && this.positComentarios.comentarios) {
              const index = this.positComentarios.comentarios.findIndex((c: any) => c._id === nuevoComentario._id);
              if (index !== -1) {
                this.positComentarios.comentarios.splice(index, 1);
              }
            }
            this.cd.detectChanges();
            this.notify.error("❌ Error al agregar el comentario");
          }
        });
      }
    }
  }

  async borrarComentario(pid: string, cid: string) {
    if (this.id && await this.notify.confirm("🗑️ ¿Estás seguro de que quieres borrar este comentario? Esta acción no se puede deshacer.")) {
      // Actualización optimista: eliminar el comentario inmediatamente
      const posit = this.board?.posits.find((p: any) => p.posit_id === pid);
      if (posit && posit.comentarios) {
        const comentarioIndex = posit.comentarios.findIndex((c: any) => c._id?.toString() === cid || c._id === cid);
        if (comentarioIndex !== -1) {
          posit.comentarios.splice(comentarioIndex, 1);
        }
      }

      // Actualizar también el posit en el panel si está abierto (actualización optimista)
      if (this.positComentarios && this.positComentarios.posit_id === pid && this.positComentarios.comentarios) {
        const comentarioIndex = this.positComentarios.comentarios.findIndex((c: any) => c._id?.toString() === cid || c._id === cid);
        if (comentarioIndex !== -1) {
          this.positComentarios.comentarios.splice(comentarioIndex, 1);
        }
      }

      this.cd.detectChanges();

      // Enviar al backend
      this.api.deleteComment(this.id, pid, cid, { guestId: this.getGuestData()?.guestId }).subscribe({
        next: () => {
          this.cargar(true); // Recarga silenciosa para sincronizar
        },
        error: () => {
          // Si falla, recargar para revertir cambios
          this.cargar(true);
          this.notify.error("❌ Error al borrar el comentario");
        }
      });
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

  // --- GUEST LOGIC ---
  getGuestData() {
    const data = localStorage.getItem('muralia_guest');
    return data ? JSON.parse(data) : null;
  }

  confirmarNombreInvitado() {
    if (!this.nombreInvitado.trim()) return;
    const gid = 'guest_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('muralia_guest', JSON.stringify({ nombre: this.nombreInvitado, guestId: gid }));
    this.unirseComoInvitado(this.nombreInvitado, gid);
  }

  unirseComoInvitado(nombre: string, guestId: string) {
    if (this.guardandoInvitado) {
      console.log('[Mural] Ya hay una unión en curso, ignorando...');
      return;
    }
    this.guardandoInvitado = true;

    // Evitar bucles infinitos: si ya lo intentamos en los últimos 10 segundos para este board, parar.
    const lastJoinKey = `last_join_${this.id}`;
    const lastJoinTime = sessionStorage.getItem(lastJoinKey);
    if (lastJoinTime && (Date.now() - parseInt(lastJoinTime)) < 10000) {
      console.warn('[Mural] Intento de unión demasiado frecuente. Sincronización en curso...');
      this.cargando = true;
      return;
    }
    sessionStorage.setItem(lastJoinKey, Date.now().toString());

    this.mostrarLoginInvitado = false;
    this.cargando = true;
    this.cd.detectChanges();

    console.log('[Mural] Uniéndose como invitado:', { nombre, guestId });

    this.api.joinBoard(this.id!, 'editor', { nombre, guestId }).subscribe({
      next: () => {
        console.log('[Mural] Unión exitosa, esperando recarga...');
        this.guardandoInvitado = false;
        this.notify.success(`¡Bienvenido ${nombre}!`);
        // Pequeño delay para dejar que Angular respire
        setTimeout(() => this.cargar(), 100);
      },
      error: (err) => {
        console.error('[Mural] Error al unirse como invitado:', err);
        this.guardandoInvitado = false;
        this.notify.error('Error al entrar como invitado');
        this.cargando = false;
        this.cd.detectChanges();
        // Limpiar para permitir reintento manual
        sessionStorage.removeItem(lastJoinKey);
      }
    });
  }
}
