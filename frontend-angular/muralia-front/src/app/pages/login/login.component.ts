// archivo: src/app/pages/login/login.component.ts
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div style="padding: 40px; max-width: 600px; margin: 0 auto; font-family: sans-serif;">
      <h1>🔑 Acceso Simulado</h1>
      <p>Pega aquí tu Token JWT:</p>
      
      <textarea [(ngModel)]="token" rows="6" 
        style="width: 100%; padding: 10px; font-family: monospace;" 
        placeholder="eyJhbGciOi..."></textarea>
      
      <br><br>
      <button (click)="saveToken()" style="padding: 10px 20px; cursor: pointer; background: #007bff; color: white; border: none;">
        Guardar y Entrar
      </button>
    </div>
  `
})
export class LoginComponent {
  token = '';
  constructor(private router: Router) {}

  saveToken() {
    if(this.token.trim()) {
      localStorage.setItem('jwt_token', this.token.trim());
      this.router.navigate(['/boards']);
    } else {
      alert("Pega un token primero");
    }
  }
}