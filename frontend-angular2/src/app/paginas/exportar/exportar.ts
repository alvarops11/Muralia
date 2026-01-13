import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-exportar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './exportar.html',
  styleUrl: './exportar.css',
})
export class Exportar {
  @Input() board: any;
  @Output() onClose = new EventEmitter<void>();

  opciones = {
    orientacion: 'p' as 'p' | 'l', // p = portrait, l = landscape
    incluirTitulo: true,
    incluirAutor: false,
    incluirFechas: true,
    incluirComentarios: true,
    incluirAdjuntos: false
  };

  close() {
    this.onClose.emit();
  }

  download() {
    const doc = new jsPDF({
      orientation: this.opciones.orientacion,
      unit: 'mm',
      format: 'a4'
    });

    let y = 20;

    // Título
    if (this.opciones.incluirTitulo && this.board) {
      doc.setFontSize(22);
      doc.setTextColor(92, 107, 192); // Color #5C6BC0
      doc.text(this.board.titulo || 'Mural sin título', 20, y);
      y += 10;
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text(this.board.descripcion || 'Sin descripción', 20, y);
      y += 15;
    }

    // Mapa de participantes para resolver nombres
    const participMap = new Map();
    this.board?.participantes?.forEach((pt: any) => {
      const u = pt.usuario_id;
      const uId = (typeof u === 'object' && u !== null) ? u._id : u;
      let uName = uId;
      if (typeof u === 'object' && u !== null) {
        uName = u.nombre || (u.email ? u.email.split('@')[0] : uId);
      } else if (typeof u === 'string' && u.includes('@')) {
        uName = u.split('@')[0];
      }
      participMap.set(uId, uName || 'Anónimo');
    });

    // Preparar datos para la tabla
    const body = (this.board?.posits || []).map((p: any) => {
      const row: any[] = [p.contenido];
      if (this.opciones.incluirAutor) {
        const u = p.autor_id;
        let uName = 'Anónimo';
        if (typeof u === 'object' && u !== null) {
          uName = u.nombre || (u.email ? u.email.split('@')[0] : (u._id || 'Anónimo'));
        } else if (typeof u === 'string') {
          uName = u.includes('@') ? u.split('@')[0] : (participMap.get(u) || u);
        }
        row.push(uName);
      }
      if (this.opciones.incluirFechas) row.push(new Date(p.fecha_creacion).toLocaleDateString());
      if (this.opciones.incluirComentarios) {
        const comments = (p.comentarios || []).map((c: any) => `- ${c.contenido}`).join('\n');
        row.push(comments || '-');
      }
      return row;
    });

    const head = [['Nota']];
    if (this.opciones.incluirAutor) head[0].push('Autor');
    if (this.opciones.incluirFechas) head[0].push('Fecha');
    if (this.opciones.incluirComentarios) head[0].push('Comentarios');

    autoTable(doc, {
      startY: y,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [92, 107, 192] },
      styles: { cellPadding: 5 }
    });

    doc.save(`Exportacion_${this.board?.titulo || 'Mural'}.pdf`);
    this.close();
  }
}
