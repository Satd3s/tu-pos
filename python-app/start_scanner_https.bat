@echo off
echo ============================================
echo   ESCANER MOVIL CON HTTPS (ngrok)
echo ============================================
echo.

REM Verificar si ngrok existe
where ngrok >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] ngrok no esta instalado!
    echo.
    echo Para instalar ngrok:
    echo   1. Ve a https://ngrok.com/download
    echo   2. Descarga la version de Windows
    echo   3. Extrae ngrok.exe en esta carpeta
    echo   4. Crea una cuenta gratuita en ngrok.com
    echo   5. Copia tu authtoken desde el dashboard
    echo   6. Ejecuta: ngrok config add-authtoken TU_TOKEN
    echo.
    pause
    exit /b 1
)

echo [OK] ngrok encontrado
echo.
echo Iniciando tunel HTTPS para el escaner movil...
echo El escaner movil corre en el puerto 5555
echo.
echo Cuando ngrok inicie, veras una URL como:
echo   https://xxxx-xxx-xxx.ngrok.io
echo.
echo Usa ESA URL para escanear el QR o acceder desde el celular
echo La camara FUNCIONARA porque es HTTPS
echo.
echo Presiona Ctrl+C para detener
echo.

ngrok http 5555
