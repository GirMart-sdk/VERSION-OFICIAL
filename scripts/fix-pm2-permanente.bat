@echo off
setlocal
title WINNER - REPARAR Y CONFIGURAR PM2
cd /d "%~dp0.."

echo.
echo [*] Iniciando reparacion de procesos...
echo.

:: 1. Limpieza total (Resuelve el error EPERM de rpc.sock)
echo [1/3] Matando procesos de fondo y liberando sockets...
call pm2 kill >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
timeout /t 2 >nul

:: 2. Re-lanzar desde la configuracion oficial
echo [2/3] Cargando aplicaciones desde ecosystem.config.js...
call pm2 start ecosystem.config.js --env production

:: 3. Congelar configuracion (Persistencia)
echo [3/3] Guardando estado para el proximo inicio...
call pm2 save

echo.
echo ✅ CONFIGURACIÓN COMPLETADA.
echo [*] El servidor y las tareas programadas se iniciarán con Windows.
echo.
call pm2 status
timeout /t 5