@echo off
title Tu POS - Sistema de Inventario
cd /d "%~dp0"
echo.
echo ========================================
echo    Tu POS - Sistema de Inventario
echo ========================================
echo.
echo Iniciando aplicacion...
echo.
python main.py
if errorlevel 1 (
    echo.
    echo [ERROR] Hubo un problema al iniciar.
    echo Verifica que Python este instalado.
    pause
)
