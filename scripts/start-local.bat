<<<<<<< HEAD
:: WINNER STORE - MANTENIMIENTO Y ACTUALIZACIÓN
@echo off
:: [SEGURIDAD] Verificar permisos de administrador para tareas de sistema (PM2 Startup)
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Solicitando permisos de administrador para configurar el sistema...
    powershell -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

:: Entramos a la carpeta del script y luego subimos un nivel a la raiz
cd /d "%~dp0.."

:: Limpieza de procesos y logs previos para diagnóstico claro
echo [*] Reiniciando servicios de Winner Store...
call pm2 stop winner-store --silent >nul 2>&1

:: Verificacion e instalacion de PM2 y persistencia (silencioso)
::where pm2 >nul 2>&1
::if %errorlevel% neq 0 (
::    echo [*] Instalando PM2 por primera vez...
 ::   call npm install pm2 -g >nul 2>&1
  ::  call npm install pm2-windows-startup -g >nul 2>&1
   :: call pm2-startup install >nul 2>&1
)

:: Preparacion inteligente de dependencias
:: Verificación rápida de integridad (solo carpetas críticas)
if not exist "node_modules\" (
::    echo [*] Instalando dependencias (esto puede tardar un poco)...
    echo [!] node_modules no encontrado. Ejecutando instalacion de emergencia...
    call npm install --no-audit --no-fund >nul 2>&1
)

if not exist "node_modules\.prisma\" (
::    echo [*] Generando cliente de base de datos...
    echo [!] Cliente Prisma no encontrado. Generando...
    call npx prisma generate >nul 2>&1
)

:: Sincronizacion rapida (Solo si se detectan cambios en el esquema)
:: Para un inicio ultra-rapido, podrías comentar estas dos lineas:
::echo [*] Sincronizando base de datos...
::call npx prisma db push --skip-generate >nul 2>&1
:: call node backend/seed.js >nul 2>&1
:: Sincronización de base de datos desactivada para inicio rápido. 
:: Solo ejecutar manualmente si cambias el schema.prisma.
:: call npx prisma db push --skip-generate >nul 2>&1

:: Inicio de servidor y guardado de persistencia
echo [*] Iniciando procesos con PM2...
call pm2 start ecosystem.config.js --env production
call pm2 save --force >nul 2>&1

echo [OK] Configuracion completada exitosamente.
echo [OK] El servidor esta intentando quedar ONLINE...
echo [URL] http://localhost:3000/admin-panel.html

timeout /t 2 >nul

:: Verificar si PM2 realmente lo inicio
call pm2 list | findstr "online" >nul
if %errorlevel% neq 0 (
    echo [!] ERROR: El servidor no pudo quedar online. Revisa los logs con: pm2 logs
    call pm2 logs winner-store --lines 5 --no-daemon
    pause
) else (
    start "" "http://localhost:3000/admin-panel.html"
)
timeout /t 3
=======
@echo off
setlocal enabledelayedexpansion
title WINNER POS - FAST START
set NODE_ENV=production


color 0b
echo.
echo   [ W I N N E R  -  U L T R A  F A S T  B O O T ]
echo.

:: 1. Limpieza ultra-rápida (solo si el puerto está ocupado)
echo [*] Verificando puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
chcp 65001 >nul

if not exist "node_modules" (
    echo [!] Primera ejecucion detectada: instalando dependencias...
    call npm install --silent
    call npx prisma generate >nul
)

:: 2. Sincronizacion condicional (solo si pasas el parametro /sync)
if "%1"=="/sync" (
    echo [*] Sincronizando base de datos y seed...
    if exist "node_modules\.prisma\client" rd /s /q "node_modules\.prisma\client" >nul 2>&1
    call npx prisma generate >nul
    call npx prisma db push --skip-generate >nul
    node backend/seed.js >nul
)

:: 3. Lanzamiento paralelo (Cero esperas)
echo [*] Lanzando servidor...
start /b "WINNER_SRV" node backend/server.js

:: 4. Abrir navegador inmediatamente
echo.
echo ✅ SISTEMA LISTO.
timeout /t 1 /nobreak > nul
start http://localhost:3000/admin-panel.html
exit
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
