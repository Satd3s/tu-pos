// ===== MÓDULO DE AJUSTES =====
// Este archivo contiene la lógica para el módulo de configuración del sistema

// ===== Cargar Ajustes =====
function loadSettings() {
    const settings = StorageManager.get('appSettings', getDefaultSettings());

    // Aplicar valores a los campos del formulario
    document.getElementById('companyName').value = settings.companyName || '';
    document.getElementById('companyPhone').value = settings.companyPhone || '';
    document.getElementById('companyEmail').value = settings.companyEmail || '';
    document.getElementById('companyAddress').value = settings.companyAddress || '';

    document.getElementById('primaryColor').value = settings.primaryColor || '#3b82f6';
    document.getElementById('primaryColorValue').textContent = settings.primaryColor || '#3b82f6';

    document.getElementById('lowStockThreshold').value = settings.lowStockThreshold || 5;
    document.getElementById('currencySymbol').value = settings.currency || 'MXN';
    document.getElementById('minProfitMargin').value = settings.minProfitMargin || 15;

    // Aplicar tema
    applyTheme(settings.theme || 'dark');

    // Actualizar selector de tema
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.theme === (settings.theme || 'dark')) {
            btn.classList.add('active');
        }
    });

    // Aplicar color principal
    applyPrimaryColor(settings.primaryColor || '#3b82f6');

    // Actualizar nombre de la empresa en el sidebar
    updateCompanyNameDisplay(settings.companyName);
}

function getDefaultSettings() {
    return {
        companyName: 'Refaccionaria Smip',
        companyPhone: '',
        companyEmail: '',
        companyAddress: '',
        primaryColor: '#3b82f6',
        theme: 'dark',
        lowStockThreshold: 5,
        currency: 'MXN',
        minProfitMargin: 15
    };
}

// ===== Guardar Ajustes =====
function saveSettings() {
    const settings = {
        companyName: document.getElementById('companyName').value,
        companyPhone: document.getElementById('companyPhone').value,
        companyEmail: document.getElementById('companyEmail').value,
        companyAddress: document.getElementById('companyAddress').value,
        primaryColor: document.getElementById('primaryColor').value,
        theme: document.querySelector('.theme-option.active')?.dataset.theme || 'dark',
        lowStockThreshold: parseInt(document.getElementById('lowStockThreshold').value) || 5,
        currency: document.getElementById('currencySymbol').value,
        minProfitMargin: parseInt(document.getElementById('minProfitMargin').value) || 15
    };

    StorageManager.set('appSettings', settings);

    // Aplicar cambios inmediatamente
    applyPrimaryColor(settings.primaryColor);
    applyTheme(settings.theme);
    updateCompanyNameDisplay(settings.companyName);

    showNotification('Ajustes guardados correctamente', 'success');
}

// ===== Aplicar Color Principal =====
function applyPrimaryColor(color) {
    document.documentElement.style.setProperty('--primary-500', color);

    // Generar variaciones del color
    const hsl = hexToHSL(color);

    document.documentElement.style.setProperty('--primary-400', `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 10, 90)}%)`);
    document.documentElement.style.setProperty('--primary-600', `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 10, 20)}%)`);
    document.documentElement.style.setProperty('--primary-700', `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 20, 15)}%)`);
}

// ===== Aplicar Tema =====
function applyTheme(theme) {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);

    if (theme === 'light') {
        // Fondos - más suaves, menos brillantes
        document.documentElement.style.setProperty('--dark-bg', '#e8ecf1');
        document.documentElement.style.setProperty('--dark-surface', '#f8fafc');
        document.documentElement.style.setProperty('--dark-surface-hover', '#f1f5f9');
        document.documentElement.style.setProperty('--dark-border', '#cbd5e1');

        // Textos - más oscuros para mejor contraste
        document.documentElement.style.setProperty('--gray-100', '#0f172a');
        document.documentElement.style.setProperty('--gray-200', '#1e293b');
        document.documentElement.style.setProperty('--gray-300', '#334155');
        document.documentElement.style.setProperty('--gray-400', '#475569');
        document.documentElement.style.setProperty('--gray-500', '#64748b');
        document.documentElement.style.setProperty('--gray-600', '#94a3b8');

        // Sidebar mantiene oscuro para contraste
        document.documentElement.style.setProperty('--sidebar-bg', '#1e293b');

    } else {
        // Restaurar tema oscuro por defecto
        // Fondos
        document.documentElement.style.setProperty('--dark-bg', '#0f172a');
        document.documentElement.style.setProperty('--dark-surface', '#1e293b');
        document.documentElement.style.setProperty('--dark-surface-hover', '#334155');
        document.documentElement.style.setProperty('--dark-border', '#334155');

        // Textos
        document.documentElement.style.setProperty('--gray-100', '#f1f5f9');
        document.documentElement.style.setProperty('--gray-200', '#e2e8f0');
        document.documentElement.style.setProperty('--gray-300', '#cbd5e1');
        document.documentElement.style.setProperty('--gray-400', '#94a3b8');
        document.documentElement.style.setProperty('--gray-500', '#64748b');
        document.documentElement.style.setProperty('--gray-600', '#475569');

        // Sidebar en tema oscuro
        document.documentElement.style.setProperty('--sidebar-bg', '#1e293b');
    }
}

// ===== Actualizar Nombre de Empresa =====
function updateCompanyNameDisplay(name) {
    const sidebarTitle = document.querySelector('.logo-container-small span');
    if (sidebarTitle && name) {
        sidebarTitle.textContent = name;
    }

    // También actualizar el título de la página
    if (name) {
        document.title = `Sistema de Inventario - ${name}`;
    }
}

// ===== Exportar Datos =====
function exportSystemData() {
    const data = {
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        settings: StorageManager.get('appSettings', {}),
        products: StorageManager.get('products', []),
        movements: StorageManager.get('movements', []),
        suppliers: StorageManager.get('suppliers', []),
        supplierPrices: StorageManager.get('supplierPrices', {}),
        users: StorageManager.get('users', [])
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Datos exportados correctamente', 'success');
}

// ===== Importar Datos =====
function importSystemData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);

            // Validar estructura básica
            if (!data.version || !data.exportDate) {
                showNotification('Archivo de respaldo inválido', 'error');
                return;
            }

            // Confirmar importación
            if (confirm('¿Está seguro que desea importar estos datos? Los datos actuales serán reemplazados.')) {
                // Importar datos
                if (data.settings) StorageManager.set('appSettings', data.settings);
                if (data.products) StorageManager.set('products', data.products);
                if (data.movements) StorageManager.set('movements', data.movements);
                if (data.suppliers) StorageManager.set('suppliers', data.suppliers);
                if (data.supplierPrices) StorageManager.set('supplierPrices', data.supplierPrices);
                if (data.users) StorageManager.set('users', data.users);

                showNotification('Datos importados correctamente. Recargando...', 'success');

                setTimeout(() => {
                    location.reload();
                }, 1500);
            }
        } catch (error) {
            showNotification('Error al leer el archivo: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);

    // Limpiar input para permitir reimportar el mismo archivo
    event.target.value = '';
}

// ===== Utilidades =====
function hexToHSL(hex) {
    // Convertir hex a RGB
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

// ===== Inicializar Eventos del Módulo =====
function initSettingsModule() {
    // Evento para selector de color - aplicar en tiempo real
    const colorPicker = document.getElementById('primaryColor');
    if (colorPicker) {
        colorPicker.addEventListener('input', (e) => {
            const color = e.target.value;
            document.getElementById('primaryColorValue').textContent = color;
            applyPrimaryColor(color); // Aplicar en tiempo real
        });
    }

    // Eventos para selector de tema - aplicar en tiempo real
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Evitar que se propague al header colapsable

            // Actualizar estado visual
            document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Aplicar tema en tiempo real
            const theme = btn.dataset.theme;
            applyTheme(theme);
        });
    });

    // Cargar ajustes al abrir la vista
    loadSettings();
}

// ===== Toggle de Secciones Colapsables =====
function toggleSettingsSection(headerElement) {
    const section = headerElement.closest('.settings-section');
    if (section && section.classList.contains('collapsible')) {
        section.classList.toggle('expanded');
    }
}

// ===== Funciones para sección Apariencia (eventos inline) =====
function updateColorPreview(color) {
    document.getElementById('primaryColorValue').textContent = color;
}

function selectTheme(theme, btnElement) {
    // Actualizar estado visual de los botones
    document.querySelectorAll('.theme-option').forEach(b => b.classList.remove('active'));
    if (btnElement) {
        btnElement.classList.add('active');
    }
}

function applyAppearanceSettings() {
    // Obtener valores actuales
    const color = document.getElementById('primaryColor').value;
    const themeBtn = document.querySelector('.theme-option.active');
    const theme = themeBtn ? themeBtn.dataset.theme : 'dark';

    // Aplicar color
    applyPrimaryColor(color);

    // Aplicar tema
    applyTheme(theme);

    // Guardar en settings
    const currentSettings = StorageManager.get('appSettings', getDefaultSettings());
    currentSettings.primaryColor = color;
    currentSettings.theme = theme;
    StorageManager.set('appSettings', currentSettings);

    showNotification('Apariencia aplicada correctamente', 'success');
}

// Exportar funciones globales
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.exportSystemData = exportSystemData;
window.importSystemData = importSystemData;
window.initSettingsModule = initSettingsModule;
window.toggleSettingsSection = toggleSettingsSection;
window.updateColorPreview = updateColorPreview;
window.selectTheme = selectTheme;
window.applyAppearanceSettings = applyAppearanceSettings;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Cargar ajustes guardados
    const settings = StorageManager.get('appSettings');
    if (settings) {
        applyPrimaryColor(settings.primaryColor || '#3b82f6');
        applyTheme(settings.theme || 'dark');
        updateCompanyNameDisplay(settings.companyName);
    }
});
