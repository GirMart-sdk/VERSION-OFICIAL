@echo off
setlocal enabledelayedexpansion

REM ================================================
REM WINNER STORE - install-and-run.bat (UNIFICADO)
REM Instala dependencias, crea BD si falta y
REM arranca el servidor.
REM ================================================

cd /d "%~dp0"

REM Configurar la consola para usar UTF-8
chcp 65001 >nul

echo.
echo ================================================
echo  WINNER STORE - install-and-run
echo  http://localhost:3000
echo ================================================

echo.
echo [Verificando npm...]
npm -v >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: npm no esta instalado o no esta en PATH.
  echo Instala Node.js: https://nodejs.org
  pause
  exit /b 1
)
echo [+] npm encontrado

echo.
echo [Verificando node_modules...]
if not exist "node_modules" (
  echo Instalando dependencias...
  call npm install
  if %errorlevel% neq 0 (
    echo ERROR: npm install fallo.
    pause
    exit /b 1
  )
) else (
  echo node_modules ya existe
)

echo.
echo [Configurando Prisma y BD...]
echo Generando cliente Prisma...
call npx prisma generate
echo.
echo [!] OMITIENDO DB PUSH Y SEED para proteger datos existentes.
echo [!] Si es la primera vez que instalas, ejecuta: 
echo     npx prisma db push 
echo     node backend/seed.js

echo.
echo [+] Arrancando servidor...
echo [!] Acceso: http://localhost:3000
echo.
start http://localhost:3000/admin-panel.html
node backend/server.js
