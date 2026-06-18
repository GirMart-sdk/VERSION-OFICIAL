@echo off
setlocal enabledelayedexpansion
title WINNER - CONFIGURAR AUTO-INICIO
cd /d "%~dp0"
chcp 65001 >nul

echo.
echo   [ W I N N E R  -  S E T U P  A U T O S T A R T ]
echo.
echo [*] Configurando el sistema para iniciar automáticamente al iniciar sesión...

set "TASK_NAME=WinnerStore_Autostart"
:: Usamos la ruta dinámica de donde se encuentra este script
set "VBS_PATH=%~dp0ABRIR_WINNER_MSl.vbs"

:: Eliminamos la tarea si ya existe para evitar duplicados
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

:: Creamos la nueva tarea vinculada al script silencioso
schtasks /create /tn "%TASK_NAME%" /tr "wscript.exe \"%VBS_PATH%\"" /sc onlogon /rl highest /f

if %errorlevel% equ 0 (
    echo.
    echo ✅ CONFIGURACIÓN EXITOSA.
    echo Winner Store se ejecutará en segundo plano cada vez que inicies sesión.
) else (
    echo.
    echo ❌ ERROR: Intenta ejecutar este archivo haciendo clic derecho y "Ejecutar como Administrador".
)

echo.
pause