@echo off
title WINNER STORE - INSTALACION Y CONFIGURACION
:: Entramos a la carpeta del script y subimos un nivel para trabajar en la raiz
cd /d "%~dp0.."

echo [*] Verificando entorno de Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Error: Node.js no esta instalado. Descargalo en nodejs.org
    pause
    exit
)

echo [*] Instalando dependencias de Node...
call npm install

echo [*] Configurando Base de Datos (Prisma)...
call npx prisma generate
call npx prisma db push

echo [*] Cargando datos iniciales de la tienda...
node backend/seed.js

echo [*] Instalando PM2 globalmente...
call npm install pm2 -g

echo --------------------------------------------------
echo [OK] El sistema ha sido configurado correctamente.
echo [OK] Puedes cerrar esta ventana y usar start-local.bat
echo --------------------------------------------------
pause