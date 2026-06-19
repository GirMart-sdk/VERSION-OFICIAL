@echo off
setlocal enabledelayedexpansion
title WINNER STORE - SISTEMA AUTÓNOMO
cd /d "%~dp0"
chcp 65001 >nul

color 0b
echo.
echo   [ W I N N E R  -  A U T O N O M O U S  S Y S T E M ]
echo.
echo [!] CONFIGURACION CRITICA:
echo [!] Asegurese de que su archivo .env contenga:
echo [!] NETWORK_IP=192.168.1.3
echo [!] ALLOWED_ADMIN_IPS=192.168.1.3,TU_IP_PUBLICA_O_OTRA_IP_LOCAL
echo.

:: 1. Verificar Requisitos
echo [*] Verificando entorno...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Node.js no esta instalado. Por favor instale Node.js desde https://nodejs.org
    pause
    exit /b 1
)

:: 2. Instalación de Dependencias Críticas
if not exist "node_modules" (
    echo [!] Carpeta node_modules no encontrada. Instalando dependencias...
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [!] ERROR: Fallo la instalacion de modulos. Revise su conexion.
        pause
        exit /b 1
    )
)

:: 2.1. Validar Seguridad de Entorno
if not exist ".env" (
    echo [!] ERROR: Archivo .env no encontrado. 
    echo [!] Por favor cree uno basado en el ejemplo de la documentacion.
    pause
    exit /b 1
)

:: Leer configuracion real del .env para la interfaz de consola
set "NETWORK_IP_FROM_ENV="
set "ALLOWED_ADMIN_IPS_FROM_ENV="
for /f "usebackq tokens=1* delims==" %%a in (".env") do (
    if "%%a"=="NETWORK_IP" set "NETWORK_IP_FROM_ENV=%%b"
    if "%%a"=="ALLOWED_ADMIN_IPS" set "ALLOWED_ADMIN_IPS_FROM_ENV=%%b"
)

:: Fallbacks de seguridad si no estan definidos
if not defined NETWORK_IP_FROM_ENV set NETWORK_IP_FROM_ENV=192.168.1.3
if not defined ALLOWED_ADMIN_IPS_FROM_ENV set ALLOWED_ADMIN_IPS_FROM_ENV=192.168.1.3,127.0.0.1,::1

:: 3. DETECCIÓN AUTOMÁTICA DE IP Y CONFIGURACIÓN DEL FRONTEND
echo [*] Detectando IP de la red local...
set "DETECTED_IP="
for /f "tokens=1,2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    for /f "tokens=*" %%c in ("%%b") do (
        if not defined DETECTED_IP set DETECTED_IP=%%c
    )
)
if not defined DETECTED_IP set DETECTED_IP=%NETWORK_IP_FROM_ENV%

echo [*] Creando archivo de configuracion para el frontend...
(echo window.SERVER_CONFIG = {;) > config.js
(echo     "NETWORK_IP": "%DETECTED_IP%"^) >> config.js
(echo };) >> config.js

:: 3. Preparación de Base de Datos y Prisma
echo [*] Sincronizando motor de datos...
call npx prisma generate >nul
:: Sincronizar estructura sin borrar datos
call npx prisma db push --skip-generate >nul

:: 4. Gestión de Puertos
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo [!] Puerto 3000 ocupado. Liberando para nueva ejecucion...
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000') do taskkill /f /pid %%a >nul 2>&1
)

:: 5. Resumen de Conectividad
echo.
echo ✅ CONFIGURACION DETECTADA:
echo -------------------------------------------------------
echo 💻 ACCESO LOCAL:  http://localhost:3000/admin-panel.html
echo 📱 ACCESO MOVIL:  http://%DETECTED_IP%:3000/admin-panel.html
echo 🛡️ ADMIN IPs:     %ALLOWED_ADMIN_IPS_FROM_ENV%
echo -------------------------------------------------------
echo.

:: 6. Iniciar Ngrok automáticamente y obtener URL
echo [*] Verificando y lanzando Ngrok...
set NGROK_URL=

:: Check if ngrok executable exists
where .\ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ngrok no encontrado en la carpeta actual. Saltando inicio automatico.
    echo [!] Descargalo de ngrok.com y colocalo en C:\MI TIENDA\WINNER\
    goto :SKIP_NGROK
)

:: Check if ngrok is already running (by checking its local API port 4040)
netstat -ano | findstr :4040 >nul
if %errorlevel% equ 0 (
    echo [+] Ngrok API (puerto 4040) ya esta activo. Intentando obtener URL...
) else (
    echo [+] Iniciando Ngrok en segundo plano (puerto 3000)...
    start /b "" .\ngrok http 3000 --log=nul
    timeout /t 5 /nobreak > nul
)

:: Get Ngrok URL from its local API using PowerShell
for /f "usebackq tokens=*" %%a in (`powershell -Command "(Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels').tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -ExpandProperty public_url" 2^>nul`) do (
    set NGROK_URL=%%a
)

if defined NGROK_URL (
    echo 🌐 Ngrok URL obtenida: %NGROK_URL%
    echo [!] Esta URL se usara para el acceso publico y escaner movil.
    echo.
) else (
    echo [!] No se pudo obtener la URL de Ngrok. Asegurese de que Ngrok este configurado (authtoken).
    echo [!] Si Ngrok no se inicia, el acceso publico no estara disponible.
    echo.
)

:SKIP_NGROK
echo [*] Iniciando servicios en segundo plano...
echo.

:: Usamos PM2 para ejecución persistente y oculta
call npx --yes pm2 delete winner-backend >nul 2>&1

:: Pasamos NGROK_URL como variable de entorno a PM2 si esta definida
set "PM2_ENV_VARS=NETWORK_IP=%NETWORK_IP_FROM_ENV%,ALLOWED_ADMIN_IPS=%ALLOWED_ADMIN_IPS_FROM_ENV%"
if defined NGROK_URL (
    set "PM2_ENV_VARS=%PM2_ENV_VARS%,NGROK_URL=%NGROK_URL%"
)
call npx --yes pm2 start backend/server.js --name winner-backend --env %PM2_ENV_VARS% >nul

:: Abrimos el panel y finalizamos el script
timeout /t 2 /nobreak > nul
start http://localhost:3000/admin-panel.html
echo [OK] Winner Store está operando. Puedes cerrar esta ventana.
exit