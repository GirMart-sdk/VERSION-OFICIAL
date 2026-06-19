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

:: 3.5. AUDITORIA DE SEGURIDAD DE DEPENDENCIAS
echo [*] Auditando paquetes en busca de vulnerabilidades...
call npm audit --audit-level=high
if !errorlevel! equ 0 (
    echo ✅ No se encontraron vulnerabilidades criticas.
) else (
    echo ❌ ALERTA: Se detecto una vulnerabilidad de alta criticidad. Despliegue abortado.
    pause
    exit /b 1
)

call npx prisma generate >nul

:: 4. Sincronizar Base de Datos (Crucial para que no falle el otro equipo)
echo [*] Aplicando cambios en la estructura de datos...
call npx prisma db push --skip-generate

:START_SERVER
echo.
echo ✅ PUENTE SINCRONIZADO CON EXITO.
echo [*] Lanzando servidor en el equipo remoto...

:: Cerramos cualquier instancia previa antes de relanzar
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

echo.
echo 📱 [MODO ESCÁNER MÓVIL ACTIVADO]
echo Para usar la cámara desde tu celular:
echo 1. Entra a: http://192.168.1.3:3000
echo 2. Configura Chrome Flags: chrome://flags/#unsafely-treat-insecure-origin-as-secure
echo 3. Agrega http://192.168.1.3:3000 y cambia a ENABLED.
echo.

start "WINNER_SRV" node backend/server.js
timeout /t 2 /nobreak > nul
start http://localhost:3000/admin-panel.html
exit