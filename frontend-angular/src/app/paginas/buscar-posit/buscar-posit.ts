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
  @Output() cerrar = new EventEmitter<void>();
  @Output() irAlPosit = new EventEmitter<string>();

  terminoBusqueda: string = '';
  filtroActual: string = 'Todos';

  get resultadosFiltrados() {
    if (!this.posits) return [];

    let filtrados = this.posits;

    // Filtrar por término de búsqueda
    if (this.terminoBusqueda.trim()) {
      const t = this.terminoBusqueda.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.titulo || '').toLowerCase().includes(t) ||
        (p.contenido || '').toLowerCase().includes(t)
      );
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
