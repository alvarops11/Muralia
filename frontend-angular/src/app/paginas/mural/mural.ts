import { Component, Input, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { CONFIG } from '../../config/urls.config';

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

  // -- Control de Permisos de Drag (NUEVO - SISTEMA AUTORITATIVO) --
  dragPermissions = new Set<string>(); // posits con permiso concedido
  dragPending: string | null = null; // posit esperando permiso
  dragBlockedByOthers = new Set<string>(); // posits bloqueados por otros
  dragCurrentPosit: any = null; // posit actual siendo arrastrado
  waitingForLock: string | null = null; // posit que estamos intentando bloquear
  pendingDrop: { posit: any, targetId: string | null } | null = null; // Swap esperando permiso
  cooldownMovimiento = false; // Cooldown de 1s entre movimientos
  hoveredPositId: string | null = null; // ID del posit sobre el que estamos planeando soltar

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

  mostrarSidebarMobile = false;

  toggleSidebarMobile() {
    this.mostrarSidebarMobile = !this.mostrarSidebarMobile;
    this.cd.detectChanges();
  }

  cerrarSidebarMobile() {
    this.mostrarSidebarMobile = false;
    this.cd.detectChanges();
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

    // 5. Suscribirse a eventos de autorización de drag (NUEVO - SISTEMA AUTORITATIVO)
    this.subs.push(
      this.wsService.onDragGranted().subscribe((data: any) => {
        console.log('✅ Permiso de drag concedido para posit:', data.positId);
        this.dragPermissions.add(data.positId);
        this.dragPending = null;
        this.waitingForLock = null;

        // Si teníamos un drop pendiente esperando este permiso, lo ejecutamos ahora
        if (this.pendingDrop && this.pendingDrop.posit.posit_id === data.positId) {
          console.log('📦 Ejecutando drop BUFEREADO para:', data.positId);
          this.ejecutarSwap(this.pendingDrop.posit, this.pendingDrop.targetId);
          this.pendingDrop = null;
        }

        this.cd.detectChanges();
      })
    );

    this.subs.push(
      this.wsService.onDragDenied().subscribe((data: any) => {
        console.warn('❌ Permiso de drag denegado para posit:', data.positId);

        this.dragPending = null;
        this.waitingForLock = null;
        this.pendingDrop = null;
        if (data.positId) this.dragPermissions.delete(data.positId);

        // NUCLEAR RESET: Eliminamos físicamente el posit por unos ms para matar la sesión de drag
        if (data.positId) {
          this.forzarResetPosit(data.positId);
        }

        setTimeout(() => {
          this.notify.error('No puedes mover este posit: otro usuario ha ganado el pulso 🏁');
        });
      })
    );

    this.subs.push(
      this.wsService.onDragBlocked().subscribe((data: any) => {
        console.log('🔒 Posit bloqueado por otro usuario:', data.positId);
        this.dragBlockedByOthers.add(data.positId);
        this.cd.detectChanges();
      })
    );

    this.subs.push(
      this.wsService.onDragReleased().subscribe((data: any) => {
        console.log('🔓 Posit liberado por servidor:', data.positId);
        this.dragBlockedByOthers.delete(data.positId);

        // No borramos de permisos si YO soy quien lo está moviendo
        // de lo contrario soltar() fallará por falta de permiso
        if (this.dragCurrentPosit?.posit_id !== data.positId) {
          this.dragPermissions.delete(data.positId);
        } else {
          // Si yo sigo "agarrándolo" (race condition), lo borramos en un rato 
          // para dejar que soltar() termine su trabajo
          setTimeout(() => {
            if (this.dragCurrentPosit?.posit_id !== data.positId) {
              this.dragPermissions.delete(data.positId);
              this.cd.detectChanges();
            }
          }, 300);
        }

        this.cd.detectChanges();
      })
    );

    // 6. Configurar Throttling para mis movimientos
    this.subs.push(
      this.dragSubject.pipe(throttleTime(16)).subscribe((pos) => {
        const name = this.auth.getUserName() || this.getGuestData()?.nombre || 'Colaborador';
        this.wsService.emitDrag(this.id!, pos.positId, { x: pos.x, y: pos.y }, name);
      })
    );

    // 7. Bloqueos de edición
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

    // 8. Sincronización de estado de bloqueos de edición
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

  // --- EVENTOS DRAG LOCALES (CON SISTEMA AUTORITATIVO) ---

  /**
   * PASO 1: Empezar el drag. Solicitamos el bloqueo al servidor.
   * El usuario ya está moviendo el posit (optimista).
   */
  alEmpezarDrag(posit: any) {
    if (!this.id) return;
    this.dragCurrentPosit = posit;

    // Si ya tenemos el permiso, no pedimos nada
    if (this.dragPermissions.has(posit.posit_id)) {
      console.log('🚀 Drag continuado (ya tenía permiso):', posit.posit_id);
      return;
    }

    console.log('⏳ Solicitando permiso de drag (inicio optimista) para:', posit.posit_id);
    this.waitingForLock = posit.posit_id;
    this.dragPending = posit.posit_id;

    const userId = this.auth.getUserId() || this.getGuestData()?.guestId || 'guest';
    this.wsService.requestDrag(this.id, posit.posit_id, userId);
    this.cd.detectChanges();
  }

  // Se dispara mientras arrastro (Angular CDK)
  alMoverDrag(event: CdkDragMove, posit: any) {
    // Si aún no tenemos permiso, no enviamos señal de movimiento al servidor
    // ni calculamos el hover para evitar swaps fantasmas
    if (!this.dragPermissions.has(posit.posit_id)) {
      return;
    }

    // Obtenemos coordenadas absolutas del ratón
    const { x, y } = event.pointerPosition;

    // DETECCIÓN DE HOVER (Para el Swap Estricto)
    // El .cdk-drag-preview DEBE tener pointer-events: none en CSS
    const elementUnder = document.elementFromPoint(x, y);

    // Debug logging (Solo para desarrollo)
    // console.log('Element under mouse:', elementUnder);

    // Buscamos si el elemento debajo es otro posit
    const positElement = elementUnder?.closest('.note');
    if (positElement) {
      const targetId = positElement.getAttribute('data-posit-id');
      if (targetId && targetId !== posit.posit_id) {
        if (this.hoveredPositId !== targetId) {
          console.log(`🎯 Hover sobre posit: ${targetId} (prev: ${this.hoveredPositId})`);
          this.hoveredPositId = targetId;
          this.cd.detectChanges();
        }
      } else {
        this.hoveredPositId = null;
      }
    } else {
      if (this.hoveredPositId) {
        this.hoveredPositId = null;
        this.cd.detectChanges();
      }
    }

    // Emitimos al Subject (que controla la frecuencia de envío)
    this.dragSubject.next({
      positId: posit.posit_id,
      x: x - 20, // Ajuste visual para el cursor
      y: y - 20
    });
  }

  // Se dispara al soltar (antes de guardar)
  alSoltarDrag(posit: any) {
    console.log('🏁 Arrante local terminado para:', posit.posit_id);
    if (this.id) this.wsService.emitStopDrag(this.id, posit.posit_id);

    // IMPORTANTE: No borramos de permisos aquí, 
    // dejamos que onDragReleased o soltar() lo hagan
    this.dragPending = null;
  }

  // Se dispara al completar el drop (Guardar en BD)
  soltar(event: CdkDragDrop<any[]>) {
    console.log('📦 Soltado. Target hovered:', this.hoveredPositId);

    const targetId = this.hoveredPositId;
    const currentPosit = this.dragCurrentPosit;

    // Limpieza de feedback visual inmediata
    this.hoveredPositId = null;
    this.dragCurrentPosit = null;

    if (!currentPosit) return;

    // CASO A: Ya tenemos permiso -> Ejecutar ya
    if (this.dragPermissions.has(currentPosit.posit_id)) {
      this.ejecutarSwap(currentPosit, targetId);
      return;
    }

    // CASO B: Estamos esperando permiso -> Buferear
    if (this.dragPending === currentPosit.posit_id) {
      console.log('⏳ Drop bufereado (esperando permiso del servidor):', currentPosit.posit_id);
      this.pendingDrop = { posit: currentPosit, targetId: targetId };
      return;
    }

    // CASO C: No tenemos permiso y no lo hemos pedido -> Abortar
    console.warn('❌ Drop abortado: No hay autorización para', currentPosit.posit_id);
    this.alSoltarDrag(currentPosit);

    // Nuclear Reset para asegurar que el posit vuelve a su sitio al instante
    this.forzarResetPosit(currentPosit.posit_id);
  }

  // Lógica compartida de intercambio
  ejecutarSwap(positA: any, targetId: string | null) {
    if (!targetId) {
      this.alSoltarDrag(positA);
      return;
    }

    const indexA = this.board.posits.findIndex((p: any) => p.posit_id === positA.posit_id);
    const indexB = this.board.posits.findIndex((p: any) => p.posit_id === targetId);

    if (indexA === -1 || indexB === -1 || indexA === indexB) {
      console.warn('📦 Swap cancelado: Posiciones inválidas', { indexA, indexB });
      this.alSoltarDrag(positA);
      return;
    }

    console.log(`🔄 Ejecutando Swap: ${positA.posit_id} <-> ${targetId}`);

    // Activar cooldown inmediatamente al soltar
    this.cooldownMovimiento = true;
    setTimeout(() => {
      this.cooldownMovimiento = false;
      this.cd.detectChanges();
    }, 1000);

    const posits = [...this.board.posits];
    const itemA = posits[indexA];
    const itemB = posits[indexB];

    // Obtenemos los órdenes actuales para intercambiarlos
    const ordenA = itemA.posicion?.orden || 0;
    const ordenB = itemB.posicion?.orden || 0;

    // Intercambiar posiciones localmente en el array
    posits[indexA] = itemB;
    posits[indexB] = itemA;
    this.board.posits = posits;

    // Aseguramos enviar señal de stop
    this.alSoltarDrag(itemA);

    if (this.id) {
      console.log('📡 Enviando swap al servidor...', {
        positIdA: itemA.posit_id,
        positIdB: targetId,
        ordenA: ordenB,
        ordenB: ordenA
      });
      this.api.swapPosits(this.id, {
        positIdA: itemA.posit_id,
        positIdB: targetId,
        ordenA: ordenB,
        ordenB: ordenA,
        ...(this.auth.getUserId() ? {} : { guestId: this.getGuestData()?.guestId })
      }).subscribe({
        next: () => console.log("✅ Intercambio guardado en BD"),
        error: (err) => {
          console.error("❌ Error al intercambiar:", err);
          setTimeout(() => {
            this.notify.error("Error al intercambiar posiciones");
          });
          this.cargar();
        }
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
    this.cerrarSidebarMobile();
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
    if (this.guardandoPosit || this.subiendoArchivo) return;

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

          // Cerramos primero para flujo más rápido visualmente
          this.mostrarModal = false;
          this.isEditing = false;
          this.editPositId = null;
          this.limpiarTimers();

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

          // Cerramos primero
          this.mostrarModal = false;
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

  descargarArchivo(url: string, originalName: string) {
    const fullUrl = this.getFullUrl(url);
    const link = document.createElement('a');
    link.href = fullUrl;
    link.download = originalName || 'archivo';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getFullUrl(path: string): string {
    if (!path) return '';
    return `${CONFIG.API_URL}${path}`;
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
    this.cerrarSidebarMobile();
    this.mostrarBuscar = true;
  }

  cerrarBuscar() {
    this.mostrarBuscar = false;
  }

  abrirCompartir() {
    this.cerrarSidebarMobile();
    this.mostrarCompartir = true;
  }

  cerrarCompartir() {
    this.mostrarCompartir = false;
  }

  abrirExportar() {
    this.cerrarSidebarMobile();
    this.mostrarExportar = true;
  }

  cerrarExportar() {
    this.mostrarExportar = false;
  }

  abrirEstadisticas() {
    this.cerrarSidebarMobile();
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

  // Estabilidad del DOM para evitar interrupciones en el drag
  trackByPositId(index: number, item: any): string {
    return item.posit_id || index;
  }

  /**
   * NUCLEAR RESET (Plan J):
   * Elimina físicamente el posit del array por unos milisegundos.
   * Esto obliga a Angular a DESTRUIR el elemento del DOM y matar cualquier sesión de arrastre.
   */
  forzarResetPosit(positId: string) {
    if (!this.board || !positId) return;

    const index = this.board.posits.findIndex((p: any) => p.posit_id === positId);
    if (index !== -1) {
      console.log('☢️ Aplicando Nuclear Reset a:', positId);
      const positBackup = this.board.posits[index];
      this.board.posits.splice(index, 1);
      this.cd.detectChanges();

      setTimeout(() => {
        this.board.posits.splice(index, 0, positBackup);
        this.cd.detectChanges();
      }, 50);
    }
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
