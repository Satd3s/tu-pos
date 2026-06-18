// =============================================================================
// SISTEMA DE NAVEGACIÓN CON PESTAÑAS
// Permite tener múltiples módulos abiertos simultáneamente
// =============================================================================

const TabsManager = {
    tabs: [],
    activeTabId: null,
    tabCounter: 0,
    enabledModules: {}, // Módulos habilitados desde config

    // Definición de TODOS los módulos disponibles (algunos pueden estar deshabilitados)
    allModules: {
        dashboard: {
            name: 'Dashboard',
            configKey: null,
            requiredPermission: null,
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>`,
            init: 'initDashboard'
        },
        products: {
            name: 'Productos',
            configKey: 'inventory',
            requiredPermission: 'inventory_view',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
            init: 'initProductsModule'
        },
        pos: {
            name: 'Punto de Venta',
            configKey: 'pos',
            requiredPermission: 'pos_access',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
            init: 'initPOSModule',
            fullscreen: false
        },
        movements: {
            name: 'Movimientos',
            configKey: 'inventory',
            requiredPermission: 'movements_view',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"/></svg>`,
            init: 'initMovementsModule'
        },
        suppliers: {
            name: 'Proveedores',
            configKey: 'suppliers',
            requiredPermission: 'suppliers_view',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>`,
            init: 'initSuppliersModule'
        },
        customers: {
            name: 'Clientes',
            configKey: 'customers',
            requiredPermission: 'customers_view',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>`,
            init: 'initCustomersModule'
        },
        reports: {
            name: 'Reportes',
            configKey: 'reports',
            requiredPermission: 'reports_view',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
            init: 'initReportsModule'
        },
        settings: {
            name: 'Ajustes',
            configKey: null,
            requiredPermission: 'settings_access',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
            init: 'initSettingsModule'
        }
    },

    // Módulos activos (se filtra según configuración)
    modules: {},

    // Inicializar el sistema
    async init() {
        // Cargar módulos habilitados desde la configuración
        await this.loadEnabledModules();

        this.renderSidebar();
        this.renderTabsBar();
        this.setupEventListeners();

        // Abrir Dashboard por defecto
        this.openTab('dashboard');
    },

    // Cargar módulos habilitados desde el backend
    async loadEnabledModules() {
        try {
            const result = await eel.get_app_config()();
            if (result && result.success && result.data) {
                const configModules = result.data.modules || {};

                // Obtener usuario actual y sus permisos
                const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
                const userRole = currentUser.role || 'user';
                const userPermissions = currentUser.permissions || {};
                const isAdmin = userRole === 'admin';

                console.log('[TabsManager] Usuario:', userRole, userPermissions);

                // Filtrar módulos basándose en la configuración Y en permisos del usuario
                this.modules = {};
                for (const [key, module] of Object.entries(this.allModules)) {
                    // 1. Verificar Permisos de Usuario
                    if (module.requiredPermission && !isAdmin) {
                        // Si el usuario no tiene el permiso, saltar este módulo
                        if (!userPermissions[module.requiredPermission]) {
                            // Excepción: si es dashboard siempre mostrar
                            if (key !== 'dashboard') continue;
                        }
                    }

                    // 2. Verificar Configuración Global (si aplica)
                    if (module.configKey === null) {
                        this.modules[key] = module;
                        continue;
                    }

                    // Verificar si el módulo está habilitado en config
                    const configModule = configModules[module.configKey];
                    if (configModule && configModule.enabled) {
                        this.modules[key] = module;
                    }
                }

                console.log('[TabsManager] Modulos habilitados (Config + Permisos):', Object.keys(this.modules));

                // Guardar configuración de módulos globalmente para uso posterior
                window.enabledConfigModules = configModules;

                // Ocultar elementos en el DOM que requieren módulos deshabilitados
                this.hideDisabledModuleElements(configModules);
            } else {
                // Fallback: usar todos los módulos
                this.modules = { ...this.allModules };
            }
        } catch (error) {
            console.error('[TabsManager] Error cargando config:', error);
            // Fallback: usar todos los módulos
            this.modules = { ...this.allModules };
        }
    },

    // Ocultar elementos que requieren módulos deshabilitados
    hideDisabledModuleElements(configModules) {
        // Buscar todos los elementos con data-requires-module
        document.querySelectorAll('[data-requires-module]').forEach(el => {
            const requiredModule = el.dataset.requiresModule;
            const moduleConfig = configModules[requiredModule];

            // Si el módulo no existe o está deshabilitado, ocultar el elemento
            if (!moduleConfig || !moduleConfig.enabled) {
                el.style.display = 'none';
                console.log(`[TabsManager] Ocultando elemento que requiere modulo: ${requiredModule}`);
            } else {
                el.style.display = '';  // Mostrar
            }
        });
    },

    // Renderizar sidebar mini
    renderSidebar() {
        const sidebar = document.getElementById('sidebarMini');
        if (!sidebar) return;

        let html = '<div class="nav-section">';

        for (const [key, module] of Object.entries(this.modules)) {
            html += `
                <button class="nav-icon-btn" data-module="${key}" title="${module.name}">
                    ${module.icon}
                    <span class="nav-label">${module.name}</span>
                </button>
            `;
        }

        html += '</div>'; // Cierre de nav-section superior

        // Sección inferior de usuario
        const currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || '{}');
        const userName = currentUser.fullName || currentUser.username || 'Usuario';
        const userInitial = userName.substring(0, 1).toUpperCase();

        html += `
            <div style="margin-top: auto; border-top: 1px solid var(--dark-border); padding-top: 10px;">
                <div class="nav-icon-btn" title="${userName}" style="cursor: default;">
                   <div style="width: 24px; height: 24px; min-width: 24px; flex-shrink: 0; background: linear-gradient(135deg, var(--primary-500), var(--primary-600)); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
                        ${userInitial}
                   </div>
                   <span class="nav-label" style="font-size: 0.8rem;">${userName}</span>
                </div>
                
                <button class="nav-icon-btn" onclick="handleLogout()" title="Cerrar Sesión">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                    <span class="nav-label">Cerrar Sesión</span>
                </button>
                
                <button class="nav-icon-btn warning" onclick="exitAppWithBackup()" title="Salir y Respaldar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M12 5l7 7-7 7"/></svg>
                    <span class="nav-label">Salir</span>
                </button>
            </div>
        `;

        sidebar.innerHTML = html;
    },

    // Renderizar barra de pestañas
    renderTabsBar() {
        const tabsBar = document.getElementById('tabsBar');
        if (!tabsBar) return;

        let html = '';

        this.tabs.forEach(tab => {
            const module = this.modules[tab.module];
            const isActive = tab.id === this.activeTabId;

            html += `
                <div class="tab-item ${isActive ? 'active' : ''}" data-tab-id="${tab.id}" data-module="${tab.module}">
                    <span class="tab-icon">${module.icon}</span>
                    <span class="tab-name">${tab.title || module.name}</span>
                    <span class="tab-close" onclick="TabsManager.closeTab('${tab.id}', event)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                        </svg>
                    </span>
                </div>
            `;
        });

        // Botón de nueva pestaña
        html += `
            <div class="new-tab-wrapper" style="position: relative;">
                <button class="new-tab-btn" onclick="TabsManager.toggleNewTabDropdown()">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                </button>
                <div id="newTabDropdown" class="new-tab-dropdown">
                    ${Object.entries(this.modules).map(([key, m]) => `
                        <div class="new-tab-dropdown-item" onclick="TabsManager.openTab('${key}')">
                            ${m.icon}
                            <span>${m.name}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        tabsBar.innerHTML = html;
    },

    // Abrir una nueva pestaña
    openTab(moduleKey, options = {}) {
        const module = this.modules[moduleKey];
        if (!module) return;

        // Verificar si ya hay una pestaña de este módulo
        const existingTab = this.tabs.find(t => t.module === moduleKey);
        if (existingTab && !options.allowDuplicate) {
            this.activateTab(existingTab.id);
            return;
        }

        // Crear nueva pestaña
        this.tabCounter++;
        const tabId = `tab-${this.tabCounter}`;

        const tab = {
            id: tabId,
            module: moduleKey,
            title: options.title || module.name,
            data: options.data || {}
        };

        this.tabs.push(tab);

        // Crear contenedor de vista
        this.createTabView(tab);

        // Activar la nueva pestaña
        this.activateTab(tabId);

        // Cerrar dropdown
        this.hideNewTabDropdown();
    },

    // Crear el contenedor HTML para la vista de una pestaña
    createTabView(tab) {
        const viewsContainer = document.getElementById('viewsContainer');
        if (!viewsContainer) return;

        const module = this.modules[tab.module];

        // Buscar el template
        const template = document.getElementById(`${tab.module}View`);

        const viewDiv = document.createElement('div');
        viewDiv.id = tab.id;
        viewDiv.className = 'tab-view';
        viewDiv.dataset.module = tab.module;

        if (template && template.content) {
            // Es un <template>, clonar su contenido
            const clone = template.content.cloneNode(true);
            viewDiv.appendChild(clone);
        } else if (template) {
            // Es un elemento normal, copiar innerHTML
            viewDiv.innerHTML = template.innerHTML;
        } else {
            // Contenido placeholder
            viewDiv.innerHTML = `
                <div class="view-header-compact">
                    <div>
                        <h2>${module.name}</h2>
                        <p class="subtitle">Módulo en desarrollo</p>
                    </div>
                </div>
                <p>Contenido del módulo ${module.name}</p>
            `;
        }

        viewsContainer.appendChild(viewDiv);
    },

    // Activar una pestaña
    activateTab(tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;

        this.activeTabId = tabId;

        // Actualizar clases CSS
        document.querySelectorAll('.tab-item').forEach(el => {
            el.classList.toggle('active', el.dataset.tabId === tabId);
        });

        document.querySelectorAll('.tab-view').forEach(el => {
            el.classList.toggle('active', el.id === tabId);
        });

        // Actualizar sidebar
        document.querySelectorAll('.nav-icon-btn').forEach(el => {
            el.classList.toggle('active', el.dataset.module === tab.module);
        });

        // Inicializar módulo si tiene función de init
        const module = this.modules[tab.module];
        if (module.init && typeof window[module.init] === 'function') {
            setTimeout(() => window[module.init](), 100);
        }

        // Modo fullscreen para POS
        if (module.fullscreen) {
            document.body.classList.add('tab-fullscreen-mode');
        } else {
            document.body.classList.remove('tab-fullscreen-mode');
        }

        this.renderTabsBar();
    },

    // Cerrar una pestaña
    closeTab(tabId, event) {
        if (event) event.stopPropagation();

        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex === -1) return;

        // No permitir cerrar si es la única pestaña
        if (this.tabs.length === 1) {
            return;
        }

        // Eliminar pestaña
        this.tabs.splice(tabIndex, 1);

        // Eliminar vista del DOM
        const viewEl = document.getElementById(tabId);
        if (viewEl) viewEl.remove();

        // Si era la pestaña activa, activar otra
        if (this.activeTabId === tabId) {
            const newActiveTab = this.tabs[Math.min(tabIndex, this.tabs.length - 1)];
            if (newActiveTab) {
                this.activateTab(newActiveTab.id);
            }
        } else {
            this.renderTabsBar();
        }
    },

    // Toggle dropdown de nueva pestaña
    toggleNewTabDropdown() {
        const dropdown = document.getElementById('newTabDropdown');
        if (dropdown) {
            dropdown.classList.toggle('show');
        }
    },

    hideNewTabDropdown() {
        const dropdown = document.getElementById('newTabDropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Click en sidebar
        document.getElementById('sidebarMini')?.addEventListener('click', (e) => {
            const btn = e.target.closest('.nav-icon-btn');
            if (btn) {
                this.openTab(btn.dataset.module);
            }
        });

        // Click en pestaña
        document.getElementById('tabsBar')?.addEventListener('click', (e) => {
            const tabItem = e.target.closest('.tab-item');
            if (tabItem && !e.target.closest('.tab-close')) {
                this.activateTab(tabItem.dataset.tabId);
            }
        });

        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.new-tab-wrapper')) {
                this.hideNewTabDropdown();
            }
        });

        // Atajos de teclado para pestañas
        document.addEventListener('keydown', (e) => {
            // Ctrl+W = Cerrar pestaña actual
            if (e.ctrlKey && e.key === 'w') {
                e.preventDefault();
                if (this.activeTabId && this.tabs.length > 1) {
                    this.closeTab(this.activeTabId);
                }
            }

            // Ctrl+Tab = Siguiente pestaña
            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                const currentIndex = this.tabs.findIndex(t => t.id === this.activeTabId);
                const nextIndex = (currentIndex + 1) % this.tabs.length;
                this.activateTab(this.tabs[nextIndex].id);
            }
        });
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Solo inicializar si existe el contenedor de tabs
    if (document.getElementById('tabsBar')) {
        TabsManager.init();
    }
});

// Exponer globalmente
window.TabsManager = TabsManager;
