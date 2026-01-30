# Configuración de Puerto Centralizada

## Descripción
Se ha centralizado la configuración de puerto y host para facilitar el cambio de configuración desde un solo lugar.

## Cambios Realizados

### Backend (`backend-api`)

1. **Archivo `.env`**
   - Agregado: `HOST=0.0.0.0` para permitir conexiones desde otros ordenadores
   - Variable `PORT=3000` ya existente

2. **Archivo `src/server.ts`**
   - El servidor ahora lee el `HOST` del archivo `.env`
   - Modificado `httpServer.listen()` para usar ambas variables `PORT` y `HOST`

### Frontend (`frontend-angular`)

1. **Archivos de entorno creados:**
   - `src/environments/environment.ts` - Configuración de desarrollo
   - `src/environments/environment.prod.ts` - Configuración de producción

2. **Servicios actualizados para usar `environment.apiUrl`:**
   - `src/services/websocket.service.ts`
   - `src/app/services/auth.service.ts`
   - `src/app/api.service.ts`
   - `src/app/paginas/mural/mural.ts`
   - `src/app/paginas/exportar/exportar.ts`

## Cómo Usar

### Para Cambiar el Puerto

1. **Backend**: Edita `backend-api/.env` y cambia el valor de `PORT`:
   ```
   PORT=4000
   HOST=0.0.0.0
   ```

2. **Frontend**: Edita `frontend-angular/src/environments/environment.ts`:
   ```typescript
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:4000'
   };
   ```

### Para Acceder desde Otro Ordenador

1. El backend ya está configurado para aceptar conexiones en `0.0.0.0`

2. Ejecuta el backend:
   ```bash
   cd backend-api
   npm start
   ```

3. Ejecuta el frontend permitiendo acceso externo:
   ```bash
   cd frontend-angular
   npm start -- --host 0.0.0.0
   ```
   
   **Nota**: Si tienes Angular CLI instalado globalmente, también puedes usar:
   ```bash
   ng serve --host 0.0.0.0
   ```

4. Desde otro ordenador, accede usando la IP local de tu ordenador:
   - Frontend: `http://TU_IP:4200`
   - Backend estará disponible en: `http://TU_IP:3000`

### Encontrar tu IP Local

**Windows (PowerShell):**
```powershell
ipconfig
```
Busca la dirección IPv4 en tu adaptador de red activo (ej: 192.168.1.100)

## Notas Importantes

- Asegúrate de que el firewall de Windows permita conexiones en los puertos que uses
- Para producción, reemplaza `localhost` con la URL de tu servidor en `environment.prod.ts`
- El valor de `HOST` en el backend debe ser `0.0.0.0` para aceptar conexiones desde cualquier interfaz de red
