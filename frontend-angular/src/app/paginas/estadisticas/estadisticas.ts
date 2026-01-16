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
    // Si es un objeto populado { _id, email, nombre? }
    if (typeof u === 'object') {
      if (u.nombre) return u.nombre;
      if (u.email) return u.email.split('@')[0];
      // Si solo tiene ID, limpiamos el prefijo 'usuario_' si existe
      let id = u._id || '';
      return (id + '').replace('usuario_', '').slice(0, 10) || 'Usuario';
    }
    // Si es un string (ID o Email)
    const str = u + '';
    if (str.includes('@')) return str.split('@')[0];
    return str.replace('usuario_', '').slice(0, 10);
  }

  get statsByUser() {
    if (!this.board) return [];

    const userStatsMap = new Map();

    // 1. Inicializar mapa con participantes conocidos
    this.board.participantes?.forEach((p: any) => {
      const u = p.usuario_id;
      const uId = (typeof u === 'object' && u !== null) ? u._id : u;

      userStatsMap.set(uId, {
        name: this.getMemberName(u),
        role: p.permiso,
        postCount: 0,
        commentCount: 0
      });
    });

    // 2. Contar posts y comentarios por usuario
    this.board.posits?.forEach((p: any) => {
      // Contar posts por autor
      const autor = p.autor_id;
      if (autor) {
        const autorId = (typeof autor === 'object' && autor !== null) ? autor._id : autor;

        if (userStatsMap.has(autorId)) {
          userStatsMap.get(autorId).postCount++;
        } else {
          // Alguien que no está en la lista de participantes
          userStatsMap.set(autorId, {
            name: this.getMemberName(autor),
            role: 'Colaborador',
            postCount: 1,
            commentCount: 0
          });
        }
      }

      // Contar comentarios por autor de comentario
      if (p.comentarios && p.comentarios.length > 0) {
        p.comentarios.forEach((c: any) => {
          const comentarioAutor = c.usuario_id;
          if (!comentarioAutor) return;

          const comentarioAutorId = (typeof comentarioAutor === 'object' && comentarioAutor !== null) 
            ? comentarioAutor._id 
            : comentarioAutor;

          if (userStatsMap.has(comentarioAutorId)) {
            userStatsMap.get(comentarioAutorId).commentCount++;
          } else {
            // Usuario que solo ha comentado pero no es participante
            userStatsMap.set(comentarioAutorId, {
              name: this.getMemberName(comentarioAutor),
              role: 'Colaborador',
              postCount: 0,
              commentCount: 1
            });
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
