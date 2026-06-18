document.addEventListener('DOMContentLoaded', async () => {
    // Detectar parámetro URL de autologin
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('autologin') === 'true') {
        console.log("🚀 Modo Autologin detectado");

        const waitForEel = setInterval(async () => {
            if (typeof eel !== 'undefined' && eel.get_logged_user_bypass) {
                clearInterval(waitForEel);
                try {
                    const result = await eel.get_logged_user_bypass()();
                    if (result && result.success && result.data) {
                        console.log("✅ Usuario recuperado:", result.data);

                        // Inyectar usuario en localStorage
                        const userData = result.data;
                        if (window.StorageManager) {
                            StorageManager.set('currentUser', userData);
                            window.currentUser = userData;
                        }

                        // Ocultar login y mostrar dashboard
                        const loginSection = document.getElementById('loginSection');
                        const loginOverlay = document.getElementById('loginOverlay');
                        const mainApp = document.getElementById('mainAppContainer');

                        if (loginSection) loginSection.style.display = 'none';
                        if (loginOverlay) loginOverlay.style.display = 'none';
                        if (mainApp) {
                            mainApp.style.display = 'flex';
                            mainApp.classList.remove('hidden');
                        }

                        // Inicializar UI
                        if (typeof updateUserInfo === 'function') updateUserInfo();
                        if (typeof updateDashboard === 'function') updateDashboard();
                        if (typeof TabsManager !== 'undefined') {
                            TabsManager.loadEnabledModules().then(() => {
                                TabsManager.renderSidebar();
                                TabsManager.renderTabsBar();
                                if (!document.querySelector('.tab-item.active')) {
                                    TabsManager.openTab('dashboard');
                                }
                            });
                        }
                    }
                } catch (e) {
                    console.error("Autologin falló:", e);
                }
            }
        }, 100);

        // Timeout de seguridad
        setTimeout(() => clearInterval(waitForEel), 5000);
    }
});
