@echo off
setlocal enabledelayedexpansion
title WINNER POS - FAST START
set NODE_ENV=production
cd /d "%~dp0"

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
