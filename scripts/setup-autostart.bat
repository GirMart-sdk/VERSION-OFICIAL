@echo off
title WINNER STORE - CONFIGURAR INICIO AUTÓNOMO (PM2)
cd /d "%~dp0.."

:: Verificar permisos de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ERROR: Se requieren permisos de ADMINISTRADOR.
    echo Por favor, haz clic derecho sobre este archivo y selecciona "Ejecutar como administrador".
    pause
    exit /b
)

echo [*] Verificando instalacion de PM2...
where pm2 >nul 2>&1
if %errorlevel% neq 0 (
    echo [*] Instalando PM2 de forma global...
    npm install pm2 -g
)

echo [*] Instalando modulo de inicio para Windows...
:: Este modulo permite que PM2 se registre en el arranque de Windows
npm install pm2-windows-startup -g

echo [*] Registrando PM2 en el inicio del sistema...
call pm2-startup install

echo [*] Cargando configuracion de Winner Store (ecosystem)...
:: Limpiar procesos previos para evitar duplicados
pm2 delete all >nul 2>&1
pm2 start ecosystem.config.js

echo [*] Guardando lista de procesos para persistencia...
pm2 save

echo.
echo [OK] Configuracion completada con exito.
echo Winner Store iniciara automaticamente cada vez que enciendas este equipo.
pause