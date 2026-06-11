@echo off
REM ════════════════════════════════════════════════════════════════
REM WINNER STORE v3.5 (Prisma Edition) - Iniciador Local Automático
REM Script para iniciar la tienda automáticamente en Windows
REM ════════════════════════════════════════════════════════════════
set NODE_ENV=production

setlocal enabledelayedexpansion

REM Configurar la consola para usar UTF-8 (corrige los caracteres extraños y emojis)
chcp 65001 >nul

REM Colores (ASCII codes)
for /F %%A in ('echo prompt $H ^| cmd') do set "BS=%%A"

cd /d "%~dp0"
title WINNER STORE - Servidor Local

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║         🏆  WINNER STORE - SERVIDOR LOCAL                      ║
echo ║                                                                ║
echo ║         🌐  Acceso Local                                       ║
echo ║         👤  Credenciales gestionadas via .env                ║
echo ║                                                                ║
echo ║         ⏱️   Iniciando en 2 segundos...                       ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

echo [*] Calentando motores...

REM 1. CERRAR PROCESOS PREVIOS (Evita errores de archivo bloqueado EPERM y conflictos de puerto)
echo [Limpiando entorno de ejecucion...]
taskkill /f /im node.exe >nul 2>&1

timeout /t 2 /nobreak > nul

REM Verificar que npm está instalado
echo [Verificando npm...]
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR: No se encontró el motor Node.js.
    echo.
    echo 🛠️  SOLUCIÓN:
    echo 1. Descarga Node.js ^(LTS^) de: https://nodejs.org
    echo 2. Instálalo y REINICIA tu PC.
    echo 3. El sistema NO FUNCIONARÁ hasta que Node.js esté instalado.
    echo.
    pause
    exit /b 1
)
echo ✅ Motor detectado correctamente.

REM Verificar dependencias
echo [Verificando dependencias...]
if not exist "node_modules" (
    echo ⏳ Instalando librerías necesarias ^(Esto tomará 2 minutos, espera^)...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Error al instalar librerías. Revisa tu conexión a internet.
        pause
        exit /b 1
    )
    echo ✅ Librerías listas.
) else (
    echo ✅ Librerías encontradas.
)

REM Verificar .env
if not exist ".env" (
    echo ❌ ERROR: No se encontro el archivo .env
    echo Por favor, crea uno con tu DATABASE_URL de PostgreSQL.
    pause
    exit /b 1
)

REM Verificar BD
echo [Conectando Base de Datos PostgreSQL...]
echo [*] Verificando estructura de tablas...
echo [1/2] Generando cliente de datos...
call npx prisma generate

echo [2/2] Aplicando migraciones pendientes...
call npx prisma migrate deploy

if %errorlevel% neq 0 (
    echo ❌ ERROR: Fallo al aplicar migraciones. Si es un equipo nuevo, recuerda hacer el Baseline.
    pause
    exit /b 1
)
echo ✅ Conexión de base de datos PostgreSQL preparada

echo.
echo ════════════════════════════════════════════════════════════════
echo 🚀 SERVIDOR ACTIVO - SISTEMA WINNER STORE
echo 🔗 Acceso: http://localhost:3000/admin-panel.html
echo.
echo 💡 CONSEJO: Si realizaste cambios en la DB, presiona F5 en la tienda
echo           para sincronizar los IDs de productos en el navegador.
echo ⚠️  No cierres esta ventana mientras uses el sistema.
echo ════════════════════════════════════════════════════════════════
echo.

REM Abrir navegador automáticamente
start http://localhost:3000/admin-panel.html

REM Iniciar servidor
node backend/server.js
pause
