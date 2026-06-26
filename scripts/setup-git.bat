@echo off
cls
echo.
echo  =================================================================
echo   CONFIGURADOR DE REPOSITORIO GIT PARA WINNER STORE (VERSION J7)
echo  =================================================================
echo.

set REPO_URL=https://github.com/GirMart-sdk/VERSION-J7.git

REM --- 1. Verificar si Git esta instalado ---
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado o no se encuentra en el PATH.
    echo Por favor, instala Git y asegurate de que este accesible.
    pause
    exit /b 1
)

REM --- 2. Inicializar repositorio si no existe ---
if not exist ".git" (
    echo [INFO] Inicializando nuevo repositorio Git en este directorio...
    git init
    echo [OK] Repositorio local creado.
) else (
    echo [INFO] El directorio ya es un repositorio Git.
)

REM --- 3. Renombrar rama a 'main' (estándar moderno) ---
echo [INFO] Asegurando que la rama principal sea 'main'...
git branch -M main

REM --- 4. Eliminar remoto 'origin' si existe y añadir el nuevo ---
echo [INFO] Configurando el repositorio remoto definitivo...
git remote remove origin >nul 2>&1
git remote add origin %REPO_URL%

REM --- 5. Preparar y guardar la primera versión del proyecto ---
echo [INFO] Añadiendo todos los archivos del proyecto al repositorio...
git add .
echo [INFO] Creando el commit inicial con la versión definitiva...
git commit -m "Initial commit: Carga de la versión definitiva del proyecto" >nul 2>&1

echo.
echo [OK] ¡Éxito! Tu proyecto está configurado y listo para ser subido.
echo.
echo    URL Remota: %REPO_URL%
echo.
echo --- PASOS A SEGUIR ---
echo 1. Abre una terminal (Git Bash, CMD o PowerShell) en este directorio.
echo 2. Ejecuta el siguiente comando para subir todo a GitHub:
echo    git push -u origin main
echo.
pause