@echo off
setlocal enabledelayedexpansion

:: ==========================================
:: SCRIPT DE AUTO-REINICIO AL DETECTAR CAMBIOS
:: ==========================================

echo [INFO] Iniciando monitor de cambios...
set "WORK_DIR=%~dp0"
cd /d "%WORK_DIR%"

:restart
echo [RUN] Iniciando Aplicacion Hibrida...
:: Iniciar el proceso y guardar su PID
start /b "" python run_native.py > nul 2>&1

echo [STATUS] Sistema ejecutándose. Esperando cambios en archivos .js, .py, .html o .css...

:loop
:: Obtener el timestamp del archivo más reciente
set "LATEST="
for /f "tokens=1,2,3" %%a in ('dir /s /o-d /tw *.py *.js *.html *.css 2^>nul ^| findstr /r /c:"^[0-9]"') do (
    set "CURRENT_TIMESTAMP=%%a %%b %%c"
    if not defined LATEST set "LATEST=!CURRENT_TIMESTAMP!"
)

:: Si es la primera vez, guardar el estado inicial
if not defined LAST_CHECK_TIME (
    set "LAST_CHECK_TIME=%LATEST%"
)

:: Comparar timestamps
if "!LATEST!" neq "!LAST_CHECK_TIME!" (
    echo [DETECTED] Cambio detectado a las %time%
    set "LAST_CHECK_TIME=%LATEST%"
    
    echo [RESTART] Reiniciando aplicacion...
    :: Ejecutar el lanzador hibrido (Login Nativo + App Web)
    :: Cerrar el proceso de python que ejecuta la app
    taskkill /f /im python.exe /fi "WINDOWTITLE eq Tu POS" >nul 2>&1
    taskkill /f /im python.exe >nul 2>&1
    
    timeout /t 2 /nobreak > nul
    goto restart
)

:: Esperar 2 segundos antes del siguiente escaneo
timeout /t 2 /nobreak > nul
goto loop
