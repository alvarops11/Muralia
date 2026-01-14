@echo off
setlocal

REM ===== BACKEND =====
cd /d "%~dp0backend-api"
start "Backend API" cmd /k "npm install && npm run dev"

REM ===== FRONTEND =====
cd /d "%~dp0frontend-angular"
start "Frontend Angular" cmd /k "npm install && npx ng serve"

REM ===== ABRIR NAVEGADOR =====
start http://localhost:4200

endlocal
