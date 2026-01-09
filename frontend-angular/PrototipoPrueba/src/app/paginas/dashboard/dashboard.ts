import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';

interface Board {
  _id: string;
  titulo: string;
  privacidad: 'privado' | 'publico';
  creador: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  standalone: true
})
export class Dashboard implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  boards: Board[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';

  // Custom Modal State
  showDeleteModal = false;
  boardToDelete: Board | null = null;

  // Create Modal State
  showCreateModal = false;
  newBoardTitle = '';
  newBoardDescription = '';
  newBoardPrivacy: 'publico' | 'privado' = 'privado';


  ngOnInit() {
    // Set default JWT token for API authentication
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c2VyIjoidXNlcl83OCIsImVtYWlsIjoianVhbnBlcmV6LjEyQGNhbXB1c2NhbWFyYS5lcyIsInJvbCI6IlByb2Zlc29yIiwiY2VudHJvIjoiTWFkcmlkIiwiaWF0IjoxNzY0NTk1NjQzfQ.Mzi3om-pXfFkvhydh9Klvsh5kEhfF4DGF_v-hBzuiMI';
    localStorage.setItem('jwt_token', token);

    this.loadBoards();
  }

  loadBoards() {
    // Solo mostramos el cargador principal si no hay tableros
    if (this.boards.length === 0) {
      this.loading = true;
    }
    this.error = null;

    this.api.getBoards().subscribe({
      next: (data) => {
        this.boards = data;
        this.loading = false;
        this.cdr.detectChanges(); // Forzar actualización de UI
      },
      error: (err) => {
        this.error = 'Error al cargar los murales. Por favor, intenta de nuevo.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openCreateModal() {
    this.newBoardTitle = '';
    this.newBoardDescription = '';
    this.newBoardPrivacy = 'privado';
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  confirmCreateBoard() {
    if (!this.newBoardTitle.trim()) {
      alert('Por favor, ingresa un nombre para el mural.');
      return;
    }

    const payload = {
      titulo: this.newBoardTitle.trim(),
      descripcion: this.newBoardDescription.trim(),
      privacidad: this.newBoardPrivacy
    };

    console.log('[Dashboard] Creando mural:', payload);

    this.api.createBoard(payload).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadBoards(); // Reload the boards list
      },
      error: (err) => {
        console.error('Error creating board:', err);
        alert('Error al crear el mural. Por favor, intenta de nuevo.');
      }
    });
  }

  deleteBoard(board: Board, event: Event) {
    event.stopPropagation(); // Prevent card click
    this.boardToDelete = board;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.boardToDelete = null;
  }

  confirmDelete() {
    if (!this.boardToDelete) return;

    const id = this.boardToDelete._id;
    this.showDeleteModal = false;
    this.boardToDelete = null;

    this.api.deleteBoard(id).subscribe({
      next: () => {
        this.loadBoards(); // Reload after deletion
      },
      error: (err) => {
        alert('Error al eliminar el mural. Por favor, intenta de nuevo.');
      }
    });
  }


  navigateToBoard(id: string) {
    this.router.navigate(['/board', id]);
  }

  get filteredBoards() {
    if (!this.searchTerm.trim()) return this.boards;

    const term = this.searchTerm.toLowerCase();
    return this.boards.filter(board =>
      board.titulo.toLowerCase().includes(term)
    );
  }
}
