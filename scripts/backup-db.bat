@echo off
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
)