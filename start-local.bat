@echo off
REM ════════════════════════════════════════════════════════════════
REM WINNER STORE v3.2 - Iniciador Local Automático
REM Script para iniciar la tienda automáticamente en Windows
REM ════════════════════════════════════════════════════════════════

setlocal enabledelayedexpansion

REM Colores (ASCII codes)
for /F %%A in ('echo prompt $H ^| cmd') do set "BS=%%A"

cd /d "%~dp0"
title WINNER STORE - Servidor Local

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║         🏆  WINNER STORE - SERVIDOR LOCAL                    ║
echo ║                                                                ║
echo ║         🌐  http://localhost:3000                            ║
echo ║         👤  Admin: admin / winner2026                        ║
echo ║                                                                ║
echo ║         ⏱️   Iniciando en 2 segundos...                       ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak

REM Verificar que npm está instalado
echo [Verificando npm...]
npm -v >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: npm no está instalado
    echo.
    echo Soluciones:
    echo 1. Instala Node.js: https://nodejs.org
    echo 2. Descarga LTS (versión recomendada)
    echo 3. Ejecuta el instalador
    echo 4. Reinicia esta ventana
    echo.
    pause
    exit /b 1
)
echo ✅ npm encontrado

REM Verificar dependencias
echo [Verificando dependencias...]
if not exist "node_modules" (
    echo ⚠️  Primera vez? Instalando node_modules...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error en npm install
        pause
        exit /b 1
    )
    echo ✅ Dependencias instaladas
) else (
    echo ✅ node_modules existe
)

REM Verificar BD
echo [Verificando base de datos...]
if not exist "backend\winner_store.db" if "%DB_TYPE%"=="sqlite" (
    echo ⚠️  SQLite detectado pero el archivo no existe, inicializando...
    call npm run seed
    if %errorlevel% neq 0 (
        echo ❌ Error inicializando BD
        pause
        exit /b 1
    )
    echo ✅ BD creada con datos iniciales
) else (
    echo ✅ Conexión de base de datos preparada (Modo: %DB_TYPE%)
)

echo.
echo ════════════════════════════════════════════════════════════════
echo.
echo 🚀 INICIANDO SERVIDOR...
echo.
echo 📍 Frontend:   http://localhost:3000
echo 📍 API:        http://localhost:3000/api
echo 📍 Admin:      http://localhost:3000/admin-panel.html
echo.
echo 👤 Credenciales Admin:
echo    Usuario: admin
echo    Password: winner2026
echo.
echo 🛑 Para detener: Presiona Ctrl+C en esta ventana
echo.
echo ════════════════════════════════════════════════════════════════
echo.

REM Iniciar servidor
call npm start

REM Si llega aquí, servidor se detuvo
echo.
echo ⚠️  Servidor detenido
echo.
pause
