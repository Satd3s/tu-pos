// =============================================================================
// NETWORK STATUS MANAGER
// Gestiona el estado de conexión en modo cliente-servidor
// =============================================================================

const NetworkManager = {
    mode: 'standalone',
    connected: false,
    stationName: 'CAJA-1',
    stationId: 1,
    pendingSync: 0,
    statusWidget: null,

    // Inicializar
    async init() {
        try {
            // Obtener modo de operación
            const modeResult = await eel.get_network_mode()();
            if (modeResult.success) {
                this.mode = modeResult.data.mode;
                console.log('[NetworkManager] Modo:', this.mode);
            }

            // Obtener info de estación
            const stationResult = await eel.get_station_info()();
            if (stationResult.success) {
                this.stationName = stationResult.data.station_name;
                this.stationId = stationResult.data.station_id;
            }

            // Solo crear widget si es modo cliente
            if (this.mode === 'client') {
                this.createStatusWidget();
                this.updateStatus();

                // Actualizar estado cada 30 segundos
                setInterval(() => this.updateStatus(), 30000);
            }

        } catch (error) {
            console.error('[NetworkManager] Error inicializando:', error);
        }
    },

    // Actualizar estado de conexión
    async updateStatus() {
        if (this.mode !== 'client') return;

        try {
            const result = await eel.get_network_status()();
            if (result.success) {
                this.connected = result.data.connected;
                this.pendingSync = result.data.pending_sync || 0;
                this.updateWidget();
            }
        } catch (error) {
            this.connected = false;
            this.updateWidget();
        }
    },

    // Crear widget de estado
    createStatusWidget() {
        // Verificar si ya existe
        if (document.getElementById('networkStatusWidget')) return;

        const widget = document.createElement('div');
        widget.id = 'networkStatusWidget';
        widget.className = 'network-status-widget';
        widget.innerHTML = `
            <div class="network-status-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01M4.93 12.93a10 10 0 0114.142 0"/>
                </svg>
            </div>
            <div class="network-status-info">
                <span class="network-station">${this.stationName}</span>
                <span class="network-state">Conectando...</span>
            </div>
            <div class="network-sync-badge" style="display: none;">
                <span>0</span>
            </div>
        `;

        // Agregar estilos
        this.addStyles();

        // Agregar al DOM
        document.body.appendChild(widget);
        this.statusWidget = widget;

        // Click para sincronizar
        widget.addEventListener('click', () => this.showSyncDialog());
    },

    // Actualizar widget visual
    updateWidget() {
        if (!this.statusWidget) return;

        const widget = this.statusWidget;
        const stateSpan = widget.querySelector('.network-state');
        const syncBadge = widget.querySelector('.network-sync-badge');
        const syncCount = syncBadge.querySelector('span');

        // Estado de conexión
        if (this.connected) {
            widget.classList.remove('offline');
            widget.classList.add('online');
            stateSpan.textContent = 'Conectado';
        } else {
            widget.classList.remove('online');
            widget.classList.add('offline');
            stateSpan.textContent = 'Sin conexión';
        }

        // Datos pendientes de sincronizar
        if (this.pendingSync > 0) {
            syncBadge.style.display = 'flex';
            syncCount.textContent = this.pendingSync;
        } else {
            syncBadge.style.display = 'none';
        }
    },

    // Mostrar diálogo de sincronización
    async showSyncDialog() {
        const message = this.connected
            ? `Estación: ${this.stationName}\nEstado: Conectado al servidor\nDatos pendientes: ${this.pendingSync}`
            : `Estación: ${this.stationName}\nEstado: Sin conexión (modo offline)\nDatos pendientes: ${this.pendingSync}\n\nLas ventas se sincronizarán cuando haya conexión.`;

        if (this.pendingSync > 0 && this.connected) {
            const sync = confirm(message + '\n\n¿Desea sincronizar ahora?');
            if (sync) {
                await this.syncNow();
            }
        } else {
            alert(message);
        }
    },

    // Sincronizar datos
    async syncNow() {
        try {
            showNotification('Sincronizando...', 'info');

            const result = await eel.sync_offline_data()();

            if (result.success) {
                showNotification('Sincronización completada', 'success');
                this.pendingSync = 0;
                this.updateWidget();
            } else {
                showNotification('Error al sincronizar: ' + result.error, 'error');
            }
        } catch (error) {
            showNotification('Error de conexión', 'error');
        }
    },

    // Intentar reconectar
    async reconnect() {
        try {
            const result = await eel.connect_to_server()();
            if (result.success) {
                this.connected = true;
                showNotification('Reconectado al servidor', 'success');

                // Sincronizar si hay datos pendientes
                if (this.pendingSync > 0) {
                    await this.syncNow();
                }
            }
            this.updateWidget();
        } catch (error) {
            this.connected = false;
            this.updateWidget();
        }
    },

    // Agregar estilos CSS
    addStyles() {
        if (document.getElementById('networkStatusStyles')) return;

        const style = document.createElement('style');
        style.id = 'networkStatusStyles';
        style.textContent = `
            .network-status-widget {
                position: fixed;
                bottom: 20px;
                left: 20px;
                display: flex;
                align-items: center;
                gap: 10px;
                background: rgba(45, 45, 45, 0.95);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 12px;
                padding: 10px 14px;
                color: white;
                font-size: 13px;
                cursor: pointer;
                z-index: 9999;
                transition: all 0.2s ease;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            }

            .network-status-widget:hover {
                background: rgba(55, 55, 55, 0.95);
                transform: translateY(-2px);
            }

            .network-status-widget.online .network-status-icon {
                color: #6CCB5F;
            }

            .network-status-widget.offline .network-status-icon {
                color: #FF99A4;
            }

            .network-status-icon svg {
                width: 20px;
                height: 20px;
            }

            .network-status-info {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }

            .network-station {
                font-weight: 600;
                font-size: 12px;
                color: rgba(255, 255, 255, 0.9);
            }

            .network-state {
                font-size: 11px;
                color: rgba(255, 255, 255, 0.6);
            }

            .network-status-widget.online .network-state {
                color: #6CCB5F;
            }

            .network-status-widget.offline .network-state {
                color: #FF99A4;
            }

            .network-sync-badge {
                display: flex;
                align-items: center;
                justify-content: center;
                min-width: 22px;
                height: 22px;
                background: #FF9500;
                border-radius: 11px;
                font-size: 11px;
                font-weight: 700;
                color: white;
                padding: 0 6px;
            }

            /* Animación de "pulso" cuando está offline */
            .network-status-widget.offline .network-status-icon {
                animation: pulse-offline 2s infinite;
            }

            @keyframes pulse-offline {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.5; }
            }
        `;

        document.head.appendChild(style);
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar un poco para que Eel esté listo
    setTimeout(() => NetworkManager.init(), 1000);
});

// Exponer globalmente
window.NetworkManager = NetworkManager;
