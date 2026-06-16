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
) else (
    echo [!] NUEVA ACTUALIZACION DETECTADA. Iniciando descarga...
)

:: 2. Sincronizacion Forzada (Modo Produccion)
:: Usamos reset --hard para asegurar que el equipo remoto sea un espejo
:: exacto de GitHub, eliminando cualquier corrupcion o marca de conflicto.
echo [*] Limpiando y aplicando version oficial...
git fetch origin main >nul 2>&1
git reset --hard origin/main
if %errorlevel% neq 0 (
    echo ❌ ERROR: No se pudo sincronizar con GitHub.
    pause
    exit /b 1
)
echo ✅ Archivos restaurados y actualizados.

:: 3. Actualizar dependencias si hubo cambios en package.json
echo [*] Refrescando modulos y motor Prisma...
call npm install --silent
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

start /b "WINNER_SRV" node backend/server.js
timeout /t 2 /nobreak > nul
start http://localhost:3000/admin-panel.html
exit