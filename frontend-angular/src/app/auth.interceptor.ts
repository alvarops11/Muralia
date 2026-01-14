// archivo: src/app/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Buscamos el token en la memoria del navegador
  const token = localStorage.getItem('jwt_token');

  // Si existe, lo pegamos en la cabecera "Authorization"
  if (token) {
    const cloned = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
    return next(cloned);
  }
  
  return next(req);
};