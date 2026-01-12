import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-container">
      <div class="login-card">
        <div class="login-header">
          <h1>Muralia</h1>
          <p>Tu espacio de trabajo visual</p>
        </div>

        <div class="tabs">
            <button 
                class="tab-btn" 
                [class.active]="mode === 'login'" 
                (click)="mode = 'login'">
                Iniciar Sesión
            </button>
            <button 
                class="tab-btn" 
                [class.active]="mode === 'token'" 
                (click)="mode = 'token'">
                Usar Token
            </button>
        </div>

        <div *ngIf="mode === 'token'" class="token-section fade-in">
            <div class="form-group">
                <label>Token de acceso</label>
                <textarea [(ngModel)]="token" rows="5" placeholder="Pega tu token aquí..."></textarea>
            </div>
            
            <button (click)="saveToken()" class="btn-login full-width" [disabled]="!token">
              Entrar al Espacio
            </button>
        </div>

        <form *ngIf="mode === 'login'" [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form fade-in">
            <div class="form-group">
                <label>Email</label>
                <input type="email" formControlName="email" placeholder="tu@email.com"
                    [class.error]="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" formControlName="password" placeholder="••••••••"
                    [class.error]="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">
            </div>
            
            <div class="alert alert-error" *ngIf="errorMessage">
                {{ errorMessage }}
            </div>

            <button type="submit" class="btn-login" [disabled]="loginForm.invalid || isLoading">
                <span *ngIf="!isLoading">Iniciar sesión</span>
                <span *ngIf="isLoading">Cargando...</span>
            </button>
        </form>

        <div class="login-footer">
          <p>¿No tienes cuenta? <a routerLink="/register">Regístrate aquí</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 20px;
    }

    .login-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
      padding: 40px;
      width: 100%;
      max-width: 420px;
      animation: slideUp 0.5s ease-out;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .login-header { text-align: center; margin-bottom: 20px; }
    .login-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0 0 10px 0;
    }
    .login-header p { color: #666; font-size: 1rem; margin: 0; }

    /* Tabs */
    .tabs { display: flex; margin-bottom: 1.5rem; border-bottom: 2px solid #eee; }
    .tab-btn { 
        flex: 1; 
        padding: 1rem; 
        background: none; 
        border: none; 
        border-bottom: 2px solid transparent; 
        cursor: pointer;
        font-weight: 600;
        color: #9ca3af;
        transition: all 0.3s ease;
        margin-bottom: -2px;
    }
    .tab-btn.active {
        color: #764ba2;
        border-bottom-color: #764ba2;
    }
    .tab-btn:hover:not(.active) { color: #6b7280; }

    .login-form, .token-section { display: flex; flex-direction: column; gap: 20px; }
    
    .form-group { display: flex; flex-direction: column; gap: 8px; }
    .form-group label { font-weight: 600; color: #333; font-size: 0.9rem; }
    .form-group input, textarea {
      padding: 14px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.3s ease;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }
    .form-group input:focus, textarea:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
    }
    .form-group input.error { border-color: #e74c3c; }

    .alert { padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; }
    .alert-error { background-color: #fdeaea; color: #e74c3c; border: 1px solid #f5c6cb; }

    .btn-login {
      padding: 14px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      width: 100%;
    }
    .btn-login:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
    .btn-login:disabled { opacity: 0.6; cursor: not-allowed; }

    .login-footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 25px;
      border-top: 1px solid #eee;
    }
    .login-footer p { color: #666; margin: 0; }
    .login-footer a { color: #667eea; text-decoration: none; font-weight: 600; transition: color 0.3s ease; }
    .login-footer a:hover { color: #764ba2; }
  `]
})
export class LoginComponent {
  mode: 'token' | 'login' = 'login';
  token = '';

  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  saveToken() {
    if (this.token.trim()) {
      localStorage.setItem('jwt_token', this.token.trim());
      this.router.navigate(['/boards']);
    }
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/boards']);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Error al iniciar sesión';
      }
    });
  }
}