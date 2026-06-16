@echo off
title WINNER STORE - CONFIGURACION GITHUB
cd /d "%~dp0.."

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Git NO detectado.
    echo 1. Descargalo e instalalo desde: https://git-scm.com/download/win
    echo 2. Cierra y vuelve a abrir esta ventana.
    pause
    exit /b
)

echo [*] Inicializando repositorio Git local...
git init

echo [*] Configurando repositorio remoto...
git remote add origin https://github.com/GirMart-sdk/VERSION-OFICIAL.git 2>nul
if %errorlevel% neq 0 (
    git remote set-url origin https://github.com/GirMart-sdk/VERSION-OFICIAL.git
)

echo [*] Sincronizando todos los archivos...
:: El parametro -f fuerza la inclusion de los 11 .bat aunque esten en el .gitignore
git add -f scripts/*.bat
git add .

echo [*] Creando commit inicial...
git commit -m "Sincronización inicial: Winner Store v3.5"

echo [*] Cambiando a rama principal (main)...
git branch -M main

echo [*] Subiendo archivos a GitHub...
echo (Es posible que se te pida autenticacion en una ventana emergente)
git push -u origin main

pause