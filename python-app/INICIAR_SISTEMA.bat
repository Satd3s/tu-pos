@echo off
setlocal
echo [INFO] Iniciando Sistema de Inventario...
cd /d "%~dp0"

:: Verificar si python está en el PATH
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] No se encontro Python en el sistema.
    echo Por favor, instale Python o verifique su configuracion.
    pause
    exit /b
)

:: Ejecutar el lanzador nativo de Windows (PyQt6 - Hibrido Premium)
set PYTHON_EXEC=python

if exist "%~dp0.venv\Scripts\python.exe" (
    echo [INFO] Detectado entorno virtual local en .venv.
    set PYTHON_EXEC="%~dp0.venv\Scripts\python.exe"
) else if exist "C:\Users\Satd3s_\Documents\sat_dev\InventorySystem\.venv\Scripts\python.exe" (
    echo [INFO] Detectado entorno virtual de desarrollo.
    set PYTHON_EXEC="C:\Users\Satd3s_\Documents\sat_dev\InventorySystem\.venv\Scripts\python.exe"
) else (
    echo [INFO] No se encontro entorno virtual. Usando python global del sistema.
)

echo [INFO] Ejecutando: %PYTHON_EXEC% main.py
%PYTHON_EXEC% main.py

if %errorlevel% neq 0 (
    echo.
    echo [ALERTA] El programa se cerro con un error.
    pause
)
