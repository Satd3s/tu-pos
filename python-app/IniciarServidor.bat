@echo off
echo ===============================================
echo    SERVIDOR MULTICAJA - Tu POS
echo ===============================================
echo.

cd /d "%~dp0"

echo Iniciando servidor API...
echo.
echo El servidor se iniciara en: http://localhost:5000
echo Las cajas cliente deben conectarse a esta IP
echo.
echo Para ver tu IP en la red local ejecuta: ipconfig
echo.

python server.py

pause
