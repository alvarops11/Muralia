import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { AUTH_CONFIG } from '../../auth.config';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-wrapper fade-in">
      <div class="login-card">
        <div class="login-header">
           <h1>👋 Bienvenido a Muralia</h1>
           <p class="subtitle">Tu espacio de trabajo visual</p>
        </div>

        <!-- MODO TOKEN -->
        <div *ngIf="isTokenMode" class="token-section fade-in">
            <div class="form-group">
                <label>Token de acceso</label>
                <textarea [(ngModel)]="token" rows="5" placeholder="Pega tu token aquí..."></textarea>
            </div>
            
            <button (click)="saveToken()" class="btn btn-primary full-width" [disabled]="!token">
              Entrar al Espacio
            </button>
        </div>

        <!-- MODO LOGIN (EMAIL/PASS) -->
        <form *ngIf="!isTokenMode" [formGroup]="loginForm" (ngSubmit)="onLogin()" class="login-form fade-in">
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
            
            <div *ngIf="errorMessage" class="error-banner">
                <i class="fas fa-exclamation-circle"></i> {{ errorMessage }}
            </div>

            <button type="submit" class="btn btn-primary full-width" [disabled]="loginForm.invalid || isLoading">
                <span *ngIf="!isLoading">Iniciar sesión</span>
                <span *ngIf="isLoading">Cargando...</span>
            </button>
        </form>

        <div class="login-footer" *ngIf="!isTokenMode">
          <p>¿No tienes cuenta? <a routerLink="/register">Regístrate aquí</a></p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .login-wrapper { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #e0e7ff; }
    .fade-in { animation: fadeIn 0.3s ease-out; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .login-card { 
        background: white; 
        padding: 2.5rem; 
        border-radius: 20px; 
        box-shadow: 0 20px 50px rgba(0,0,0,0.1); 
        width: 100%; 
        max-width: 440px; 
    }
    
    .login-header { text-align: center; margin-bottom: 30px; }
    .login-header h1 { font-size: 1.8rem; margin: 0 0 10px 0; color: #1f2937; }
    .subtitle { color: #6b7280; font-size: 1rem; }

    /* Forms */
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; }
    .form-group label { font-weight: 600; color: #374151; font-size: 0.9rem; }
    .form-group input, textarea {
      padding: 12px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.2s ease;
      outline: none;
      width: 100%;
      box-sizing: border-box;
      font-family: inherit;
    }
    .form-group input:focus, textarea:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }
    .form-group input.error { border-color: #ef4444; }

    .btn {
       padding: 14px;
       border: none;
       border-radius: 12px;
       font-size: 1rem;
       font-weight: 600;
       cursor: pointer;
       transition: all 0.2s ease;
    }
    .btn-primary { 
        background: #4f46e5; 
        color: white; 
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
    .btn-primary:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(79, 70, 229, 0.4); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    
    .full-width { width: 100%; }

    .error-banner {
      background-color: #fef2f2;
      border: 1px solid #fee2e2;
      color: #b91c1c;
      padding: 12px;
      border-radius: 12px;
      margin-bottom: 20px;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .login-footer {
      text-align: center;
      margin-top: 25px;
      padding-top: 20px;
      border-top: 1px solid #f3f4f6;
    }
    .login-footer p { color: #6b7280; margin: 0; font-size: 0.9rem; }
    .login-footer a { color: #4f46e5; text-decoration: none; font-weight: 600; }
    .login-footer a:hover { text-decoration: underline; }

    @media (max-width: 480px) {
        .login-card { 
            padding: 1.5rem; 
            border-radius: 0;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }
        .login-wrapper { background: white; }
    }
  `]
})
export class LoginComponent {
  // Leemos la configuración
  isTokenMode = AUTH_CONFIG.authMode === 'TOKEN';
  token = '';

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  loginForm: FormGroup;
  errorMessage: string | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    // Reset error message when user modifies the form
    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage = null;
    });
  }

  saveToken() {
    if (this.token.trim()) {
      localStorage.setItem('jwt_token', this.token.trim());
      localStorage.removeItem('auth_user'); // Limpiar datos de sesión previos
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/boards';
      this.router.navigateByUrl(returnUrl);
    } else {
      this.notify.warning("Por favor, pega un token válido");
    }
  }

  onLogin() {
    if (this.loginForm.invalid) return;

    this.isLoading = true;
    this.authService.login(this.loginForm.value).subscribe({
      next: () => {
        this.isLoading = false;
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/boards';
        this.router.navigateByUrl(returnUrl);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Email o contraseña incorrectos';
        this.cdr.detectChanges();
      }
    });
  }
}