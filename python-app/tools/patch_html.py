import os

def patch():
    web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')
    html_path = os.path.join(web_dir, 'index-tabs.html')
    
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. PARCHE DE SCRIPTS AL FINAL (Ya lo tenemos, pero aseguramos)
    scripts_footer = """
    <!-- INYECCIÓN AUTOMÁTICA -->
    <script src="storage-manager.js"></script>
    <script src="tabs-manager.js"></script>
    <script src="app.js"></script>
    <script src="native-bridge.js"></script>
    <script src="autologin-patch.js"></script>
    <!-- Módulo POS Corregido -->
    <script src="pos-module.js?v=FIXed_v2"></script>
    <script src="modules-init.js"></script>
    </body>
    """
    
    # Reemplazar scripts del final si es necesario
    # Forzamos si falta 'autologin' O falta 'pos-module'
    if '</body>' in content and ('autologin-patch.js' not in content or 'pos-module.js' not in content):
        # Limpiar versiones anteriores para evitar duplicados sucios
        content = content.replace('<script src="app.js"></script>', '')
        content = content.replace('<script src="modules-init.js"></script>', '')
        content = content.replace('<script src="autologin-patch.js"></script>', '') # Limpiar por si acaso
        
        content = content.replace('</body>', scripts_footer)
        print("[Scripts] Footer actualizado con pos-module.js.")


    # 2. PARCHE ANTI-PARPADEO EN EL HEAD
    # Insertamos un script que oculta el login INMEDIATAMENTE si hay autologin
    anti_flicker_script = """
    <script>
        // ANTI-FLICKER: Ocultar login inmediatamente si es autologin
        if (window.location.search.includes('autologin=true')) {
            document.write('<style>#loginSection, #loginOverlay { display: none !important; }</style>');
        }
    </script>
    </head>
    """
    
    if 'ANTI-FLICKER' not in content:
        content = content.replace('</head>', anti_flicker_script)
        print("[Anti-Flicker] Head actualizado.")
    else:
        print("[Anti-Flicker] Ya estaba aplicado.")
        
    with open(html_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("HTML parcheado exitosamente.")

if __name__ == '__main__':
    patch()
