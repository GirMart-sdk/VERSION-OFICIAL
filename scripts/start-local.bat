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