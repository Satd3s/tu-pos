@echo off
echo ===================================================
echo   CONSTRUCTOR DE INSTALADOR PRO - TU POS
echo ===================================================
echo.

:: 1. Limpieza de carpetas de construcción previas
echo [1/4] Limpiando carpetas de construccion...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
echo      Carpetas limpiadas con éxito.

:: 2. Detección y uso del entorno virtual (.venv)
echo [2/4] Verificando entorno de compilacion...
set "VENV_PY=..\.venv\Scripts\python.exe"
set "VENV_PIP=..\.venv\Scripts\pip.exe"
set "VENV_PYINSTALLER=..\.venv\Scripts\pyinstaller.exe"

if exist "%VENV_PYINSTALLER%" (
    echo [OK] Entorno virtual detectado en: ..\.venv
    echo      Asegurando dependencias indispensables en el entorno virtual...
    "%VENV_PIP%" install pyinstaller eel flask flask-cors cryptography PyQt6 --quiet
    set "RUN_CMD=%VENV_PYINSTALLER%"
) else (
    echo [WARN] No se detecto el entorno virtual en ..\.venv.
    echo        Se utilizara el entorno global de Python en su lugar.
    pip install pyinstaller eel flask flask-cors cryptography PyQt6 --quiet
    set "RUN_CMD=pyinstaller"
)

:: 3. Compilación con PyInstaller utilizando el archivo .spec
echo [3/4] Generando ejecutable optimizado con PyInstaller...
echo      Ejecutando comando de compilacion...
%RUN_CMD% --noconfirm Tu_POS_Sistema.spec

if errorlevel 1 (
    echo.
    echo [ERROR] Ocurrio un fallo critico durante la compilacion con PyInstaller.
    pause
    exit /b 1
)

:: 4. Copia de DLLs de base de datos y recursos críticos (Auto-Contenido)
echo [4/4] Copiando archivos adicionales y librerias criticas...
set "TARGET_DIR=dist\Tu_POS_Sistema"

if not exist "%TARGET_DIR%" (
    echo [ERROR] La carpeta de destino %TARGET_DIR% no existe. La compilacion fallo silenciosamente.
    pause
    exit /b 1
)

:: Copiar DLLs del motor Firebird y archivos de configuracion
if exist "gds32.dll" (
    copy "gds32.dll" "%TARGET_DIR%\" >nul
    echo      [OK] gds32.dll copiado.
)
if exist "fbclient_old.dll" (
    copy "fbclient_old.dll" "%TARGET_DIR%\" >nul
    echo      [OK] fbclient_old.dll copiado.
)
if exist "config_default.json" (
    copy "config_default.json" "%TARGET_DIR%\" >nul
    echo      [OK] config_default.json copiado.
)
if exist "config.json" (
    copy "config.json" "%TARGET_DIR%\" >nul
    echo      [OK] config.json copiado.
)
if exist "inventory.db" (
    copy "inventory.db" "%TARGET_DIR%\" >nul
    echo      [OK] Base de datos inventory.db inicial copiada.
)

:: Copiar carpetas necesarias
if exist "firebird64" (
    xcopy /s /e /i /y /q "firebird64" "%TARGET_DIR%\firebird64" >nul
    echo      [OK] Carpeta firebird64 copiada.
)
if exist "certs" (
    xcopy /s /e /i /y /q "certs" "%TARGET_DIR%\certs" >nul
    echo      [OK] Carpeta certs copiada.
)

copy "INICIAR_SISTEMA.bat" "%TARGET_DIR%\" >nul
copy "README.md" "%TARGET_DIR%\" >nul
echo      [OK] Scripts de ejecucion y README copiados.

:: 5. Intento automático de compilar Inno Setup (si está instalado)
echo.
echo [OPCIONAL] Verificando Inno Setup para compilar instalador ejecutable unico...
set "ISCC_PATH=C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if not exist "%ISCC_PATH%" (
    set "ISCC_PATH=C:\Program Files\Inno Setup 6\ISCC.exe"
)

if exist "%ISCC_PATH%" (
    echo [INFO] Inno Setup detectado en: %ISCC_PATH%
    echo        Compilando Instalador_TuPOS.exe...
    "%ISCC_PATH%" /Q setup_script.iss
    if errorlevel 0 (
        echo [OK] Instalador compilado con exito en Output/Instalador_TuPOS.exe
    ) else (
        echo [WARN] Fallo la compilacion de Inno Setup.
    )
) else (
    echo [INFO] Inno Setup no detectado en las rutas estandar de Windows.
    echo        El instalador unico no se compilo. La carpeta auto-contenida esta lista.
)

echo.
echo ===================================================
echo   CONSTRUCCION COMPLETADA CON EXITO
echo ===================================================
echo La aplicacion auto-contenida esta lista para usar en:
echo   => dist\Tu_POS_Sistema\Tu_POS_Sistema.exe
echo.
pause
