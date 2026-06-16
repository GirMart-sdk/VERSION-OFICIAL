@echo off
cd /d "%~dp0"
title WINNER STORE - ESTADO DEL SISTEMA
echo [*] Verificando procesos de PM2...
call pm2 list

echo.
echo [*] Verificando Tarea Programada de Backup...
schtasks /query /tn "WinnerStore_DailyBackup" /fo TABLE

echo.
echo [*] Verificando integridad de respaldos...
if exist "..\BACKUP_FAILED.log" (
    powershell -Command "Write-Host '!!! CRITICO: EL ULTIMO RESPALDO FALLO !!!' -ForegroundColor White -BackgroundColor Red"
    type "..\BACKUP_FAILED.log"
) else (
    powershell -Command "Write-Host '[OK] Respaldos al dia.' -ForegroundColor Green"
)

echo.
echo [*] Verificando conectividad local (Health Check)...
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -Method Get; Write-Host 'DB Status: ' $r.database -ForegroundColor Green } catch { Write-Host 'ERROR: El servidor no responde.' -ForegroundColor Red }"

echo.
echo [=================== RESUMEN DE VENTAS (HOY) ===================]
powershell -Command "try { $date = Get-Date -Format 'yyyy-MM-dd'; $sales = Invoke-RestMethod -Uri 'http://localhost:3000/api/sales' -Method Get; $today = $sales | Where-Object { $_.timestamp -like \"*$date*\" }; if ($today) { $total = ($today | Measure-Object -Property total -Sum).Sum; $fisica = ($today | Where-Object { $_.channel -eq 'fisica' } | Measure-Object -Property total -Sum).Sum; $online = ($today | Where-Object { $_.channel -eq 'online' } | Measure-Object -Property total -Sum).Sum; Write-Host ' > TOTAL VENTAS: ' $today.Count ' tickets' -ForegroundColor White; Write-Host ' > DINERO TOTAL: $' ($total.ToString('N0')) -ForegroundColor Cyan; Write-Host '   - Venta Fisica: $' ($fisica.ToString('N0')) -ForegroundColor Gray; Write-Host '   - Venta Online: $' ($online.ToString('N0')) -ForegroundColor Gray; } else { Write-Host ' No hay ventas registradas aun el dia de hoy.' -ForegroundColor Gray } } catch { Write-Host ' [!] Error: No se pudo conectar con la API de ventas.' -ForegroundColor Yellow }"
echo [===============================================================]

echo.
echo --------------------------------------------------
echo Presiona una tecla para cerrar...
pause > nul