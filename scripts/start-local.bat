@echo off
setlocal
title WINNER - CENTINELA AUTÓNOMO

cd /d "%~dp0.."
chcp 65001 >nul

:: 1. Verificar si el puerto 3000 está activo (Salud del Backend)
netstat -ano | findstr /C:":3000 " >nul 2>&1
if %errorlevel% equ 0 (
    goto :FINISH
)

:: 2. Si el puerto está caído, intentamos levantar vía PM2 (para mantener la autonomía)
echo [!] El servidor no responde. Activando modo recuperación...

:: Limpiar posibles procesos colgados que impiden el reinicio
taskkill /f /im node.exe >nul 2>&1

:: Iniciar/Reiniciar mediante PM2 para asegurar que el watchdog esté activo
call pm2 start ecosystem.config.js --env production --only winner-store-backend
call pm2 save >nul 2>&1

:: 3. Espera dinámica con feedback visual mínimo
echo [*] Sincronizando servicios...
set /a "attempts=0"
:CHECK_PORT
timeout /t 1 >nul
set /a "attempts+=1"
netstat -ano | findstr /C:":3000 " >nul 2>&1
if %errorlevel% neq 0 (
    if %attempts% lss 10 goto :CHECK_PORT
    echo [X] Error: El servidor no pudo iniciar automáticamente.
    pause
    exit
)

:FINISH
start http://localhost:3000
exit
