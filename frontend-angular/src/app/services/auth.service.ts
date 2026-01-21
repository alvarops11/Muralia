import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { AUTH_CONFIG } from '../auth.config';

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
    centro?: string | null;
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
    private readonly TOKEN_KEY = 'jwt_token';
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

    /**
     * Obtener el nombre del usuario basado en la estrategia configurada
     */
    getUserName(): string {
        const isTokenMode = AUTH_CONFIG.authMode === 'TOKEN';

        // 1. Si estamos en modo TOKEN, usamos solo el token del LS
        if (isTokenMode) {
            const token = this.getToken();
            if (token) {
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payloadPart = parts[1];
                        let base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
                        while (base64.length % 4) { base64 += '='; }

                        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
                            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                        }).join(''));

                        const payload = JSON.parse(jsonPayload);
                        if (payload.email) return payload.email.split('@')[0];
                        if (payload.name || payload.nombre) return payload.name || payload.nombre;
                    }
                } catch (e) {
                    console.error('Error decoding token', e);
                }
            }
            return 'Invitado';
        }

        // 2. Si estamos en modo LOGIN, usamos los datos del usuario guardado
        const userStr = localStorage.getItem(this.USER_KEY);
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.email?.split('@')[0] || 'Usuario';
            } catch (e) {
                console.error('Error parsing user', e);
            }
        }

        return 'Usuario';
    }

    /**
     * Obtener el ID del usuario
     */
    getUserId(): string | null {
        const userStr = localStorage.getItem(this.USER_KEY);
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                return user.id || user._id || null;
            } catch (e) {
                return null;
            }
        }
        return null;
    }
}
