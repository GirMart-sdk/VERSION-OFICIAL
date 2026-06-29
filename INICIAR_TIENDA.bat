@echo off
setlocal
title WINNER - CENTINELA AUTÓNOMO

cd /d "%~dp0"
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

:: Leer configuración del .env y detectar IP (lógica unificada)
set "NETWORK_IP_FROM_ENV="
set "ALLOWED_ADMIN_IPS_FROM_ENV="
for /f "usebackq tokens=1* delims==" %%a in (".env") do (
    if "%%a"=="NETWORK_IP" set "NETWORK_IP_FROM_ENV=%%b"
    if "%%a"=="ALLOWED_ADMIN_IPS" set "ALLOWED_ADMIN_IPS_FROM_ENV=%%b"
)

set "DETECTED_IP="
for /f "tokens=1,2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /f "tokens=*" %%c in ("%%b") do (
        if not defined DETECTED_IP set DETECTED_IP=%%c
    )
)
if not defined DETECTED_IP set DETECTED_IP=%NETWORK_IP_FROM_ENV%
if not defined ALLOWED_ADMIN_IPS_FROM_ENV set ALLOWED_ADMIN_IPS_FROM_ENV=%DETECTED_IP%,127.0.0.1,::1

:: Iniciar/Reiniciar mediante PM2 pasando las variables de entorno correctas
echo [*] Iniciando servidor con configuración de red...
call npx --yes pm2 start backend/server.js --name winner-backend --node-args="-r dotenv/config" --env NETWORK_IP=%DETECTED_IP% --env ALLOWED_ADMIN_IPS=%ALLOWED_ADMIN_IPS_FROM_ENV%

:: Crear archivo de configuración para el frontend (consistencia)
echo [*] Creando archivo de configuracion para el frontend...
(
    echo window.SERVER_CONFIG = {
    echo     "NETWORK_IP": "%DETECTED_IP%"
    echo };
) > config.js
echo ✅ Archivo de configuración 'config.js' creado.

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
start http://localhost:3000/admin-panel.html
exit
