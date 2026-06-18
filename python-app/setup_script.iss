; Script generado para Inno Setup
; SITIO WEB: http://www.jrsoftware.org/isinfo.php

#define MyAppName "Tu POS Sistema"
#define MyAppVersion "1.0"
#define MyAppPublisher "Tu Empresa"
#define MyAppURL "http://www.ejemplo.com/"
#define MyAppExeName "Tu_POS_Sistema.exe"

[Setup]
; Identificador único de la aplicación
AppId={{A3D2F7B1-4E6C-4A9D-8B2E-1F3G5H7J9K0L}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={autopf}\{#MyAppName}
DisableProgramGroupPage=yes
; El archivo de salida se llamará "Instalador_TuPOS.exe"
OutputBaseFilename=Instalador_TuPOS
Compression=lzma
SolidCompression=yes
WizardStyle=modern

; Icono del instalador (usar uno genérico si no tienes .ico)
; SetupIconFile=icon.ico

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; IMPORTANTE: Asegúrate de que la ruta Source apunte a la carpeta 'dist\Tu_POS_Sistema' generada por PyInstaller
Source: "dist\Tu_POS_Sistema\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#MyAppName}}"; Flags: nowait postinstall skipifsilent

[Code]
// Aquí podriamos agregar lógica personalizada si fuera necesario, 
// pero la confirguración real se hace dentro de la app (Wizard interno).
