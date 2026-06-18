// =============================================================================
// STORAGE MANAGER - ADAPTADOR PYTHON/EEL
// Reemplaza localStorage con llamadas al backend Python
// =============================================================================

const StorageManager = {
    // Cache local para reducir llamadas
    _cache: {},
    _initialized: false,

    // ===== Productos =====
    async getProducts() {
        try {
            const result = await eel.get_products()();
            if (result.success) {
                this._cache.products = result.data;
                return result.data;
            }
            console.error('Error getting products:', result.error);
            return [];
        } catch (e) {
            console.error('Error:', e);
            return this._cache.products || [];
        }
    },

    async searchProducts(query) {
        try {
            const result = await eel.search_products(query)();
            return result.success ? result.data : [];
        } catch (e) {
            console.error('Error:', e);
            return [];
        }
    },

    async saveProduct(product) {
        try {
            const result = await eel.save_product(product)();
            if (result.success) {
                // Invalidar cache
                delete this._cache.products;
            }
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async deleteProduct(productId) {
        try {
            const result = await eel.delete_product(productId)();
            if (result.success) {
                delete this._cache.products;
            }
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    // ===== Movimientos =====
    async getMovements(filters = null) {
        try {
            const result = await eel.get_movements(filters)();
            return result.success ? result.data : [];
        } catch (e) {
            console.error('Error:', e);
            return [];
        }
    },

    async createMovement(movement) {
        try {
            const result = await eel.create_movement(movement)();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    // ===== Ventas =====
    async getSales(filters = null) {
        try {
            const result = await eel.get_sales(filters)();
            return result.success ? result.data : [];
        } catch (e) {
            console.error('Error:', e);
            return [];
        }
    },

    async createSale(saleData) {
        try {
            const result = await eel.create_sale(saleData)();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async cancelSale(saleId) {
        try {
            const result = await eel.cancel_sale(saleId)();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async getTodaySales() {
        try {
            const result = await eel.get_today_sales()();
            return result.success ? result.data : [];
        } catch (e) {
            console.error('Error:', e);
            return [];
        }
    },

    // ===== Turnos =====
    async startShift(initialFund) {
        try {
            const result = await eel.start_shift(initialFund)();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async endShift() {
        try {
            const result = await eel.end_shift()();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async getCurrentShift() {
        try {
            const result = await eel.get_current_shift()();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, active: false };
        }
    },

    // ===== Configuración =====
    async getSettings() {
        try {
            const result = await eel.get_settings()();
            if (result.success) {
                this._cache.settings = result.data;
                return result.data;
            }
            return {};
        } catch (e) {
            console.error('Error:', e);
            return this._cache.settings || {};
        }
    },

    async saveSettings(settings) {
        try {
            const result = await eel.save_settings(settings)();
            if (result.success) {
                this._cache.settings = { ...this._cache.settings, ...settings };
            }
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    // ===== Dashboard =====
    async getDashboardStats() {
        try {
            const result = await eel.get_dashboard_stats()();
            return result.success ? result.data : {};
        } catch (e) {
            console.error('Error:', e);
            return {};
        }
    },

    // ===== Reportes =====
    async getSalesReport(startDate, endDate) {
        try {
            const result = await eel.get_sales_report(startDate, endDate)();
            return result.success ? result.data : null;
        } catch (e) {
            console.error('Error:', e);
            return null;
        }
    },

    async getInventoryReport() {
        try {
            const result = await eel.get_inventory_report()();
            return result.success ? result.data : null;
        } catch (e) {
            console.error('Error:', e);
            return null;
        }
    },

    // ===== Utilidades =====
    async backup() {
        try {
            const result = await eel.backup_database()();
            return result;
        } catch (e) {
            console.error('Error:', e);
            return { success: false, error: e.message };
        }
    },

    async getNextFolio() {
        try {
            const result = await eel.get_next_folio()();
            return result.success ? result.folio : 'V000000';
        } catch (e) {
            console.error('Error:', e);
            return 'V000000';
        }
    },

    // ===== Compatibilidad con código existente =====
    // Estos métodos mantienen compatibilidad con el código que usa localStorage

    get(key, defaultValue = null) {
        // Primero buscar en cache
        if (this._cache[key] !== undefined) {
            return this._cache[key];
        }

        // Fallback: buscar en localStorage
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                this._cache[key] = parsed; // Guardar en cache para futuras consultas
                return parsed;
            }
        } catch (e) {
            console.warn('StorageManager: Error parsing localStorage key:', key, e);
        }

        return defaultValue;
    },

    set(key, value) {
        this._cache[key] = value;

        // Guardar también en localStorage para persistencia
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.warn('StorageManager: Error saving to localStorage:', key, e);
        }

        // Si es configuración, guardar en BD
        if (key === 'appSettings') {
            this.saveSettings(value);
        }
    },

    remove(key) {
        delete this._cache[key];

        // Eliminar también de localStorage
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('StorageManager: Error removing from localStorage:', key, e);
        }
    }
};

// Exponer globalmente
window.StorageManager = StorageManager;

// Inicialización cuando Eel esté listo
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Storage Manager: Conectando con Python...');

    // Esperar a que Eel esté disponible
    if (typeof eel !== 'undefined') {
        console.log('Storage Manager: Eel disponible');
        StorageManager._initialized = true;

        // Cargar configuración inicial
        await StorageManager.getSettings();
    } else {
        console.warn('Storage Manager: Eel no disponible, usando modo offline');
    }
});
