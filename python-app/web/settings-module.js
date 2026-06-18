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

    const allowNegativeStock = document.getElementById('settingsAllowNegativeStock');
    if (allowNegativeStock) {
        allowNegativeStock.checked = settings.allowNegativeStock === true;
    }

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

    // Cargar ajustes de tickets
    const ticketHeader = document.getElementById('settingsTicketHeader');
    if (ticketHeader) {
        ticketHeader.value = settings.ticketHeader || '';
        document.getElementById('settingsTicketFooter').value = settings.ticketFooter || '';
        document.getElementById('settingsTicketWidth').value = settings.ticketWidth || '80';
        document.getElementById('settingsTicketFont').value = settings.ticketFont || 'normal';
        document.getElementById('settingsTicketShowLogo').checked = settings.ticketShowLogo !== false;
        document.getElementById('settingsTicketShowRFC').checked = settings.ticketShowRFC !== false;

        // Inicializar preview si existe la función
        if (typeof updateTicketPreview === 'function') {
            updateTicketPreview();
        }
    }
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
        minProfitMargin: 15,
        allowNegativeStock: false
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
        minProfitMargin: parseInt(document.getElementById('minProfitMargin').value) || 15,
        allowNegativeStock: document.getElementById('settingsAllowNegativeStock')?.checked || false
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
        // === MODO CLARO - Diseño profesional con buen contraste ===

        // Fondos - menos brillantes, más suaves
        document.documentElement.style.setProperty('--dark-bg', '#e2e8f0');
        document.documentElement.style.setProperty('--dark-surface', '#f8fafc');
        document.documentElement.style.setProperty('--dark-surface-hover', '#f1f5f9');
        document.documentElement.style.setProperty('--dark-border', '#cbd5e1');

        // Textos - MUY oscuros para excelente contraste
        document.documentElement.style.setProperty('--gray-100', '#0f172a');
        document.documentElement.style.setProperty('--gray-200', '#1e293b');
        document.documentElement.style.setProperty('--gray-300', '#334155');
        document.documentElement.style.setProperty('--gray-400', '#475569');
        document.documentElement.style.setProperty('--gray-500', '#64748b');
        document.documentElement.style.setProperty('--gray-600', '#94a3b8');

        // Sidebar - mantenerlo oscuro para contraste profesional
        document.documentElement.style.setProperty('--sidebar-bg', '#1e293b');

        // Colores de estado ajustados para fondo claro
        document.documentElement.style.setProperty('--success-500', '#16a34a');
        document.documentElement.style.setProperty('--success-400', '#22c55e');
        document.documentElement.style.setProperty('--danger-500', '#dc2626');
        document.documentElement.style.setProperty('--danger-400', '#ef4444');
        document.documentElement.style.setProperty('--warning-500', '#d97706');
        document.documentElement.style.setProperty('--warning-400', '#f59e0b');

        // Sombras para modo claro
        document.documentElement.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.08)');
        document.documentElement.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.1)');
        document.documentElement.style.setProperty('--shadow-lg', '0 10px 15px rgba(0, 0, 0, 0.15)');

        // Inputs y formularios
        document.documentElement.style.setProperty('--input-bg', '#ffffff');
        document.documentElement.style.setProperty('--input-border', '#94a3b8');
        document.documentElement.style.setProperty('--input-focus-border', 'var(--primary-500)');

        // Badges y tags
        document.documentElement.style.setProperty('--badge-bg', '#e2e8f0');
        document.documentElement.style.setProperty('--badge-text', '#1e293b');

    } else {
        // === MODO OSCURO - Restaurar valores por defecto ===

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

        // Sidebar
        document.documentElement.style.setProperty('--sidebar-bg', '#1e293b');

        // Colores de estado
        document.documentElement.style.setProperty('--success-500', '#22c55e');
        document.documentElement.style.setProperty('--success-400', '#4ade80');
        document.documentElement.style.setProperty('--danger-500', '#ef4444');
        document.documentElement.style.setProperty('--danger-400', '#f87171');
        document.documentElement.style.setProperty('--warning-500', '#f59e0b');
        document.documentElement.style.setProperty('--warning-400', '#fbbf24');

        // Sombras
        document.documentElement.style.setProperty('--shadow-sm', '0 1px 2px rgba(0, 0, 0, 0.3)');
        document.documentElement.style.setProperty('--shadow-md', '0 4px 6px rgba(0, 0, 0, 0.4)');
        document.documentElement.style.setProperty('--shadow-lg', '0 10px 15px rgba(0, 0, 0, 0.5)');

        // Inputs
        document.documentElement.style.setProperty('--input-bg', 'var(--dark-bg)');
        document.documentElement.style.setProperty('--input-border', 'var(--dark-border)');
        document.documentElement.style.setProperty('--input-focus-border', 'var(--primary-500)');

        // Badges
        document.documentElement.style.setProperty('--badge-bg', 'rgba(255, 255, 255, 0.1)');
        document.documentElement.style.setProperty('--badge-text', 'var(--gray-300)');
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

// ===== Exportar Productos a CSV =====
async function exportProductsCSV() {
    showNotification('Generando archivo de exportación...', 'info');

    let products = [];

    // Intentar cargar TODOS los productos desde el backend
    if (window.eel && window.eel.get_products) {
        try {
            const response = await window.eel.get_products()();
            if (response && response.success && Array.isArray(response.data)) {
                products = response.data;
                console.log(`Exportando ${products.length} productos desde backend.`);
            } else {
                console.warn('Respuesta inválida de backend, usando caché local.');
                products = StorageManager.get('products', []);
            }
        } catch (e) {
            console.error('Error al obtener productos de backend:', e);
            products = StorageManager.get('products', []);
        }
    } else {
        products = StorageManager.get('products', []);
    }

    if (!products || products.length === 0) {
        showNotification('No hay productos para exportar', 'warning');
        return;
    }

    // Headers
    const headers = ['Código', 'Nombre', 'Descripción', 'Costo Compra', 'Precio Venta', 'Stock', 'Mínimo', 'Categoría', 'Proveedor'];

    // Contenido
    const rows = products.map(p => [
        p.code,
        p.name,
        p.description || '',
        p.purchase_cost || p.cost || 0,
        p.publicPrice || p.public_price || p.price || 0, // Manejo robusto de nombres de propiedades
        p.stock || 0,
        p.minStock || p.min_stock || 5,
        p.category || '',
        p.supplier || ''
    ]);

    // Convertir a CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    // Agregar BOM para Excel
    csvContent += '\uFEFF';

    csvContent += headers.join(",") + "\r\n";

    rows.forEach(row => {
        const processedRow = row.map(cell => {
            if (cell === null || cell === undefined) return '';
            const cellStr = String(cell);
            // Escapar comillas y envolver en comillas si tiene comas o saltos de línea
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
        });
        csvContent += processedRow.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventario_completo_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification(`Inventario exportado correctamente (${products.length} productos)`, 'success');
}

// ===== Importar Productos desde CSV =====
async function importProductsCSV(input) {
    const file = input.files[0];
    if (!file) return;

    showNotification('Leyendo archivo...', 'info');

    // Cargar productos existentes para comparar códigos
    let existingProducts = [];
    if (window.eel && window.eel.get_products) {
        existingProducts = await window.eel.get_products()();
    } else {
        existingProducts = StorageManager.get('products', []);
    }

    const productMap = new Map();
    existingProducts.forEach(p => productMap.set(p.code, p.id));

    const reader = new FileReader();
    reader.onload = async function (e) {
        const text = e.target.result;
        const lines = text.split('\n');

        let updated = 0;
        let created = 0;

        showNotification('Procesando productos...', 'info');

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // CSV Parser básico (regex para manejar comillas)
            let row = [];
            const matches = line.match(/(?:^|,)("(?:[^"]|"")*"|[^,]*)/g);
            if (matches) {
                row = matches.map(field => {
                    // Remover coma inicial si existe (por el regex match)
                    let val = field.startsWith(',') ? field.substring(1) : field;
                    // Remover comillas
                    val = val.trim();
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.substring(1, val.length - 1).replace(/""/g, '"');
                    }
                    return val;
                });
            } else {
                row = line.split(',');
            }

            if (row.length < 2) continue;

            const code = row[0];
            const name = row[1];

            if (!code || !name) continue;

            const product = {
                code: code,
                name: name,
                description: row[2] || '',
                purchase_cost: parseFloat(row[3]) || 0,
                publicPrice: parseFloat(row[4]) || 0,
                stock: parseInt(row[5]) || 0,
                minStock: parseInt(row[6]) || 5,
                category: row[7] || 'General',
                supplier: row[8] || ''
            };

            if (productMap.has(code)) {
                product.id = productMap.get(code); // Update
                updated++;
            } else {
                created++;
            }

            if (window.eel && window.eel.save_product) {
                await window.eel.save_product(product)();
            } else {
                // Modo offline / fallback
                const current = StorageManager.get('products', []);
                if (product.id) {
                    const idx = current.findIndex(p => p.id === product.id);
                    if (idx >= 0) current[idx] = product;
                } else {
                    product.id = Date.now() + i;
                    current.push(product);
                }
                StorageManager.set('products', current);
            }
        }

        showNotification(`Importación: ${created} nuevos, ${updated} actualizados.`, 'success');
        setTimeout(() => location.reload(), 1500);
    };
    reader.readAsText(file);
    input.value = '';
}

// ===== Configuración de Tickets =====
function saveTicketSettings() {
    const settings = StorageManager.get('appSettings', getDefaultSettings());

    settings.ticketHeader = document.getElementById('settingsTicketHeader').value;
    settings.ticketFooter = document.getElementById('settingsTicketFooter').value;
    settings.ticketWidth = document.getElementById('settingsTicketWidth').value;
    settings.ticketFont = document.getElementById('settingsTicketFont').value;
    settings.ticketShowLogo = document.getElementById('settingsTicketShowLogo').checked;
    settings.ticketShowRFC = document.getElementById('settingsTicketShowRFC').checked;

    StorageManager.set('appSettings', settings);
    showNotification('Configuración de tickets guardada', 'success');
}

function updateTicketPreview() {
    const container = document.getElementById('settingsTicketPreview');
    if (!container) return;

    // Obtener valores en tiempo real
    const header = document.getElementById('settingsTicketHeader').value;
    const footer = document.getElementById('settingsTicketFooter').value;
    const showLogo = document.getElementById('settingsTicketShowLogo').checked;
    const showRFC = document.getElementById('settingsTicketShowRFC').checked;
    const width = document.getElementById('settingsTicketWidth').value;
    const font = document.getElementById('settingsTicketFont').value;

    // Obtener datos empresa
    const companyName = document.getElementById('companyName').value || 'Nombre Empresa';
    const companyAddress = document.getElementById('companyAddress').value || '';

    // Simular apariencia
    let fontSize = '12px';
    if (font === 'small') fontSize = '10px';
    if (font === 'large') fontSize = '14px';

    container.style.fontSize = fontSize;
    container.style.lineHeight = '1.4';

    // Generar Preview
    let html = '';

    html += '<div class="ticket-preview-header">';
    if (showLogo) {
        html += '<div style="margin-bottom:5px; font-weight:bold; font-size: 1.2em;">📦 LOGO</div>';
    }
    html += `<h3 style="margin:5px 0;">${companyName}</h3>`;
    html += '</div>';

    if (companyAddress) {
        html += `<div class="ticket-preview-address">${companyAddress}</div>`;
    }

    if (header) {
        html += `<div class="ticket-preview-custom-header">${header.replace(/\n/g, '<br>')}</div>`;
    }

    if (showRFC) {
        html += `<div style="text-align:center; margin-bottom:5px;">RFC: GEN010101ABC</div>`;
    }

    // Body simulado
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    html += `<div class="ticket-preview-body">
        <div style="text-align:center; margin-bottom:5px;">Folio: 001 - ${now}</div>
        <div style="display:flex; justify-content:space-between; border-bottom:1px dotted #ccc; margin-bottom:5px;">
            <span>Cant. Desc</span>
            <span>Imp</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span>1 x Producto A</span>
            <span>$150.00</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
            <span>2 x Producto B</span>
            <span>$100.00</span>
        </div>
        <br>
        <div style="display:flex; justify-content:space-between; font-weight:bold; border-top:1px solid #000; padding-top:5px;">
            <span>TOTAL</span>
            <span>$350.00</span>
        </div>
    </div>`;

    if (footer) {
        html += `<div class="ticket-preview-footer">${footer.replace(/\n/g, '<br>')}</div>`;
    }

    container.innerHTML = html;
}

// Exportar funciones globales
window.saveTicketSettings = saveTicketSettings;
window.updateTicketPreview = updateTicketPreview;
window.saveSettings = saveSettings;
window.loadSettings = loadSettings;
window.exportSystemData = exportSystemData;
window.exportProductsCSV = exportProductsCSV;
window.importProductsCSV = importProductsCSV; // Exportar nueva función
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
