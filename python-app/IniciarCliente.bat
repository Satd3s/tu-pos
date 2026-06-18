@echo off
echo ===============================================
echo    CAJA CLIENTE - Tu POS
echo ===============================================
echo.

cd /d "%~dp0"

echo Este modo se conecta a un servidor central.
echo.
echo Asegurate de que:
echo  1. El servidor este ejecutandose
echo  2. Configuraste la IP del servidor en config.json
echo.

python main.py

pause
