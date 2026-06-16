@echo off
:: Script para registrar la tarea de backup automáticamente
echo [*] Registrando tarea de respaldo diario en Windows...

:: Actualizamos la ruta /tr para que apunte a la subcarpeta scripts
schtasks /create /tn "WinnerStore_DailyBackup" /tr "c:\MI TIENDA\WINNER\scripts\backup-db.bat" /sc daily /st 23:00 /f /rl HIGHEST

if %ERRORLEVEL% EQU 0 (
    echo --------------------------------------------------
    echo [OK] Tarea programada con exito.
    echo [OK] Los respaldos se ejecutaran cada noche a las 11:00 PM.
    echo --------------------------------------------------
) else ( echo [!] Error al registrar la tarea. Ejecuta como Administrador. )
pause