@echo off
setlocal enabledelayedexpansion
title WINNER - VERIFICADOR DE INTEGRIDAD
cd /d "%~dp0\.."

color 0b
echo.
echo   [ W I N N E R  -  I N T E G R I T Y  C H E C K ]
echo.

echo [*] Consultando estado en GitHub...
git fetch origin main >nul 2>&1

FOR /F "tokens=*" %%g IN ('git rev-parse HEAD') DO SET LOCAL_SHA=%%g
FOR /F "tokens=*" %%g IN ('git rev-parse @{u}') DO SET REMOTE_SHA=%%g

echo [>] Hash Local:  %LOCAL_SHA%
echo [>] Hash Remoto: %REMOTE_SHA%
echo.

if "%LOCAL_SHA%"=="%REMOTE_SHA%" (
    echo ✅ INTEGRIDAD TOTAL: El codigo de este equipo coincide con la Version Oficial.
) else (
    echo ❌ DESINCRONIZADO: Este equipo tiene una version distinta a GitHub.
    echo [!] Si este es el equipo de ejecucion, usa: npm run sync:bridge
    echo [!] Si este es el equipo principal, recuerda hacer: git push
)

echo.
pause