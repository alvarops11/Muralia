# Análisis y Solución Definitiva: Concurrencia y Rendimiento

Tras un análisis exhaustivo del sistema de movimiento, he implementado una pila completa de soluciones para garantizar (1) Integridad de Datos y (2) Fluidez en la Experiencia de Usuario.

## 1. Problema de Integridad: "No mover a la vez"

### Análisis
El sistema original permitía colisiones porque el bloqueo era "optimista" (el cliente avisaba pero no esperaba permiso). Además, si dos usuarios movían posits distintos hacia el mismo lugar al mismo tiempo, la actualización de índices del primero sobrescribía la del segundo, causando saltos y pérdidas de datos.

### Solución Implementada: Bloqueo Autoritativo con Arbitraje
He cambiado la lógica para que el Servidor sea la única fuente de verdad para los permisos de escritura.

1. **Petición Síncrona Virtual**: Al intentar arrastrar, el cliente pide permiso `bloquear_arrastre`.
2. **Semáforo en Backend**: El servidor verifica si el recurso está libre.
3. **Respuesta Explicita**: 
   - SI está libre -> Envía `arrastre_bloqueado_ok`.
   - NO está libre -> Envía `arrastre_bloqueado_error`.
4. **Kill Switch en Frontend**: Si el frontend recibe `error`, aborta físicamente la interacción del usuario forzando un evento `mouseup`, revierte la posición y muestra una alerta visual.

Esto elimina de raíz la posibilidad de que dos usuarios "tengan" el mismo posit o interactúen conflictivamente.

## 2. Problema de Rendimiento: "Actualizar a velocidad decente"

### Análisis de Cuello de Botella
Detecté que cada vez que un usuario movía un posit, el servidor emitía un evento genérico `tablero_actualizado`. Esto provocaba que **todos los usuarios conectados** hicieran una petición HTTP `GET` completa (`cargar()`) para descargar todo el tablero de nuevo.
- Con 50 posts y 5 usuarios = 5 peticiones pesadas por cada movimiento.
- Resultado: Lag, parpadeos y sensación de lentitud.

### Solución Implementada: Streaming de Datos (Delta Updates)
He optimizado el flujo de datos para eliminar la necesidad de recargas HTTP durante la colaboración en tiempo real.

1. **Smart Sockets (Backend)**:
   - Modifiqué `board.controller.ts` para que, al guardar un movimiento, envíe **la lista actualizada de posits** directamente dentro del evento de socket (`payload`).
   
2. **Inyección Directa (Frontend)**:
   - Modifiqué `mural.ts` para detectar si el evento trae datos (`payload`).
   - Si trae datos, actualizo directamente `this.board.posits = data.payload` en memoria, evitando la petición HTTP.
   
3. **Renderizado Eficiente (Angular trackBy)**:
   - Añadí `trackBy: trackByPosit` al `*ngFor` del HTML.
   - Esto le dice a Angular: "Si el ID es el mismo, no destruyas el elemento DOM, solo muévelo".
   - **Resultado**: Las actualizaciones son fluidas, no se pierde el foco, y las animaciones CSS se mantienen suaves.

## Resumen Técnico de Cambios

### Backend (`backend-api`)
- **`src/server.ts`**: Lógica de `bloquear_arrastre` con respuesta de estado (`ack`).
- **`src/controllers/board.controller.ts`**: Inyección de `board.posits` en el evento `updatePosit`.

### Frontend (`frontend-angular`)
- **`src/services/websocket.service.ts`**: Canales para recibir confirmaciones de bloqueo y errores.
- **`src/app/paginas/mural/mural.ts`**: 
  - Manejo defensivo de `onDragLockError`.
  - Consumo directo de `data.payload` en `onUpdate`.
  - Función `trackByPosit`.
- **`src/app/paginas/mural/mural.html`**: Implementación de `trackBy` en la directiva de iteración.

La aplicación ahora es **robusta** ante concurrencia y **rápida** en las actualizaciones.
