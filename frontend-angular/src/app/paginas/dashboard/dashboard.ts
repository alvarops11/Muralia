import { Component, OnInit, inject, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../api.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

interface Board {
  _id: string;
  titulo: string;
  privacidad: 'privado' | 'publico' | 'enlace-abierto';
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
  private auth = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private notify = inject(NotificationService);

  boards: Board[] = [];
  loading = true;
  error: string | null = null;
  searchTerm = '';
  userName = '';

  // Custom Modal State
  showDeleteModal = false;
  boardToDelete: Board | null = null;

  // Create Modal State
  showCreateModal = false;
  newBoardTitle = '';
  newBoardDescription = '';
  newBoardPrivacy: 'publico' | 'privado' | 'enlace-abierto' = 'enlace-abierto';

  // User Menu State
  showUserMenu = false;


  ngOnInit() {
    // Check for token
    const token = localStorage.getItem('jwt_token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.userName = this.auth.getUserName();
    this.cdr.detectChanges();
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
    this.newBoardPrivacy = 'enlace-abierto';
    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  confirmCreateBoard() {
    if (!this.newBoardTitle.trim()) {
      this.notify.warning('Por favor, ingresa un nombre para el mural.');
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
        const msg = err.error?.messages?.join(', ') || err.error?.error || 'Error al crear el mural';
        this.notify.error(msg);
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
        this.notify.error('Error al eliminar el mural. Por favor, intenta de nuevo.');
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

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    if (this.showUserMenu) {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-profile-container')) {
        this.closeUserMenu();
      }
    }
  }

  logout() {
    this.auth.logout();
  }
}
