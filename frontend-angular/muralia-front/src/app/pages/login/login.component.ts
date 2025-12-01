import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-wrapper fade-in">
      <div class="login-card">
        <h1>👋 Bienvenido a Muralia</h1>
        <p class="subtitle">Tu espacio de trabajo visual</p>
        
        <label>Introduce tu Token de acceso:</label>
        <textarea [(ngModel)]="token" rows="5" placeholder="eyJhbGciOi..."></textarea>
        
        <button (click)="saveToken()" class="btn btn-primary full-width">
          Entrar al Espacio
        </button>
      </div>
    </div>
  `,
  styles: [`
    .login-wrapper { display: flex; align-items: center; justify-content: center; height: 100vh; background: #e0e7ff; }
    .login-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); width: 100%; max-width: 400px; }
    .subtitle { color: #6b7280; margin-bottom: 20px; }
    .full-width { width: 100%; margin-top: 10px; font-size: 1rem; padding: 12px; }
  `]
})
export class LoginComponent {
  token = '';
  constructor(private router: Router) {}

  saveToken() {
    if(this.token.trim()) {
      localStorage.setItem('jwt_token', this.token.trim());
      this.router.navigate(['/boards']);
    } else { alert("Pega un token válido"); }
  }
}