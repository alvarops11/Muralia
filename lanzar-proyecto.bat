@echo off
setlocal enabledelayedexpansion

echo ========================================
echo   MURALIA - Lanzador Automtico v3
echo ========================================
echo.

REM ===== LIMPIEZA DE PROCESOS ANTERIORES =====
echo [0/5] Limpiando procesos antiguos...
taskkill /F /IM node.exe >nul 2>nul
taskkill /F /IM cloudflared.exe >nul 2>nul
timeout /t 2 /nobreak >nul

REM ===== VERIFICAR CLOUDFLARED =====
where cloudflared >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] cloudflared no esta instalado.
    echo Por favor instala cloudflared primero.
    pause
    exit /b 1
)

REM ===== CONFIGURAR VARIABLES =====
set "BACKEND_DIR=%~dp0backend-api"
set "FRONTEND_DIR=%~dp0frontend-angular"
set "CONFIG_FILE=%~dp0frontend-angular\src\app\config\urls.config.ts"
set "TEMP_BACKEND_LOG=%~dp0backend_tunnel.log"
set "TEMP_FRONTEND_LOG=%~dp0frontend_tunnel.log"

REM Limpiar logs antiguos
if exist "%TEMP_BACKEND_LOG%" del "%TEMP_BACKEND_LOG%"
if exist "%TEMP_FRONTEND_LOG%" del "%TEMP_FRONTEND_LOG%"

REM ===== INICIAR BACKEND =====
echo [1/5] Iniciando Backend (Puerto 3000)...
cd /d "%BACKEND_DIR%"
start "Muralia Backend" cmd /k "npm install && npm run dev"
timeout /t 5 /nobreak >nul

REM ===== INICIAR TUNEL BACKEND =====
echo [2/5] Creando Tunel Backend...
start "Cloudflare Backend" /min cmd /c "cloudflared tunnel --url http://localhost:3000 > "%TEMP_BACKEND_LOG%" 2>&1"

echo    Esperando URL del Backend...
set "BACKEND_URL="
set "COUNTER=0"

:check_backend_url
timeout /t 2 /nobreak >nul
set /a COUNTER+=1
if %COUNTER% geq 30 goto backend_timeout

if exist "%TEMP_BACKEND_LOG%" (
    for /f "tokens=*" %%L in ('findstr /C:".trycloudflare.com" "%TEMP_BACKEND_LOG%" 2^>nul') do (
        for %%W in (%%L) do (
            echo %%W | findstr "https://" >nul
            if !errorlevel! equ 0 set "BACKEND_URL=%%W"
        )
    )
)

if "!BACKEND_URL!"=="" goto check_backend_url
echo    [OK] Detectada: !BACKEND_URL!
goto backend_found

:backend_timeout
echo [ERROR] No se pudo detectar la URL del Backend.
echo Revisa el archivo %TEMP_BACKEND_LOG%
pause
exit /b 1

:backend_found
echo.

REM ===== ACTUALIZAR CONFIG FRONTEND =====
echo [3/5] Actualizando urls.config.ts...
(
    echo export const CONFIG = {
    echo   API_URL: '!BACKEND_URL!'
    echo };
) > "%CONFIG_FILE%"
echo    [OK] Configuracion actualizada.
echo.

REM ===== INICIAR FRONTEND =====
echo [4/5] Iniciando Frontend (Puerto 4200)...
cd /d "%FRONTEND_DIR%"
REM ELIMINADO EL FLAG --disable-host-check QUE CAUSABA ERROR EN ANGULAR 21
start "Muralia Frontend" cmd /k "npm install && npx ng serve --host 0.0.0.0"
timeout /t 5 /nobreak >nul

REM ===== INICIAR TUNEL FRONTEND =====
echo [5/5] Creando Tunel Frontend...
start "Cloudflare Frontend" /min cmd /c "cloudflared tunnel --url http://localhost:4200 > "%TEMP_FRONTEND_LOG%" 2>&1"

echo    Esperando URL del Frontend...
set "FRONTEND_URL="
set "COUNTER=0"

:check_frontend_url
timeout /t 2 /nobreak >nul
set /a COUNTER+=1
if %COUNTER% geq 30 goto frontend_timeout

if exist "%TEMP_FRONTEND_LOG%" (
    for /f "tokens=*" %%L in ('findstr /C:".trycloudflare.com" "%TEMP_FRONTEND_LOG%" 2^>nul') do (
        for %%W in (%%L) do (
            echo %%W | findstr "https://" >nul
            if !errorlevel! equ 0 set "FRONTEND_URL=%%W"
        )
    )
)

if "!FRONTEND_URL!"=="" goto check_frontend_url
echo    [OK] Detectada: !FRONTEND_URL!
goto frontend_found

:frontend_timeout
echo [ERROR] No se pudo detectar la URL del Frontend.
echo Revisa el archivo %TEMP_FRONTEND_LOG%
pause
exit /b 1

:frontend_found
echo.

REM ===== FINALIZAR =====
echo ========================================
echo   PROYECTO LANZADO CORRECTAMENTE
echo ========================================
echo.
echo   Backend URL:  !BACKEND_URL!
echo   Frontend URL: !FRONTEND_URL!
echo.
echo   Abriendo navegador...
start !FRONTEND_URL!
echo.
echo   IMPORTANTE: Si ves "Blocked request", revisa angular.json
echo.
pause
