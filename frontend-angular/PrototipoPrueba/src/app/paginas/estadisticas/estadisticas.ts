import { Component, Input } from '@angular/core';
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
    if (typeof u === 'object') {
      if (u.nombre) return u.nombre;
      if (u.email) return u.email.split('@')[0];
      return u._id ? (u._id + '').slice(0, 10) : 'Usuario';
    }
    const str = u + '';
    return str.includes('@') ? str.split('@')[0] : str.slice(0, 10);
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
        postCount: 0
      });
    });

    // 2. Contar posts por autor
    this.board.posits?.forEach((p: any) => {
      const u = p.autor_id;
      if (!u) return;

      const uId = (typeof u === 'object' && u !== null) ? u._id : u;

      if (userStatsMap.has(uId)) {
        userStatsMap.get(uId).postCount++;
      } else {
        // Alguien que no está en la lista de participantes
        userStatsMap.set(uId, {
          name: this.getMemberName(u),
          role: 'Colaborador',
          postCount: 1
        });
      }
    });

    return Array.from(userStatsMap.values()).sort((a, b) => b.postCount - a.postCount);
  }
}
