+@echo off
title WINNER STORE - DESCARGAR CAMBIOS
cd /d "%~dp0.."

echo [*] Descargando ultimos cambios de GitHub...
git pull origin main

echo.
echo [OK] El proyecto esta actualizado.
pause