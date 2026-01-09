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

    // Filtrar por categoría (simulada por ahora)
    if (this.filtroActual === 'Con archivos') {
      // Supongamos que tienen una propiedad archivos o algo similar
      // filtrados = filtrados.filter(p => p.tieneArchivos); 
    } else if (this.filtroActual === 'Destacados') {
      // filtrados = filtrados.filter(p => p.destacado);
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
