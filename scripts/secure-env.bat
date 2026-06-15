@echo off
title WINNER SECURITY - ENV PROTECTION
cd /d "%~dp0\.."

echo [*] Protegiendo archivos de configuracion (.env)...

:: 1. Deshabilitar herencia y quitar todos los permisos
icacls .env /inheritance:r /grant:r "%USERNAME%":(R,W) /remove "Todos" "Usuarios" "Authenticated Users" >nul 2>&1

:: 2. Lo mismo para .env.production si existe
if exist ".env.production" (
    icacls .env.production /inheritance:r /grant:r "%USERNAME%":(R,W) /remove "Todos" "Usuarios" "Authenticated Users" >nul 2>&1
)

echo.
echo ✅ SEGURIDAD APLICADA. 
echo Solo el usuario '%USERNAME%' tiene permiso para ver las llaves secretas.
echo Los demas usuarios del PC o atacantes locales no podran leer el archivo .env.
pause