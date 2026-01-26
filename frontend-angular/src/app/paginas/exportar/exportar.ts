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

  // --- HELPER LOGIC (Ported from estadisticas.ts) ---

  getMemberName(u: any): string {
    if (!u) return 'Anónimo';

    // 1. Si es un string (Email o ID directo)
    if (typeof u === 'string') {
      const str = u.trim();
      if (str.includes('@')) return str.split('@')[0];
      if (str.startsWith('guest_')) return 'Invitado';
      // Limpiar prefijo usuario_ si queda
      return str.replace(/^usuario_/, '').slice(0, 12);
    }

    // 2. Si es un objeto
    if (typeof u === 'object') {
      // Prioridad 1: Nombramientos directos
      if (u.nombre) return u.nombre;
      if (u.nombre_autor) return u.nombre_autor;

      // Prioridad 2: Usuario poblado
      if (u.email) return u.email.split('@')[0];

      // Prioridad 3: Recursión de IDs
      const subId = u.autor_id || u.usuario_id;
      if (subId && subId !== u) {
        return this.getMemberName(subId);
      }

      // Prioridad 4: Guest ID
      if (u.guest_id) return 'Invitado';

      // Fallback
      const objId = u._id || u.posit_id;
      if (objId) return String(objId).replace(/^usuario_/, '').slice(0, 12);
    }

    return 'Anónimo';
  }

  private cleanId(id: any): string {
    if (!id) return '';
    const str = String(id).trim();
    return str.replace(/^usuario_/, '');
  }

  private getUserKey(u: any): string {
    if (!u) return 'unknown';

    if (typeof u === 'string') return this.cleanId(u);

    if (typeof u === 'object') {
      // 1. Prioridad: Wrappers
      if (u.usuario_id) {
        const uid = typeof u.usuario_id === 'object' ? u.usuario_id._id : u.usuario_id;
        return this.cleanId(uid);
      }
      if (u.guest_id) return this.cleanId(u.guest_id);

      // 2. ID Directo
      if (u._id) return this.cleanId(u._id);

      // 3. Fallbacks nombre
      if (u.nombre) return 'name_' + u.nombre;
      if (u.nombre_autor) return 'name_' + u.nombre_autor;
    }

    return 'unknown';
  }

  download() {
    const doc = new jsPDF({
      orientation: this.opciones.orientacion,
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let y = margin;

    // --- HEADER ---
    if (this.opciones.incluirTitulo && this.board) {
      // Título Principal
      doc.setFontSize(24);
      doc.setTextColor(55, 65, 81); // Gris Oscuro
      doc.setFont('helvetica', 'bold');
      const title = this.board.titulo || 'Mural sin título';
      const titleLines = doc.splitTextToSize(title, contentWidth);
      doc.text(titleLines, margin, y + 8);
      y += (titleLines.length * 10) + 5;

      // Descripción
      doc.setFontSize(11);
      doc.setTextColor(107, 114, 128); // Gris Medio
      doc.setFont('helvetica', 'normal');
      const desc = this.board.descripcion || 'Sin descripción';
      const descLines = doc.splitTextToSize(desc, contentWidth);
      doc.text(descLines, margin, y);
      y += (descLines.length * 6) + 10;

      // Separador Header
      doc.setDrawColor(229, 231, 235); // Gris muy claro
      doc.setLineWidth(0.5);
      doc.line(margin, y, pageWidth - margin, y);
      y += 10;
    }

    // --- PREPARAR MAPA DE NOMBRES ---
    const participMap = new Map();
    this.board?.participantes?.forEach((pt: any) => {
      const key = this.getUserKey(pt);
      const name = this.getMemberName(pt);
      participMap.set(key, name);
    });

    // --- DIBUJAR POSITS (TARJETAS) ---
    const posits = this.board?.posits || [];

    posits.forEach((p: any) => {
      // 1. Calcular alturas para verificar salto de página

      // Título del Posit
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const pTitle = (p.titulo && p.titulo !== 'Nota sin título') ? p.titulo.toUpperCase() : 'NOTA';
      const pTitleLines = doc.splitTextToSize(pTitle, contentWidth - 10); // -10 padding interno
      const hTitle = pTitleLines.length * 6;

      // Meta Info (Autor - Fecha)
      const hMeta = 8;

      // Contenido
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const pContent = p.contenido || '(Sin contenido)';
      const pContentLines = doc.splitTextToSize(pContent, contentWidth - 10);
      const hContent = pContentLines.length * 5;

      // Adjunto
      let hAdjunto = 0;
      let cleanFileName = '';
      if (this.opciones.incluirAdjuntos && p.archivoNombre) {
        hAdjunto = 10;
        cleanFileName = p.archivoNombre;
        if (doc.getTextWidth(cleanFileName) > (contentWidth - 20)) {
          // Truncate simple
          cleanFileName = cleanFileName.substring(0, 40) + '...';
        }
      }

      // Comentarios
      let hComments = 0;
      let commentLines: string[] = [];
      if (this.opciones.incluirComentarios && p.comentarios?.length > 0) {
        hComments += 8; // Separador y titulo 'Comentarios'
        p.comentarios.forEach((c: any) => {
          const comAutorObj = c.usuario_id || { nombre: c.nombre };
          const comKey = this.getUserKey(comAutorObj);
          let comName = participMap.get(comKey);
          if (!comName) comName = this.getMemberName(comAutorObj);

          const line = `${comName}: ${c.contenido}`;
          const wrapped = doc.splitTextToSize(line, contentWidth - 15); // Margen extra para comentarios
          commentLines.push(...wrapped);
        });
        hComments += commentLines.length * 5;
        hComments += 5; // Padding bottom extra
      }

      // Altura Total de la Tarjeta
      const cardHeight = 10 + hTitle + hMeta + hContent + 5 + hAdjunto + hComments;

      // Check Page Break
      if (y + cardHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }

      // --- DIBUJAR TARJETA ---

      // Fondo (Rectángulo redondeado)
      // Usaremos color suave por defecto o un borde coloreado según el color del posit
      const positColorMap: { [key: string]: string } = {
        '#fef3c7': '#F59E0B', // Amarillo -> Amber
        '#a5f3fc': '#06B6D4', // Azul -> Cyan
        '#fbcfe8': '#EC4899', // Rosa -> Pink
        '#bbf7d0': '#22C55E', // Verde -> Green
        '#fed7aa': '#F97316'  // Naranja -> Orange
      };
      const borderColor = positColorMap[p.color] || '#9CA3AF'; // Gris por defecto

      // Borde izquierdo coloreado
      doc.setFillColor(borderColor);
      doc.rect(margin, y, 2, cardHeight, 'F');

      // Borde suave caja principal
      doc.setDrawColor(229, 231, 235);
      doc.rect(margin + 2, y, contentWidth - 2, cardHeight, 'S');

      let currentY = y + 8;
      const textX = margin + 6; // Padding left

      // 1. Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(31, 41, 55);
      doc.text(pTitleLines, textX, currentY);
      currentY += hTitle;

      // 2. Meta Info
      if (this.opciones.incluirAutor || this.opciones.incluirFechas) {
        let metaParts = [];

        if (this.opciones.incluirAutor) {
          const autorObj = p.autor_id ? p.autor_id : { nombre: p.nombre_autor };
          const autorKey = this.getUserKey(autorObj);
          let uName = participMap.get(autorKey);

          if (!uName) {
            const tempName = this.getMemberName(autorObj);
            for (const [k, v] of participMap.entries()) {
              if (v === tempName) { uName = v; break; }
            }
            if (!uName) uName = tempName;
          }
          metaParts.push(uName || 'Anónimo');
        }

        if (this.opciones.incluirFechas) {
          metaParts.push(new Date(p.fecha_creacion).toLocaleDateString());
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(156, 163, 175); // Gray 400
        doc.text(metaParts.join(' • '), textX, currentY);
        currentY += hMeta;
      }

      // 3. Contenido
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(55, 65, 81);
      doc.text(pContentLines, textX, currentY);
      currentY += hContent + 2;

      // 4. Adjunto
      if (hAdjunto > 0) {
        doc.setTextColor(37, 99, 235); // Blue 600
        doc.setFontSize(10);
        doc.text(`📎 ${cleanFileName}`, textX, currentY + 3);

        // Clickable Link
        if (p.archivoUrl) {
          const linkUrl = `http://localhost:3000${p.archivoUrl}`;
          const linkWidth = doc.getTextWidth(`📎 ${cleanFileName}`);
          doc.link(textX, currentY - 2, linkWidth, 6, { url: linkUrl });
        }
        currentY += hAdjunto;
      }

      // 5. Comentarios
      if (hComments > 0) {
        currentY += 2;
        // Línea separadora fina
        doc.setDrawColor(243, 244, 246);
        doc.line(textX, currentY, margin + contentWidth - 5, currentY);
        currentY += 5;

        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text('COMENTARIOS', textX, currentY);
        currentY += 4;

        doc.setFontSize(9);
        doc.setTextColor(75, 85, 99);
        doc.text(commentLines, textX, currentY);
      }

      // Avanzar Y para la siguiente tarjeta
      y += cardHeight + 5; // 5mm margin bottom entre tarjetas
    });

    doc.save(`Mural_${this.board?.titulo || 'Export'}.pdf`);
    this.close();
  }
}
