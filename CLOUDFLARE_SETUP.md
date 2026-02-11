# Guía de Configuración de Cloudflare Tunnel para Muralia

Esta guía explica cómo usar Cloudflare Tunnel para acceder a tu aplicación Muralia desde cualquier red.

## ¿Qué es Cloudflare Tunnel?

Cloudflare Tunnel (cloudflared) es una herramienta **gratuita** que crea túneles seguros entre tu computadora y los servidores de Cloudflare, permitiendo que tus aplicaciones locales sean accesibles desde Internet sin necesidad de:

- ❌ Abrir puertos en el router
- ❌ Configurar port forwarding
- ❌ Tener una IP pública estática
- ❌ Configurar certificados SSL (Cloudflare lo hace por ti)

## Instalación de cloudflared

### Opción 1: Usando winget (Recomendado)

La forma más fácil es usar Windows Package Manager:

```bash
winget install --id Cloudflare.cloudflared
```

### Opción 2: Descarga Manual

1. Ve a la página de releases: https://github.com/cloudflare/cloudflared/releases
2. Descarga `cloudflared-windows-amd64.exe` de la última versión
3. Renombra el archivo a `cloudflared.exe`
4. Colócalo en una de estas ubicaciones:
   - En la carpeta del proyecto (`c:\Users\DAW2\Desktop\proyectoPI\Muralia\`)
   - En una carpeta en tu PATH (ej: `C:\Windows\System32\`)

### Verificar Instalación

Abre una terminal y ejecuta:

```bash
cloudflared --version
```

Deberías ver algo como: `cloudflared version 2024.x.x`

## Uso del Script Modificado

### Inicio Rápido

1. Abre una terminal en la carpeta del proyecto
2. Ejecuta:
   ```bash
   lanzar-proyecto.bat
   ```

3. El script hará lo siguiente:
   - ✅ Verificar que cloudflared esté instalado
   - ✅ Iniciar el backend en el puerto 3000
   - ✅ Crear un túnel de Cloudflare para el backend
   - ✅ Actualizar automáticamente la configuración del frontend con la URL del backend
   - ✅ Iniciar el frontend en el puerto 4200
   - ✅ Crear un túnel de Cloudflare para el frontend
   - ✅ Mostrar las URLs públicas generadas
   - ✅ Abrir el navegador con la URL del frontend

4. Al final verás algo como:
   ```
   ========================================
     MURALIA - PROYECTO LANZADO
   ========================================
   
    Backend (API):      https://abc123.trycloudflare.com
    Frontend (App):     https://xyz789.trycloudflare.com
   ```

5. **Comparte la URL del Frontend** con quien necesites. Funcionará desde **cualquier red**.

### Ventanas Abiertas

El script abrirá 4 ventanas de comando:
- **Muralia Backend**: La API de Node.js
- **Muralia Frontend**: La aplicación Angular
- **Cloudflare Tunnel - Backend**: El túnel para el backend
- **Cloudflare Tunnel - Frontend**: El túnel para el frontend

**IMPORTANTE**: No cierres estas ventanas mientras uses la aplicación.

## URLs Temporales vs Permanentes

### URLs Temporales (Por Defecto)

Por defecto, las URLs generadas son **temporales**:
- ✅ No requieren autenticación
- ✅ Funcionan inmediatamente
- ❌ Cambian cada vez que reinicias el proyecto
- ❌ Ejemplo: `https://random-words-1234.trycloudflare.com`

### URLs Permanentes (Recomendado para Producción)

Si necesitas URLs que **no cambien**, puedes crear un túnel nombrado:

#### 1. Crear Cuenta en Cloudflare (Gratis)

1. Ve a https://dash.cloudflare.com/sign-up
2. Crea una cuenta gratuita
3. No necesitas tener un dominio

#### 2. Autenticar cloudflared

```bash
cloudflared tunnel login
```

Esto abrirá un navegador donde autorizarás cloudflared.

#### 3. Crear un Túnel Nombrado

```bash
# Crear túnel para el backend
cloudflared tunnel create muralia-backend

# Crear túnel para el frontend
cloudflared tunnel create muralia-frontend
```

#### 4. Configurar el Túnel

Crea un archivo `cloudflared-config.yml` en la carpeta del proyecto:

```yaml
tunnel: muralia-backend
credentials-file: C:\Users\DAW2\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: muralia-backend.tudominio.com
    service: http://localhost:3000
  - service: http_status:404
```

#### 5. Ejecutar con Configuración

```bash
cloudflared tunnel --config cloudflared-config.yml run muralia-backend
```

**Nota**: Para esto necesitarás un dominio. Si no tienes uno, las URLs temporales son la mejor opción.

## Solución de Problemas

### Error: "cloudflared no está instalado"

**Causa**: El sistema no encuentra cloudflared en el PATH.

**Solución**:
1. Verifica que cloudflared.exe esté en tu PATH
2. O colócalo en la carpeta del proyecto
3. O reinstala usando `winget install --id Cloudflare.cloudflared`

### Error: "No se pudo detectar la URL automáticamente"

**Causa**: El script no pudo extraer la URL del log de cloudflared.

**Solución**:
1. Busca la ventana "Cloudflare Tunnel - Backend" o "Cloudflare Tunnel - Frontend"
2. Busca una línea que diga algo como:
   ```
   2024-01-01T12:00:00Z INF |  https://random-abc-123.trycloudflare.com  |
   ```
3. Copia esa URL y úsala manualmente
4. Para el backend, actualiza `frontend-angular\src\app\config\urls.config.ts`

### Error CORS en el Frontend

**Causa**: El backend no permite peticiones desde el dominio de Cloudflare.

**Solución**:
El backend ya debería tener CORS configurado. Si ves errores:
1. Abre `backend-api\src\server.ts`
2. Verifica que CORS esté configurado así:
   ```typescript
   app.use(cors({
     origin: '*', // Permite todos los orígenes
     credentials: true
   }));
   ```

### Las URLs no funcionan desde otra red

**Verificación**:
1. Asegúrate de que todas las ventanas sigan abiertas
2. Verifica que no haya errores en las ventanas de túnel
3. Intenta acceder primero desde tu red local para confirmar que funciona
4. Asegúrate de estar usando HTTPS (no HTTP)

### El Frontend no se conecta al Backend

**Causa**: La URL del backend no se actualizó correctamente.

**Solución**:
1. Abre `frontend-angular\src\app\config\urls.config.ts`
2. Verifica que `API_URL` tenga la URL correcta del túnel del backend
3. Si no es correcta, actualízala manualmente:
   ```typescript
   export const CONFIG = {
     API_URL: 'https://tu-backend-url.trycloudflare.com'
   };
   ```
4. Reinicia el frontend (Ctrl+C en la ventana "Muralia Frontend" y vuelve a ejecutar `npm start`)

## Seguridad

### ⚠️ IMPORTANTE: URLs Públicas

Una vez que inicies los túneles, tu aplicación será **accesible públicamente** desde Internet. Ten en cuenta:

- ✅ Usa siempre autenticación en tu aplicación
- ✅ No expongas datos sensibles sin protección
- ✅ Las URLs temporales tienen cierta oscuridad por seguridad
- ⚠️ Cualquiera con la URL puede acceder a tu aplicación
- ⚠️ Cierra los túneles cuando no los uses

### Cerrar los Túneles

Para detener todas las instancias:
1. Cierra todas las ventanas de comando abiertas por el script
2. O presiona `Ctrl+C` en cada una

## Comandos Útiles

### Listar Túneles Activos (si autenticado)

```bash
cloudflared tunnel list
```

### Ver Información de un Túnel

```bash
cloudflared tunnel info <TUNNEL-NAME>
```

### Eliminar un Túnel

```bash
cloudflared tunnel delete <TUNNEL-NAME>
```

## Recursos Adicionales

- [Documentación oficial de Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Repositorio de cloudflared en GitHub](https://github.com/cloudflare/cloudflared)
- [Guía de Quick Tunnels (URLs temporales)](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/do-more-with-tunnels/trycloudflare/)

## Preguntas Frecuentes

### ¿Es gratis?

Sí, Cloudflare Tunnel es completamente gratuito. No hay límites de ancho de banda.

### ¿Necesito un dominio?

No para URLs temporales. Solo necesitas un dominio si quieres URLs permanentes personalizadas.

### ¿Cómo comparto mi aplicación?

Simplemente comparte la URL del frontend que aparece al final del script. Cualquiera con esa URL podrá acceder.

### ¿Puedo usar esto en producción?

Las URLs temporales son para desarrollo y demos. Para producción, se recomienda usar túneles nombrados con dominios personalizados.

### ¿Qué pasa con HTTPS?

Cloudflare automáticamente proporciona certificados SSL válidos. Todas las conexiones son HTTPS por defecto.

---

**¿Necesitas ayuda?** Revisa los logs en las ventanas de comando abiertas para más detalles sobre posibles errores.
