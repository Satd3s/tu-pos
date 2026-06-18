@echo off
title Tu POS - Compilar y Probar
echo ===================================================
echo   Compilando la Solucion Tu POS (C# WPF)
echo ===================================================
echo.
dotnet build
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] La compilacion ha fallado.
    pause
    exit /b %errorlevel%
)
echo.
echo ===================================================
echo   Ejecutando Pruebas Unitarias TDD (xUnit)
echo ===================================================
echo.
dotnet test
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Algunas pruebas unitarias han fallado.
    pause
    exit /b %errorlevel%
)
echo.
echo ===================================================
echo   COMPILACION Y PRUEBAS EXITOSAS
echo ===================================================
echo.
pause
