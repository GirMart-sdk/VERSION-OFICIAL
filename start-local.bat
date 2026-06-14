@echo off
REM ════════════════════════════════════════════════════════════════
REM WINNER STORE v3.5 (Prisma Edition) - Iniciador Local Automático
REM Script para iniciar la tienda automáticamente en Windows
REM ════════════════════════════════════════════════════════════════
set NODE_ENV=development

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
echo [1/3] Generando cliente de datos...

REM Intentar eliminar la carpeta temporal del cliente si existe (ayuda con el error EPERM)
if exist "node_modules\.prisma\client" (
    rd /s /q "node_modules\.prisma\client" >nul 2>&1
)

call npx prisma generate
if %errorlevel% neq 0 (
    echo ❌ ERROR: No se pudo generar el cliente de Prisma. El archivo esta bloqueado por otro proceso.
    echo [!] Intenta cerrar VS Code o cualquier otra terminal y ejecuta este script de nuevo.
    pause
    exit /b 1
)

echo [2/3] Aplicando migraciones pendientes...
call npx prisma migrate deploy

if %errorlevel% neq 0 (
    echo ❌ ERROR: Fallo al aplicar migraciones ^(P3009/P3018^).
    echo [!] Si ves un error de sintaxis '\u{feff}', guarda prisma/migrations/0_init_production/migration.sql como 'UTF-8 sin BOM'.
    echo [!] Si las tablas ya existen en PostgreSQL, intenta: npx prisma migrate resolve --applied 0_init_production
    pause
    exit /b 1
)

echo [3/3] Sincronizando usuario administrador...
node backend/seed.js

echo ✅ Entorno preparado correctamente.

echo.
echo ════════════════════════════════════════════════════════════════
echo � INICIANDO SISTEMA WINNER STORE
echo � Acceso: http://localhost:3000/admin-panel.html
echo.
echo [*] El servidor se iniciará en segundo plano.
echo [*] El navegador se abrirá automáticamente en 5 segundos...
echo.
echo 💡 CONSEJO: Si ves 'Failed to fetch', espera un momento y pulsa F5.
echo ⚠️  NO CIERRES ESTA VENTANA.
echo ════════════════════════════════════════════════════════════════
echo.

REM Limpiar puertos antes de iniciar
echo [!] Liberando puerto 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1

echo [🚀] Iniciando backend...
start "WINNER STORE SERVER" cmd /k "title SERVIDOR ACTIVO && node backend/server.js"

echo [*] Esperando a que el servidor este listo (10 segundos)...
timeout /t 10 /nobreak > nul
start http://localhost:3000/admin-panel.html

echo [OK] Sistema en ejecucion.
exit
