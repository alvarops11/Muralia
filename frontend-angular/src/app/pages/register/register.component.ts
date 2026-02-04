import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="login-wrapper fade-in">
      <div class="login-card">
        <div class="login-header">
           <h1>✨ Crea tu cuenta</h1>
           <p class="subtitle">Únete a Muralia hoy mismo</p>
        </div>

        <form [formGroup]="registerForm" (ngSubmit)="onRegister()" class="login-form fade-in">
            <div class="form-group">
                <label>Email</label>
                <input type="email" formControlName="email" placeholder="tu@email.com"
                    [class.error]="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                <small class="error-text" *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">
                  Email inválido
                </small>
            </div>

            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" formControlName="password" placeholder="••••••••"
                    [class.error]="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">
                <small class="error-text" *ngIf="registerForm.get('password')?.errors?.['minlength'] && registerForm.get('password')?.touched">
                  Mínimo 6 caracteres
                </small>
            </div>

            <div class="form-group">
                <label>Confirmar Contraseña</label>
                <input type="password" formControlName="confirmPassword" placeholder="••••••••"
                    [class.error]="(registerForm.errors?.['mismatch'] || registerForm.get('confirmPassword')?.invalid) && registerForm.get('confirmPassword')?.touched">
                <small class="error-text" *ngIf="registerForm.errors?.['mismatch'] && registerForm.get('confirmPassword')?.touched">
                  Las contraseñas no coinciden
                </small>
            </div>

            <div class="form-group">
                <label>Rol</label>
                <select formControlName="rol" class="form-select">
                    <option value="Alumno">Alumno</option>
                    <option value="Profesor">Profesor</option>
                    <option value="Administrador">Admin</option>
                </select>
            </div>
            
            <div *ngIf="errorMessage" class="error-banner">
                <i class="fas fa-exclamation-circle"></i> {{ errorMessage }}
            </div>

            <button type="submit" class="btn btn-primary full-width" [disabled]="registerForm.invalid || isLoading">
                <span *ngIf="!isLoading">Crear Cuenta</span>
                <span *ngIf="isLoading">Procesando...</span>
            </button>
        </form>

        <div class="login-footer">
          <p>¿Ya tienes cuenta? <a routerLink="/login">Inicia sesión</a></p>
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
    .form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px; position: relative; }
    .form-group label { font-weight: 600; color: #374151; font-size: 0.9rem; }
    .form-group input, .form-select {
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
    .form-group input:focus, .form-select:focus {
      border-color: #4f46e5;
      box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1);
    }
    .form-group input.error { border-color: #ef4444; }
    .error-text { color: #ef4444; font-size: 0.75rem; margin-top: -4px; }

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
export class RegisterComponent {
  private router = inject(Router);
  private notify = inject(NotificationService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);

  isLoading = false;
  registerForm: FormGroup;
  errorMessage: string | null = null;

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      rol: ['Alumno', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    // Reset error message when user modifies the form
    this.registerForm.valueChanges.subscribe(() => {
      this.errorMessage = null;
    });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  onRegister() {
    if (this.registerForm.invalid) {
      this.notify.error("Por favor, revisa el formulario");
      return;
    }

    this.isLoading = true;

    // Prune unnecessary fields (like confirmPassword) before sending to backend
    const { email, password, rol } = this.registerForm.value;
    const registrationData = {
      email,
      password,
      rol,
      centro: null // Field expected by backend schema
    };

    console.log('--- DEBUG REGISTRO ---');
    console.log('Payload:', JSON.stringify(registrationData));

    this.authService.register(registrationData).subscribe({
      next: () => {
        this.isLoading = false;
        this.notify.success("¡Cuenta creada con éxito!");
        this.router.navigate(['/boards']);
      },
      error: (err) => {
        this.isLoading = false;
        console.error('--- ERROR REGISTRO (Full) ---', err);

        let errorMsg = 'Error al crear la cuenta';

        if (err.error) {
          // Case 1: error is an object
          if (typeof err.error === 'object') {
            errorMsg = err.error.error || err.error.message || errorMsg;

            // Zod details
            if (err.error.details && Array.isArray(err.error.details)) {
              const details = err.error.details.map((d: any) => d.message || d).join(', ');
              errorMsg += `: ${details}`;
            }
          }
          // Case 2: error is a string
          else if (typeof err.error === 'string') {
            try {
              const parsed = JSON.parse(err.error);
              errorMsg = parsed.error || parsed.message || errorMsg;
            } catch (e) {
              errorMsg = err.error;
            }
          }
        } else if (err.message) {
          errorMsg = err.message;
        }

        console.log('Error extraído:', errorMsg);
        this.errorMessage = errorMsg;
        this.cdr.detectChanges();
      }
    });
  }
}
