
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core'; // Usualmente Angular incluye ZoneChangeDetection por defecto, pero si no lo tienes, puedes ignorar esta importación específica
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http'; // <--- 1. IMPORTANTE: Añade esto

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    // provideBrowserGlobalErrorListeners() <-- Esto está bien si lo tenías, mantenlo
    provideRouter(routes),
    provideHttpClient(withFetch()) // <--- 2. AÑADE ESTO AQUÍ
  ]
};