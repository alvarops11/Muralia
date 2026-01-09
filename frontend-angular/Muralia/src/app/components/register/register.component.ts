// file: src/app/components/register/register.component.ts
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-register',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, RouterLink],
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.scss']
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

    // Validar que las contraseñas coincidan
    get passwordsMatch(): boolean {
        return this.registerForm.get('password')?.value === this.registerForm.get('confirmPassword')?.value;
    }

    onSubmit(): void {
        if (this.registerForm.invalid) {
            return;
        }

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
                // Navegar a la página principal con el token
                this.router.navigate(['/home']);
            },
            error: (error) => {
                this.isLoading = false;
                this.errorMessage = error.error?.error || 'Error al registrar usuario';
            }
        });
    }
}
