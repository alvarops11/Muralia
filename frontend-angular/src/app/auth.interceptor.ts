// archivo: src/app/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Buscamos el token en la memoria del navegador
  const token = localStorage.getItem('jwt_token');

  // Si existe, lo pegamos en la cabecera "Authorization"
  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
        'X-Tunnel-Skip-Anti-Phishing-Threshold': 'true'
      }
    });
    return next(cloned);
  }

  // Incluso sin token, añadimos la cabecera del tunnel para evitar la página de aviso
  const tunnelCloned = req.clone({
    setHeaders: { 'X-Tunnel-Skip-Anti-Phishing-Threshold': 'true' }
  });

  return next(tunnelCloned);
};