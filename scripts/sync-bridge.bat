@echo off
setlocal enabledelayedexpansion
title WINNER BRIDGE - SYNC SYSTEM
cd /d "%~dp0\.."
chcp 65001 >nul

color 0b
echo.
echo   [ W I N N E R  -  G I T H U B  B R I D G E ]
echo.

:: 1. Verificar conectividad con el repositorio
echo [*] Verificando actualizaciones en GitHub...
git fetch origin main >nul 2>&1

:: Comprobar si estamos por detrás del repositorio remoto
FOR /F "tokens=*" %%g IN ('git rev-parse HEAD') DO SET LOCAL=%%g
FOR /F "tokens=*" %%g IN ('git rev-parse @{u}') DO SET REMOTE=%%g

if "%LOCAL%"=="%REMOTE%" (
    echo ✅ El servidor ya esta actualizado con la ultima version oficial.
    timeout /t 2 > nul
    goto :POST_UPDATE
) else (
    echo [!] NUEVA ACTUALIZACION DETECTADA. Iniciando descarga...
)

:: 2. Sincronizacion Forzada (Modo Produccion)
echo [*] Limpiando y aplicando version oficial...
:: El uso de parentesis y exit asegura que el script se reinicie limpiamente tras actualizarse
git reset --hard origin/main && (
    echo ✅ Código actualizado exitosamente.
    echo [*] Reiniciando puente para aplicar cambios...
    start "" "%~f0"
    exit /b
)

echo ❌ ERROR: Falló el reset de Git.
pause
exit /b 1

:POST_UPDATE

:: 3. Actualizar dependencias si hubo cambios en package.json
echo [*] Refrescando modulos y motor Prisma...
call npm install --silent

:: 3.5. AUDITORIA Y CORRECCIÓN AUTOMÁTICA DE SEGURIDAD
echo [*] Auditando paquetes en busca de vulnerabilidades...
call npm audit --audit-level=high >nul 2>&1
if !errorlevel! neq 0 (
    echo [!] Se detectaron vulnerabilidades. Intentando corrección automática...
    call npm audit fix --force
)

echo [*] Verificando corrección...
call npm audit --audit-level=high
if !errorlevel! equ 0 (
    echo ✅ Auditoría de seguridad superada. No hay vulnerabilidades críticas.
) else (
    echo ❌ ALERTA: La corrección automática falló. Persisten vulnerabilidades críticas. Despliegue abortado.
    pause
    exit /b 1
)

call npx prisma generate >nul

:: 4. Sincronizar Base de Datos (Crucial para que no falle el otro equipo)
echo [*] Aplicando cambios en la estructura de datos...
call npx prisma db push --skip-generate

:: 5. CREAR ARCHIVO DE CONFIGURACIÓN PARA EL FRONTEND (Consistencia con INICIAR_WINNER.bat)
echo [*] Creando archivo de configuracion para el frontend...
set "DETECTED_IP_FOR_CONFIG="
for /f "tokens=1,2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /f "tokens=*" %%c in ("%%b") do (
        if not defined DETECTED_IP_FOR_CONFIG set DETECTED_IP_FOR_CONFIG=%%c
    )
)
if not defined DETECTED_IP_FOR_CONFIG set DETECTED_IP_FOR_CONFIG=127.0.0.1

(echo window.SERVER_CONFIG = {) > config.js
(echo     "NETWORK_IP": "%DETECTED_IP_FOR_CONFIG%"^) >> config.js
(echo };) >> config.js
echo ✅ Archivo de configuración 'config.js' actualizado con la IP: %DETECTED_IP_FOR_CONFIG%

:START_SERVER
echo.
echo ✅ PUENTE SINCRONIZADO CON EXITO.
echo [*] Lanzando servidor en el equipo remoto...

:: Cerramos cualquier instancia previa antes de relanzar
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

echo.

:: Detección de IP para mensaje de ayuda
set "DETECTED_IP="
for /f "tokens=1,2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /f "tokens=*" %%c in ("%%b") do (
        if not defined DETECTED_IP set DETECTED_IP=%%c
    )
)
if not defined DETECTED_IP set DETECTED_IP=127.0.0.1

echo 📱 [MODO ESCÁNER MÓVIL ACTIVADO]
echo Para usar la cámara desde tu celular:
echo 1. Entra a: http://%DETECTED_IP%:3000
echo.
:: Usamos PM2 para una ejecución robusta y persistente
echo [*] Deteniendo instancia anterior de PM2 (si existe)...
call npx --yes pm2 delete winner-backend >nul 2>&1
echo [*] Lanzando servidor con PM2 en segundo plano...
call npx --yes pm2 start backend/server.js --name winner-backend --env NETWORK_IP=%DETECTED_IP% >nul
call npx --yes pm2 save >nul 2>&1
echo ✅ Servidor lanzado con PM2.
timeout /t 2 /nobreak > nul
start http://localhost:3000/admin-panel.html
exit