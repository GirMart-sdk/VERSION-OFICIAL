@echo off
REM ═══════════════════════════════════════════════════════════
REM Winner Store v3.5 (Prisma Edition) - Deploy para Windows Server
REM ═══════════════════════════════════════════════════════════
echo.
echo 🚀 DESPLIEGUE WINNER STORE v3.5 - PostgreSQL Native
echo =============================================
echo.

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js no encontrado. Instala desde nodejs.org
    pause
    exit /b 1
)

REM Verificar npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm no encontrado
    pause
    exit /b 1
)

REM Crear directorios
if not exist logs mkdir logs
if not exist certs mkdir certs
if not exist backup mkdir backup

echo 📦 Instalar dependencias de producción...
npm install --production

echo 🗄️ Sincronizando esquema con Prisma...
call npx prisma generate
call npx prisma db push

echo 🌱 Cargando datos iniciales (Seed)...
node backend/seed.js

echo 🔄 Probar servidor local...
start /B npm start
timeout /t 3 >nul 2>&1
taskkill /f /im node.exe >nul 2>&1

echo ✅ Servidor funciona! Iniciando con PM2...

REM Instalar PM2 global si no existe
npm list -g pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo 📥 Instalando PM2...
    npm install -g pm2
)

REM Iniciar con PM2
pm2 start ecosystem.config.js --env production
pm2 save

echo.
echo 🎉 ¡DESPLIEGUE COMPLETADO!
echo.
echo 🔗 Accede: http://localhost:3000
echo 👨‍💼 Admin: http://localhost:3000/admin-panel.html
echo           Credenciales gestionadas via .env
echo.
echo 📊 PM2 Status:
pm2 status
echo.
echo 📝 Próximo paso: Configurar IIS como proxy reverso
echo           Sigue DEPLOY_WINDOWS.md paso 7
echo.
pause
