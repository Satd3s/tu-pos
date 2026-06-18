@echo off
REM Script para exportar productos de Abarrotes PDV a CSV
REM Usa las herramientas nativas de 32-bit

cd /d "C:\Users\_SATD3S_\Documents\AbarrotesPDV"

echo ============================================================
echo EXPORTADOR DE PRODUCTOS - ABARROTES PDV
echo ============================================================
echo.

REM Primero hacemos backup de la BD a un archivo portable
echo Paso 1: Creando respaldo de la base de datos...
gbak.exe -b -v -user SYSDBA -password masterkey db\PDVDATA.FDB "%TEMP%\pdv_backup.fbk"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo crear el respaldo
    echo Puede que la base de datos este en uso
    echo Cierra el programa Abarrotes e intenta de nuevo
    pause
    exit /b 1
)

echo.
echo [OK] Respaldo creado exitosamente!
echo.

REM Restaurar a una nueva BD que podamos leer
echo Paso 2: Restaurando a formato compatible...
gbak.exe -c -v -user SYSDBA -password masterkey "%TEMP%\pdv_backup.fbk" "%TEMP%\pdvdata_export.fdb"

if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo restaurar el respaldo
    pause
    exit /b 1
)

echo.
echo [OK] Base de datos restaurada!
echo Archivo: %TEMP%\pdvdata_export.fdb
echo.

REM Copiar el archivo al proyecto
copy "%TEMP%\pdvdata_export.fdb" "C:\Users\_SATD3S_\Documents\InventorySystem\python-app\pdvdata_export.fdb"

echo.
echo ============================================================
echo LISTO! Base de datos exportada a:
echo C:\Users\_SATD3S_\Documents\InventorySystem\python-app\pdvdata_export.fdb
echo ============================================================
pause
