@echo off
title WINNER STORE - ACTUALIZAR DESDE GITHUB
cd /d "%~dp0.."

echo [*] Verificando instalacion de Git...
where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Git NO detectado.
    echo 1. Descargalo e instalalo desde: https://git-scm.com/download/win
    echo 2. Cierra y vuelve a abrir esta ventana.
    pause
    exit /b
)

echo [*] Descargando los ultimos cambios desde GitHub...
:: Este comando descarga los cambios de la rama 'main' del repositorio 'origin' (GitHub)
:: y los fusiona con tu copia local.
git pull origin main

echo.
echo [*] El proyecto ha sido actualizado.
pause