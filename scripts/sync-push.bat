@echo off
title WINNER STORE - SINCRONIZAR CAMBIOS
cd /d "%~dp0.."

where git >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Git no se reconoce como un comando interno. Verifique su instalacion.
    pause
    exit /b
)

echo [*] Verificando cambios locales...
git status

echo.
echo [*] Verificando si hay archivos .bat ignorados por .gitignore...
git clean -ndX | findstr /i ".bat"
if %errorlevel% equ 0 (
    echo [!] Advertencia: Hay archivos .bat que Git esta ignorando.
)
echo.
set /p msg="Introduce un mensaje para este cambio (ej: actualizacion de stock): "

if "%msg%"=="" set "msg=Actualizacion automatica Winner Store"

echo [*] Forzando la inclusion de todos los scripts (Asegurando 11 archivos .bat)...
git add -f scripts/*.bat

echo [*] Preparando el resto de los archivos...
git add .

echo [*] Guardando cambios localmente...
git commit -m "%msg%"

echo [*] Subiendo a GitHub...
git push origin main

echo.
echo [OK] Sincronizacion completada.
pause