@echo off
title WINNER - APAGAR SISTEMA
cd /d "%~dp0"
echo [*] Deteniendo servidores de Winner Store...

call npx pm2 stop winner-store
call npx pm2 delete winner-store

echo.
echo ✅ Sistema detenido correctamente.
timeout /t 2