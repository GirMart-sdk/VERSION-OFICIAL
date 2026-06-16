@echo off
title WINNER STORE - RESET DASHBOARD
:: Subimos un nivel para que 'node' encuentre la carpeta backend
cd /d "%~dp0.."

echo ===================================================
echo   PELIGRO: Vas a borrar todas las ventas y gastos
echo ===================================================
echo Presiona una tecla para confirmar la limpieza...
pause > nul

node backend/wipe-data.js

echo.
echo [*] Proceso terminado.
pause