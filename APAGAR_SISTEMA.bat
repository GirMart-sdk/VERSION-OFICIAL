@echo off
title WINNER - APAGAR SISTEMA
cd /d "%~dp0"
echo [*] Deteniendo servidores de Winner Store...

call npx pm2 stop winner-backend
call npx pm2 delete winner-backend

echo.
echo ✅ Sistema detenido correctamente.
timeout /t 2