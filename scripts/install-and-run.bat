@echo off
setlocal enabledelayedexpansion
title WINNER STORE - INSTALACION Y CONFIGURACION (UNIFICADO)
:: Entramos a la carpeta del script y subimos un nivel para trabajar en la raiz
cd /d "%~dp0.."

REM Configurar la consola para usar UTF-8
chcp 65001 >nul

echo.
echo ================================================
echo  WINNER STORE - SISTEMA DE GESTION
echo  http://localhost:3000
echo ================================================
echo.

echo [*] Verificando entorno de Node.js y npm...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Node.js no esta instalado. Descargalo en nodejs.org
    pause
    exit
)
echo [+] Node.js detectado.

echo [*] Instalando dependencias de Node...
call npm install
if %errorlevel% neq 0 (
  echo [!] ERROR: Fallo la instalacion de dependencias.
  pause
  exit /b 1
)

echo [*] Configurando Base de Datos (Prisma)...
call npx prisma generate

echo [!] Verificando integridad de la base de datos...
:: Intentar migrar primero, si no, usar db push como fallback
call npx prisma migrate deploy || call npx prisma db push

echo [*] Cargando datos iniciales de la tienda...
if exist "backend/seed.js" (
    node backend/seed.js
)

echo [*] Instalando PM2 globalmente...
npm list -g pm2 >nul 2>&1 || call npm install pm2 -g

echo --------------------------------------------------
echo [OK] El sistema ha sido configurado correctamente.
echo [OK] Puedes usar "pm2 start ecosystem.config.js" para produccion.
echo --------------------------------------------------
pause
