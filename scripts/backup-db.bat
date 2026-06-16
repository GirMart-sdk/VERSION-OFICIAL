@echo off
<<<<<<< HEAD
setlocal
:: Configuración - El directorio de backups sigue siendo la raiz para facil acceso
set BACKUP_DIR=c:\MI TIENDA\WINNER\backups

echo [%TIME%] [1/4] Obteniendo marca de tiempo...
:: Obtenemos fecha/hora de forma universal usando PowerShell
for /f "tokens=*" %%i in ('powershell -NoProfile -Command "Get-Date -Format 'yyyy-MM-dd_HH-mm')"') do set TIMESTAMP=%%i
set FILENAME=winner_backup_%TIMESTAMP%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo [%TIME%] [2/4] Verificando credenciales de base de datos...
if "%PGPASSWORD%"=="" (
    echo [!] ADVERTENCIA: PGPASSWORD no detectada. Si el script se detiene, 
    echo     ingresa la clave manualmente o configurala en el sistema.
)

echo [%TIME%] [3/4] Ejecutando pg_dump (Respaldo en curso)...
call pg_dump -U postgres -d dezpy_v01 -f "%BACKUP_DIR%\%FILENAME%" 2> "%BACKUP_DIR%\last_error.log"

if %ERRORLEVEL% EQU 0 (
    echo [%TIME%] [4/4] Finalizando: Respaldo completado con exito.
    echo [OK] Archivo generado: %FILENAME%
    if exist "%BACKUP_DIR%\..\BACKUP_FAILED.log" del "%BACKUP_DIR%\..\BACKUP_FAILED.log"
    
    echo [%TIME%] [*] Limpiando archivos antiguos de mas de 30 dias...
    forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -30 /c "cmd /c del @path"
) else (
    echo [!] ERROR CRITICO: El respaldo fallo. 
    echo     Revisa el archivo de log en: %BACKUP_DIR%\last_error.log
    echo El respaldo del %TIMESTAMP% fallo. > "%BACKUP_DIR%\..\BACKUP_FAILED.log"
    powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('¡ALERTA! El respaldo automatico de la base de datos ha FALLADO. Por favor, revise la carpeta de backups.', 'Error de Respaldo - Winner Store', 'OK', 'Error')"
=======
REM ════════════════════════════════════════════════════════════════
REM WINNER STORE v3.5 - Script de Copia de Seguridad Automática
REM ════════════════════════════════════════════════════════════════

set DB_NAME=dezpy_v01
set DB_USER=postgres

REM SEGURIDAD: No guardes la contraseña aquí. 
REM El script usará la variable PGPASSWORD si ya está definida en el sistema,
REM de lo contrario, PostgreSQL la solicitará interactivamente.
if "%PGPASSWORD%"=="" (
    echo [!] Aviso: PGPASSWORD no detectada. Se solicitara manualmente.
)

REM Ajusta la ruta a tu versión de PostgreSQL (14, 15, 16, etc.)
set PG_DUMP_PATH="C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"
set BACKUP_DIR=C:\DEZPY_v01\backups

REM Crear carpeta de backups si no existe
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM Generar nombre de archivo con fecha y hora: backup_YYYYMMDD_HHMM.sql
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set "dt=%%a"
set "TIMESTAMP=%dt:~0,8%_%dt:~8,4%"
set FILE_NAME=%BACKUP_DIR%\backup_%DB_NAME%_%TIMESTAMP%.sql

echo [*] Iniciando respaldo de la base de datos: %DB_NAME%...

%PG_DUMP_PATH% -U %DB_USER% -d %DB_NAME% -f "%FILE_NAME%"

if %errorlevel% equ 0 (
    echo ✅ Respaldo exitoso creado en: %FILE_NAME%
) else (
    echo ❌ ERROR: El respaldo falló. Verifica la ruta de PostgreSQL y tus credenciales.
>>>>>>> d324bcbcdb6793670891877f1dc99ee64a25c733
)