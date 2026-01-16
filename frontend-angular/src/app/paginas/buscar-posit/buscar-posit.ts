import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-buscar-posit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './buscar-posit.html',
  styleUrl: './buscar-posit.css',
})
export class BuscarPosit {
  @Input() posits: any[] = [];
  @Input() board: any = null; // Recibir el board completo para acceder a participantes
  @Output() cerrar = new EventEmitter<void>();
  @Output() irAlPosit = new EventEmitter<string>();

  terminoBusqueda: string = '';
  filtroActual: string = 'Todos';

  // Helper para obtener nombre del usuario
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

  // Obtener nombre del autor de un posit
  getAutorName(posit: any): string {
    return this.getMemberName(posit.autor_id);
  }

  get resultadosFiltrados() {
    if (!this.posits) return [];

    let filtrados = this.posits;

    // Filtrar por término de búsqueda (título, contenido y autor)
    if (this.terminoBusqueda.trim()) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(p => {
        const tituloMatch = (p.titulo || '').toLowerCase().includes(t);
        const contenidoMatch = (p.contenido || '').toLowerCase().includes(t);
        const autorMatch = this.getAutorName(p).toLowerCase().includes(t);
        return tituloMatch || contenidoMatch || autorMatch;
      });
    }

    // Filtrar por categoría
    if (this.filtroActual === 'Con comentarios') {
      filtrados = filtrados.filter(p => p.comentarios && p.comentarios.length > 0);
    } else if (this.filtroActual === 'Destacados') {
      // Definimos destacados como los que tienen más de 1 comentario
      filtrados = filtrados.filter(p => p.comentarios && p.comentarios.length > 1);
    }

    return filtrados;
  }

  cambiarFiltro(f: string) {
    this.filtroActual = f;
  }

  seleccionar(id: string) {
    this.irAlPosit.emit(id);
    this.cerrar.emit();
  }
}
