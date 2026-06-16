@echo off
title CONFIGURAR CREDENCIALES DB
echo ===================================================
echo   CONFIGURACION DE CONTRASEÑA PARA BACKUPS
echo ===================================================
echo.
set /p DB_PASS="Introduce la contraseña de PostgreSQL (usuario postgres): "

:: Guardamos la variable de entorno de forma permanente para el usuario
setx PGPASSWORD "%DB_PASS%"

echo.
echo [OK] Contraseña configurada. 
echo [!] Reinicia la terminal para que los cambios surtan efecto.
pause