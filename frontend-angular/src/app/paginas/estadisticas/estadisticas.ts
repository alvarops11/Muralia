import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-estadisticas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.css',
})
export class Estadisticas {
  @Input() board: any;
  @Output() onClose = new EventEmitter<void>();

  get totalPostits() {
    return this.board?.posits?.length || 0;
  }

  get totalCollaborators() {
    return this.board?.participantes?.length || 0;
  }

  get totalComments() {
    let count = 0;
    this.board?.posits?.forEach((p: any) => {
      count += p.comentarios?.length || 0;
    });
    return count;
  }

  getMemberName(u: any): string {
    if (!u) return 'Anónimo';

    // 1. Si es un string (Email o ID directo)
    if (typeof u === 'string') {
      const str = u.trim();
      if (str.includes('@')) return str.split('@')[0];
      if (str.startsWith('guest_')) return 'Invitado';
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

  // Helper para normalizar IDs (quitar prefijos, espacios, etc)
  private cleanId(id: any): string {
    if (!id) return '';
    const str = String(id).trim();
    // Quitar prefijo 'usuario_' si existe, para unificar criterios
    return str.replace(/^usuario_/, '');
  }

  // Helper para identificar usuarios de forma única (ID, Email o GuestID)
  private getUserKey(u: any): string {
    if (!u) return 'unknown';

    if (typeof u === 'string') return this.cleanId(u);

    if (typeof u === 'object') {
      // 1. Prioridad: Detectar Wrappers (Participantes)
      // Si tiene usuario_id, es un wrapper de participante. Usamos el ID del usuario real.
      if (u.usuario_id) {
        const uid = typeof u.usuario_id === 'object' ? u.usuario_id._id : u.usuario_id;
        return this.cleanId(uid);
      }

      // Si tiene guest_id directamente (Participante invitado)
      if (u.guest_id) return this.cleanId(u.guest_id);

      // 2. Objeto Usuario / Documento Genérico con _id
      // Solo accedemos a _id si no es un wrapper con usuario_id
      if (u._id) return this.cleanId(u._id);

      // 3. Fallbacks de nombre
      if (u.nombre) return 'name_' + u.nombre;
      if (u.nombre_autor) return 'name_' + u.nombre_autor;
    }

    return 'unknown';
  }

  get statsByUser() {
    if (!this.board) return [];

    const userStatsMap = new Map();

    // 1. Inicializar mapa con participantes conocidos
    this.board.participantes?.forEach((p: any) => {
      const key = this.getUserKey(p);

      userStatsMap.set(key, {
        name: this.getMemberName(p),
        role: p.permiso,
        postCount: 0,
        commentCount: 0
      });
    });

    // 2. Contar posts y comentarios por usuario
    this.board.posits?.forEach((p: any) => {
      // Contar posts por autor
      const autorObj = p.autor_id ? p.autor_id : { nombre: p.nombre_autor };
      const autorKey = this.getUserKey(autorObj);

      if (userStatsMap.has(autorKey)) {
        userStatsMap.get(autorKey).postCount++;
      } else {
        // Fallback: Buscar por nombre si no coincide la key (ej. ID vs Nombre)
        const nameDisplay = this.getMemberName(p.autor_id || { nombre: p.nombre_autor });
        let found = false;

        // Iterar sobre los existentes para ver si coincide el nombre
        for (const [key, val] of userStatsMap.entries()) {
          if (val.name === nameDisplay) {
            val.postCount++;
            found = true;
            break;
          }
        }

        if (!found) {
          // Alguien que no está en la lista de participantes o es invitado temporal
          userStatsMap.set(autorKey, {
            name: nameDisplay !== 'Anónimo' ? nameDisplay : 'Colaborador',
            role: 'Colaborador',
            postCount: 1,
            commentCount: 0
          });
        }
      }

      // Contar comentarios por autor de comentario
      if (p.comentarios && p.comentarios.length > 0) {
        p.comentarios.forEach((c: any) => {
          const comAutorKey = this.getUserKey(c.usuario_id || { nombre: c.nombre });

          if (userStatsMap.has(comAutorKey)) {
            userStatsMap.get(comAutorKey).commentCount++;
          } else {
            // Fallback: Buscar por nombre
            const comNameDisplay = this.getMemberName(c.usuario_id || { nombre: c.nombre });
            let foundCom = false;

            for (const [key, val] of userStatsMap.entries()) {
              if (val.name === comNameDisplay) {
                val.commentCount++;
                foundCom = true;
                break;
              }
            }

            if (!foundCom) {
              userStatsMap.set(comAutorKey, {
                name: comNameDisplay !== 'Anónimo' ? comNameDisplay : 'Colaborador',
                role: 'Colaborador',
                postCount: 0,
                commentCount: 1
              });
            }
          }
        });
      }
    });

    return Array.from(userStatsMap.values()).sort((a, b) => {
      const totalA = a.postCount + a.commentCount;
      const totalB = b.postCount + b.commentCount;
      return totalB - totalA;
    });
  }
}
