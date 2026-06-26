@echo off
cls
chcp 65001 >nul
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
git add . >nul 2>&1

REM Verificar si hay cambios para evitar un error de commit vacío
git diff --staged --quiet
if errorlevel 1 (
    echo [INFO] Creando commit con los cambios detectados...
    git commit -m "Initial commit: Carga de la versión definitiva del proyecto"
) else (
    echo [INFO] No hay nuevos cambios que guardar. Todo está al día.
)

REM --- 6. Subir los cambios al repositorio remoto ---
echo [INFO] Subiendo la versión definitiva a GitHub...
git push -u origin main

echo.
echo [OK] ¡Éxito! Tu proyecto ha sido configurado y subido a GitHub.
echo.
echo    URL Remota: %REPO_URL%
echo.
pause