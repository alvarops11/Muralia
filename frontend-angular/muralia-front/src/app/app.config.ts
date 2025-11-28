// archivo: src/app/app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Activamos las rutas y que puedan leer IDs de la URL
    provideRouter(routes, withComponentInputBinding()),
    // Activamos HTTP y enchufamos el Interceptor
    provideHttpClient(withInterceptors([authInterceptor])) 
  ]
};