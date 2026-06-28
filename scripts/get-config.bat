@echo off
:: get-config.bat
:: Uso: call get-config.bat <NOMBRE_VARIABLE> <variable_de_retorno>
setlocal
set "VAR_NAME=%1"
set "RETURN_VAR=%2"

for /f "usebackq tokens=1* delims==" %%a in ("%~dp0..\.env") do (
    if "%%a"=="%VAR_NAME%" set "RESULT=%%b"
)

(endlocal & set %RETURN_VAR%=%RESULT%)
exit /b