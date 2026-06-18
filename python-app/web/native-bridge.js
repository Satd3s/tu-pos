/**
 * PUENTE NATIVO - WEB
 * Detecta si la aplicación se ejecutó desde el lanzador nativo híbrido
 * y realiza el autologin si es necesario.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("Iniciando Native Bridge...");

    // 1. Detectar parámetro URL (lo más rápido)
    const urlParams = new URLSearchParams(window.location.search);
    const autologin = urlParams.get('autologin');

    if (autologin === 'true') {
        console.log("Modo Autologin detectado por URL");

        // Intentar obtener los datos reales del usuario desde Python
        try {
            if (typeof eel !== 'undefined') {
                // Esperar a que eel esté listo
                setTimeout(async () => {
                    if (eel.get_logged_user_bypass) {
                        const result = await eel.get_logged_user_bypass()();
                        if (result && result.success && result.data) {
                            console.log("Usuario recuperado:", result.data);
                            performAutoLogin(result.data);
                        } else {
                            console.log("Autologin desactivado por seguridad. Por favor inicie sesión.");
                        }
                    }
                }, 500);
            }
        } catch (e) {
            console.error("Error en puente nativo:", e);
        }
    }
});

function performAutoLogin(userData) {
    // Inyectar usuario en el sistema Web
    window.currentUser = userData;

    if (window.StorageManager) {
        StorageManager.set('currentUser', userData);
    }

    // Ocultar login y mostrar app
    const loginSection = document.getElementById('loginSection');
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAppHandler = document.getElementById('mainAppContainer'); // index-tabs.html

    if (loginSection) loginSection.classList.add('hidden');
    if (loginSection) loginSection.style.display = 'none';

    if (loginOverlay) loginOverlay.style.display = 'none';

    if (mainAppHandler) {
        mainAppHandler.style.display = 'flex';
        mainAppHandler.classList.remove('hidden');
    }

    // Inicializar UI web
    if (typeof updateUserInfo === 'function') updateUserInfo();
    if (typeof updateDashboard === 'function') updateDashboard();

    // Si estamos en layout de pestañas, abrir Dashboard
    if (typeof TabsManager !== 'undefined') {
        // Recargar módulos habilitados según permisos del usuario recuperado
        TabsManager.loadEnabledModules().then(() => {
            TabsManager.renderSidebar();
            TabsManager.renderTabsBar();

            if (!document.querySelector('.tab-item.active')) {
                TabsManager.openTab('dashboard');
            }

            // Mostrar/Ocultar tab de usuarios según rol
            const usersTab = document.querySelector('[data-tab="users"]');
            if (usersTab) {
                usersTab.style.display = userData.role === 'admin' ? 'block' : 'none';
            }
        });
    }
}
