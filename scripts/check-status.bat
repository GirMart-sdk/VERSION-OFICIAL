@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."
title WINNER STORE - DIAGNÓSTICO PROFESIONAL
chcp 65001 >nul

:: 1. Cargar Configuración de Seguridad
if not exist ".env" (
    echo [!] ERROR: No se encontró el archivo .env
    pause
    exit /b 1
)

for /f "usebackq tokens=1* delims==" %%a in (".env") do (
    if "%%a"=="ADMIN_API_KEY" set "KEY=%%b"
    if "%%a"=="API_KEY" if not defined KEY set "KEY=%%b"
    if "%%a"=="NETWORK_IP" set "IP=%%b"
)

echo.
echo   [ W I N N E R  -  S Y S T E M  D I A G N O S T I C ]
echo   ----------------------------------------------------
echo.

:: 2. Procesos PM2
echo [*] Verificando procesos de PM2...
call npx pm2 list
echo.

:: 3. Conectividad y Salud de Datos
echo [*] Verificando Salud de la API y Base de Datos...
powershell -Command "$headers = @{'x-api-key'='%KEY%'}; try { $r = Invoke-RestMethod -Uri 'http://localhost:3000/api/health' -Method Get -Headers $headers; Write-Host '   - API Status: ' $r.status -ForegroundColor Green; Write-Host '   - DB Status:  ' $r.database -ForegroundColor Green; Write-Host '   - Version:    ' $r.version -ForegroundColor Gray } catch { Write-Host '   - [!] ERROR: El servidor no responde o acceso denegado.' -ForegroundColor Red }"
echo.

:: 4. Auditoría de Sesiones
echo [*] Usuarios Conectados actualmente:
powershell -Command "$headers = @{'x-api-key'='%KEY%'}; try { $s = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/sessions' -Method Get -Headers $headers; if ($s.Count -gt 0) { $s | Format-Table username, ipAddress, lastActivity -AutoSize } else { Write-Host '   - No hay sesiones activas.' -ForegroundColor Gray } } catch { Write-Host '   - [!] No se pudo obtener la lista de sesiones.' -ForegroundColor Yellow }"
echo.

:: 5. Seguridad - Firewall de IPs
echo [*] Protección de Firewall (IPs Bloqueadas):
powershell -Command "$headers = @{'x-api-key'='%KEY%'}; try { $b = Invoke-RestMethod -Uri 'http://localhost:3000/api/admin/banned-ips' -Method Get -Headers $headers; if ($b.Count -gt 0) { $b | Format-Table ip, reason, expiresAt -AutoSize } else { Write-Host '   - No hay amenazas detectadas.' -ForegroundColor Green } } catch { Write-Host '   - [!] No se pudo consultar la tabla de bloqueos.' -ForegroundColor Yellow }"
echo.

:: 6. Red y Túneles
echo [*] Configuración de Red:
echo    - IP Red Local: %IP%
powershell -Command "try { $n = Invoke-RestMethod -Uri 'http://127.0.0.1:4040/api/tunnels' -Method Get; if ($n.tunnels) { Write-Host '   - Túnel Ngrok: ' $n.tunnels[0].public_url -ForegroundColor Blue } else { Write-Host '   - Túnel Ngrok: Inactivo' -ForegroundColor Gray } } catch { Write-Host '   - Túnel Ngrok: No detectado.' -ForegroundColor Gray }"
echo.

echo.
echo [=================== RESUMEN DE VENTAS (HOY) ===================]
powershell -Command "$headers = @{'x-api-key'='%KEY%'}; try { $date = Get-Date -Format 'yyyy-MM-dd'; $sales = Invoke-RestMethod -Uri 'http://localhost:3000/api/sales' -Method Get -Headers $headers; $today = $sales | Where-Object { $_.timestamp -like \"*$date*\" }; if ($today) { $total = ($today | Measure-Object -Property total -Sum).Sum; $fisica = ($today | Where-Object { $_.channel -eq 'fisica' } | Measure-Object -Property total -Sum).Sum; $online = ($today | Where-Object { $_.channel -eq 'online' } | Measure-Object -Property total -Sum).Sum; Write-Host ' > TOTAL VENTAS: ' $today.Count ' tickets' -ForegroundColor White; Write-Host ' > DINERO TOTAL: $' ($total.ToString('N0')) -ForegroundColor Cyan; Write-Host '   - Venta Fisica: $' ($fisica.ToString('N0')) -ForegroundColor Gray; Write-Host '   - Venta Online: $' ($online.ToString('N0')) -ForegroundColor Gray; } else { Write-Host ' No hay ventas registradas aun el dia de hoy.' -ForegroundColor Gray } } catch { Write-Host ' [!] Error: No se pudo conectar con la API de ventas.' -ForegroundColor Yellow }"
echo [===============================================================]

echo.
echo --------------------------------------------------
echo Diagnóstico completado.
pause