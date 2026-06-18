REM Script para exportar productos de Firebird a CSV usando isql de 32 bits
@echo off
cd /d "C:\Users\_SATD3S_\Documents\InventorySystem\python-app\firebird64"

echo Conectando a la base de datos...
echo.

REM Crear script SQL para exportar
echo SELECT codigo, descripcion, precio_venta, precio_compra, departamento, existencias FROM productos; > export.sql

REM Ejecutar con isql
isql.exe -u SYSDBA -p masterkey "..\pdvdata_64.fdb" -i export.sql -o productos_export.txt

echo Listo!
pause
