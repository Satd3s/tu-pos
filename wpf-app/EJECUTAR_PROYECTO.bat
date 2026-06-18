@echo off
title Tu POS - Iniciar Aplicacion
echo ===================================================
echo   Iniciando Tu POS (C# WPF)
echo ===================================================
echo.
dotnet run --project TuPos.App\TuPos.App.csproj
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] No se pudo ejecutar la aplicacion.
    pause
)
