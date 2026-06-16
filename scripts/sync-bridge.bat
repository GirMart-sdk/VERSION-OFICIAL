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
:: Corregir estado de "HEAD desprendido" si existe y asegurar rama main
git checkout -B main >nul 2>&1
git fetch origin main --quiet

:: Comprobar si estamos por detrás del repositorio remoto
for /f "tokens=*" %%g in ('git rev-parse HEAD') do set LOCAL=%%g
for /f "tokens=*" %%g in ('git rev-parse origin/main') do set REMOTE=%%g

if "!LOCAL!"=="!REMOTE!" (
    echo ✅ El servidor ya esta actualizado con la ultima version oficial.
    goto START_SERVICES
) else (
    echo [!] NUEVA ACTUALIZACION DETECTADA. Iniciando descarga...
)

:: 2. Sincronizacion Forzada (Modo Produccion)
echo [*] Sincronizando archivos con la version oficial...
git reset --hard origin/main
if %errorlevel% neq 0 (
    echo ❌ ERROR: No se pudo sincronizar con GitHub.
    pause
    exit /b 1
)
echo ✅ Archivos actualizados correctamente.

:: 3. Actualizar dependencias si hubo cambios en package.json
echo [*] Refrescando modulos y motor Prisma...
:: Solo ejecutar install si es necesario para ahorrar tiempo
call npm install --no-audit --no-fund --quiet
call npx prisma generate >nul

:: 4. Sincronizar Base de Datos (Crucial para que no falle el otro equipo)
echo [*] Aplicando cambios en la estructura de datos...
call npx prisma db push --skip-generate >nul

:START_SERVICES
echo.
echo ✅ SISTEMA SINCRONIZADO.
echo [*] Reiniciando servicios con PM2 para maxima estabilidad...

:: Verificar si PM2 esta instalado
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] PM2 no detectado. Iniciando con Node directamente...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
    start /b "WINNER_SRV" node backend/server.js
) else (
    :: Usar el archivo de configuracion de PM2
    call pm2 restart ecosystem.config.js --env production >nul 2>&1
    if %errorlevel% neq 0 (
        call pm2 start ecosystem.config.js --env production
    )
)

echo.
echo [OK] El sistema esta corriendo en segundo plano.
timeout /t 3 > nul
start http://localhost:3000/admin-panel.html
exit