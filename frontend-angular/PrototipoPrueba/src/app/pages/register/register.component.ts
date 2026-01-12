import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    template: `
<div class="register-container">
    <div class="register-card">
        <div class="register-header">
            <h1>Muralia</h1>
            <p>Crea tu cuenta para comenzar</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" formControlName="email" placeholder="tu@email.com"
                    [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                <span class="error-message"
                    *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                    Por favor, introduce un email válido
                </span>
            </div>

            <div class="form-group">
                <label for="password">Contraseña</label>
                <input type="password" id="password" formControlName="password" placeholder="••••••••"
                    [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                <span class="error-message"
                    *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                    La contraseña debe tener al menos 6 caracteres
                </span>
            </div>

            <div class="form-group">
                <label for="confirmPassword">Confirmar contraseña</label>
                <input type="password" id="confirmPassword" formControlName="confirmPassword" placeholder="••••••••"
                    [class.error]="!passwordsMatch && registerForm.get('confirmPassword')?.touched">
                <span class="error-message" *ngIf="!passwordsMatch && registerForm.get('confirmPassword')?.touched">
                    Las contraseñas no coinciden
                </span>
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label for="rol">Rol</label>
                    <select id="rol" formControlName="rol">
                        <option value="Alumno">Alumno</option>
                        <option value="Profesor">Profesor</option>
                        <option value="Admin">Admin</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="centro">Centro</label>
                    <input type="text" id="centro" formControlName="centro" placeholder="Tu centro">
                </div>
            </div>

            <div class="alert alert-error" *ngIf="errorMessage">
                {{ errorMessage }}
            </div>

            <button type="submit" class="btn-register"
                [disabled]="registerForm.invalid || !passwordsMatch || isLoading">
                <span *ngIf="!isLoading">Crear cuenta</span>
                <span *ngIf="isLoading">Creando...</span>
            </button>
        </form>

        <div class="register-footer">
            <p>¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
        </div>
    </div>
</div>
    `,
    styles: [`
.register-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.register-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
  padding: 40px;
  width: 100%;
  max-width: 500px;
  animation: slideUp 0.5s ease-out;
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
}

.register-header { text-align: center; margin-bottom: 30px; }
.register-header h1 {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 10px 0;
}
.register-header p { color: #666; font-size: 1rem; margin: 0; }

.register-form { display: flex; flex-direction: column; gap: 20px; }
.form-group { display: flex; flex-direction: column; gap: 8px; }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.form-group label { font-weight: 600; color: #333; font-size: 0.9rem; }
.form-group input, .form-group select {
  padding: 14px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
  background: white;
}
.form-group input:focus, .form-group select:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
}
.form-group input.error { border-color: #e74c3c; }

.error-message { color: #e74c3c; font-size: 0.8rem; }
.alert { padding: 12px 16px; border-radius: 10px; font-size: 0.9rem; }
.alert-error { background-color: #fdeaea; color: #e74c3c; border: 1px solid #f5c6cb; }

.btn-register {
  padding: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}
.btn-register:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
.btn-register:disabled { opacity: 0.6; cursor: not-allowed; }

.register-footer { text-align: center; margin-top: 25px; padding-top: 25px; border-top: 1px solid #eee; }
.register-footer p { color: #666; margin: 0; }
.register-footer a { color: #667eea; text-decoration: none; font-weight: 600; transition: color 0.3s ease; }
.register-footer a:hover { color: #764ba2; }
    `]
})
export class RegisterComponent {
    registerForm: FormGroup;
    errorMessage: string = '';
    isLoading: boolean = false;

    constructor(
        private fb: FormBuilder,
        private authService: AuthService,
        private router: Router
    ) {
        this.registerForm = this.fb.group({
            email: ['', [Validators.required, Validators.email]],
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', [Validators.required]],
            rol: ['Alumno'],
            centro: ['']
        });
    }

    get passwordsMatch(): boolean {
        return this.registerForm.get('password')?.value === this.registerForm.get('confirmPassword')?.value;
    }

    onSubmit(): void {
        if (this.registerForm.invalid) { return; }
        if (!this.passwordsMatch) {
            this.errorMessage = 'Las contraseñas no coinciden';
            return;
        }

        this.isLoading = true;
        this.errorMessage = '';

        const { email, password, rol, centro } = this.registerForm.value;

        this.authService.register({ email, password, rol, centro }).subscribe({
            next: (response) => {
                this.isLoading = false;
                this.router.navigate(['/boards']); // Redirect to boards as per requirements
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.error || 'Error al registrar usuario';
            }
        });
    }
}
