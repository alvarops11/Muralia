// file: src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

interface AuthResponse {
    message: string;
    token: string;
    user: {
        id: string;
        email: string;
        rol: string;
        centro?: string;
    };
}

interface RegisterData {
    email: string;
    password: string;
    rol?: string;
    centro?: string;
}

interface LoginData {
    email: string;
    password: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly API_URL = 'http://localhost:3000/api/auth';
    private readonly TOKEN_KEY = 'auth_token';
    private readonly USER_KEY = 'auth_user';

    constructor(private http: HttpClient, private router: Router) { }

    /**
     * Registrar un nuevo usuario
     */
    register(data: RegisterData): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/register`, data).pipe(
            tap(response => {
                this.saveToken(response.token);
                this.saveUser(response.user);
            })
        );
    }

    /**
     * Iniciar sesión
     */
    login(data: LoginData): Observable<AuthResponse> {
        return this.http.post<AuthResponse>(`${this.API_URL}/login`, data).pipe(
            tap(response => {
                this.saveToken(response.token);
                this.saveUser(response.user);
            })
        );
    }

    /**
     * Cerrar sesión
     */
    logout(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        this.router.navigate(['/login']);
    }

    /**
     * Obtener el token actual
     */
    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    /**
     * Obtener el usuario actual
     */
    getUser(): any {
        const user = localStorage.getItem(this.USER_KEY);
        return user ? JSON.parse(user) : null;
    }

    /**
     * Verificar si el usuario está autenticado
     */
    isAuthenticated(): boolean {
        const token = this.getToken();
        return !!token;
    }

    /**
     * Guardar token en localStorage
     */
    private saveToken(token: string): void {
        localStorage.setItem(this.TOKEN_KEY, token);
    }

    /**
     * Guardar usuario en localStorage
     */
    private saveUser(user: any): void {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
}
