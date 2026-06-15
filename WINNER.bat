@echo off
setlocal enabledelayedexpansion
title WINNER STORE - SISTEMA DE GESTION POS v3.5
set NODE_ENV=production
cd /d "%~dp0"

:: Estética oficial para la terminal (Azul neón sobre negro)
color 0b
echo.
echo   ╔══════════════════════════════════════════════════════════╗
echo   ║                                                          ║
echo   ║          🏆  WINNER STORE - SISTEMA OFICIAL              ║
echo   ║             POS ^& GESTION DE INVENTARIO                  ║
echo   ║                                                          ║
echo   ╚══════════════════════════════════════════════════════════╝
echo.

echo [1/4] Liberando recursos del sistema y puerto 3000...
taskkill /f /im node.exe /t >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
chcp 65001 >nul

if not exist ".env" (
    echo [ERROR] No se encuentra el archivo de configuracion .env
    echo Por favor, contacte a soporte tecnico o revise la raiz del proyecto.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [!] Instalando componentes necesarios. Por favor espere...
    call npm install --silent
)

echo [2/4] Sincronizando motor de base de datos...
if exist "node_modules\.prisma\client" (
    rd /s /q "node_modules\.prisma\client" >nul 2>&1
)
:: Generar cliente y asegurar que la estructura de tablas sea la correcta
call npx prisma generate >nul
call npx prisma db push --skip-generate >nul
node backend/seed.js >nul

echo [3/4] Levantando Backend de alto rendimiento...
:: Iniciamos el backend y lo mantenemos maximizado para monitoreo de actividad
start "WINNER BACKEND - LOGS DE ACTIVIDAD" /max cmd /k "title WINNER LOGS && node backend/server.js"

echo [4/4] Abriendo Interfaz de Punto de Venta...
echo.
echo ✅ SISTEMA LISTO PARA OPERACION OFICIAL.
timeout /t 5 /nobreak > nul
start http://localhost:3000/admin-panel.html
exit
