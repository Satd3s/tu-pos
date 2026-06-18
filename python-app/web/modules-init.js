// =============================================================================
// FUNCIONES DE INICIALIZACIÓN DE MÓDULOS
// Para el sistema de pestañas
// =============================================================================

// ===== Dashboard =====
function initDashboard() {
    console.log('Inicializando Dashboard...');
    loadCompanyInfoToDashboard();
    loadDashboardStats();
}

// Cargar información de la empresa en el dashboard
function loadCompanyInfoToDashboard() {
    const settings = StorageManager.get('appSettings') || {};
    const companyName = settings.companyName || 'Mi Empresa';
    const companyLogo = settings.companyLogo || null;

    // Actualizar título de la ventana
    document.title = companyName + ' - Sistema POS';

    // Buscar elementos en la vista activa
    const activeView = document.querySelector('.tab-view[data-module="dashboard"].active');

    // Actualizar nombre de la empresa
    const nameEl = activeView?.querySelector('#welcomeCompanyName') || document.getElementById('welcomeCompanyName');
    if (nameEl) {
        nameEl.textContent = companyName;
    }

    // Actualizar logo
    const logoEl = activeView?.querySelector('#welcomeLogo') || document.getElementById('welcomeLogo');
    if (logoEl) {
        if (companyLogo) {
            logoEl.innerHTML = '<img src="' + companyLogo + '" alt="Logo">';
        } else {
            logoEl.innerHTML = '<span class="logo-emoji">🏪</span>';
        }
    }

    // Actualizar fecha
    const dateEl = activeView?.querySelector('#dashDate') || document.getElementById('dashDate');
    if (dateEl) {
        const now = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = now.toLocaleDateString('es-MX', options);
    }
}

async function loadDashboardStats() {
    try {
        // Si tenemos Eel disponible
        if (typeof eel !== 'undefined') {
            const result = await eel.get_dashboard_stats()();
            if (result.success) {
                updateDashboardUI(result.data);
            }
        } else {
            // Modo demo/offline
            updateDashboardUI({
                total_products: 150,
                inventory_value: 125000,
                today_sales_total: 3500,
                today_sales_count: 12,
                low_stock_count: 8
            });
        }
    } catch (e) {
        console.error('Error cargando dashboard:', e);
    }
}

function updateDashboardUI(stats) {
    // Buscar dentro de la vista activa del dashboard
    const activeView = document.querySelector('.tab-view[data-module="dashboard"].active');

    const setTextContent = (id, value) => {
        let el = null;
        if (activeView) {
            el = activeView.querySelector(`#${id}`);
        }
        if (!el) {
            el = document.getElementById(id);
        }
        if (el) el.textContent = value;
    };

    const setHTML = (id, html) => {
        let el = null;
        if (activeView) {
            el = activeView.querySelector(`#${id}`);
        }
        if (!el) {
            el = document.getElementById(id);
        }
        if (el) el.innerHTML = html;
    };

    // Fecha actual
    const today = new Date();
    const dateStr = today.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    setTextContent('dashDate', dateStr.charAt(0).toUpperCase() + dateStr.slice(1));

    // Estadísticas principales
    setTextContent('dashTotalProducts', stats.total_products || 0);
    setTextContent('dashTodaySales', `$${(stats.today_sales_total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);
    setTextContent('dashTodaySalesCount', `${stats.today_sales_count || 0} tickets`);
    setTextContent('dashLowStock', stats.low_stock_count || 0);

    // Utilidad del día (estimada con margen promedio del 30% si no hay dato)
    const profit = stats.today_profit || (stats.today_sales_total * 0.25) || 0;
    setTextContent('dashTodayProfit', `$${profit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`);

    // Calcular margen
    const margin = stats.today_sales_total > 0
        ? ((profit / stats.today_sales_total) * 100).toFixed(0)
        : 0;
    setTextContent('dashProfitPercent', `${margin}% margen`);

    // Top Vendidos
    if (stats.top_selling && stats.top_selling.length > 0) {
        let topHTML = '<div class="dash-product-list">';
        stats.top_selling.slice(0, 5).forEach((item, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '•';
            topHTML += `
                <div class="dash-product-item">
                    <span class="dash-product-name">${medal} ${item.name}</span>
                    <span class="dash-product-qty">${item.quantity} vendidos</span>
                </div>
            `;
        });
        topHTML += '</div>';
        setHTML('dashTopSelling', topHTML);
    } else {
        setHTML('dashTopSelling', '<div class="empty-state-small"><span>Sin ventas hoy</span></div>');
    }

    // Alertas
    let alertsHTML = '';
    const lowStock = stats.low_stock_count || 0;
    const creditPending = stats.credit_pending || 0;

    if (lowStock > 0) {
        alertsHTML += `
            <div class="dash-alert-item">
                <span class="dash-alert-icon">⚠️</span>
                <span class="dash-alert-text">${lowStock} productos con stock bajo</span>
            </div>
        `;
    }

    if (creditPending > 0) {
        alertsHTML += `
            <div class="dash-alert-item info">
                <span class="dash-alert-icon">💳</span>
                <span class="dash-alert-text">$${creditPending.toLocaleString('es-MX')} en créditos pendientes</span>
            </div>
        `;
    }

    if (stats.out_of_stock && stats.out_of_stock > 0) {
        alertsHTML += `
            <div class="dash-alert-item danger">
                <span class="dash-alert-icon">🚫</span>
                <span class="dash-alert-text">${stats.out_of_stock} productos agotados</span>
            </div>
        `;
    }

    if (!alertsHTML) {
        alertsHTML = '<div class="empty-state-small"><span>✅ Todo en orden</span></div>';
    }

    setHTML('dashAlerts', alertsHTML);

    console.log('Dashboard actualizado:', stats);
}

// ===== Productos =====
function initProductsModule() {
    console.log('Inicializando Productos (Modo Buscador)...');

    // Configurar listener de búsqueda
    const setupSearch = () => {
        // Buscar en la vista activa o globalmente
        const searchInput = document.getElementById('productGlobalSearch');
        if (searchInput) {
            searchInput.focus();
            searchInput.removeEventListener('input', handleProductSearch);
            searchInput.addEventListener('input', handleProductSearch);
            console.log('Buscador de productos configurado');
        } else {
            console.log("Esperando renderizado de vista productos...");
            setTimeout(setupSearch, 500);
        }
    };

    setTimeout(setupSearch, 300);

    // Cargar productos en memoria
    loadProducts(false);
}

function handleProductSearch(e) {
    const term = e.target.value.toLowerCase().trim();
    const container = document.getElementById('productSearchResults');
    if (!container) return;

    if (term.length < 1) {
        container.innerHTML = `
            <div class="empty-search-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 64px; height: 64px; color: #ccc;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p>Empieza a escribir para buscar</p>
            </div>`;
        return;
    }

    // Búsqueda multi-término
    const terms = term.split(' ').filter(t => t.length > 0);

    const filtered = allProducts.filter(p => {
        const searchableText = `${p.getCode || p.code} ${p.name} ${p.part_number || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
        return terms.every(t => searchableText.includes(t));
    });

    renderProductCards(filtered.slice(0, 50));
}

function renderProductCards(products) {
    const container = document.getElementById('productSearchResults');
    if (!container) return;

    if (products.length === 0) {
        container.innerHTML = `<div class="empty-search-state"><p>No se encontraron productos coincidentes</p></div>`;
        return;
    }

    container.innerHTML = products.map(p => `
        <div class="product-card" onclick="editProduct(${p.id})">
            <div class="product-card-header">
                <span class="product-card-code">${p.code || 'S/N'}</span>
                ${p.brand ? `<span class="product-card-brand">${p.brand}</span>` : ''}
            </div>
            <div class="product-card-title">${p.name}</div>
            <div class="product-card-meta">
               ${p.category || 'Gral'} ${p.part_number ? '• ' + p.part_number : ''}
            </div>
            <div class="product-card-footer">
                <div class="product-price">$${(p.public_price || 0).toFixed(2)}</div>
                <div class="product-stock ${p.stock <= (p.min_stock || 5) ? 'low' : 'good'}">
                    Existencia: ${p.stock}
                </div>
            </div>
        </div>
    `).join('');
}

async function loadProducts(render = false) {
    try {
        let products = [];
        if (typeof eel !== 'undefined') {
            const result = await eel.get_products()();
            if (result.success) {
                products = result.data;
            } else {
                products = getDemoProducts();
            }
        } else {
            products = getDemoProducts();
        }

        allProducts = products;
        console.log('Productos cargados en memoria:', products.length);

        if (render) {
            const searchInput = document.getElementById('productGlobalSearch');
            if (searchInput && searchInput.value) {
                handleProductSearch({ target: { value: searchInput.value } });
            }
        }
    } catch (e) {
        console.error('Error cargando productos:', e);
        allProducts = getDemoProducts();
    }
}

function getDemoProducts() {
    return [
        { id: 1, code: 'ACE-001', name: 'Aceite Motor 5W-30', category: 'Lubricantes', stock: 25, public_price: 189.99 },
        { id: 2, code: 'FIL-002', name: 'Filtro de Aire Universal', category: 'Filtros', stock: 15, public_price: 85.50 },
        { id: 3, code: 'BAT-003', name: 'Batería 12V 60Ah', category: 'Eléctrico', stock: 5, public_price: 1250.00 },
        { id: 4, code: 'BUJ-004', name: 'Bujía NGK Platino', category: 'Encendido', stock: 50, public_price: 45.00 },
        { id: 5, code: 'AMO-005', name: 'Amortiguador Monroe', category: 'Suspensión', stock: 8, public_price: 850.00 }
    ];
}

function renderProductsTable(products) {
    // Buscar el tbody de múltiples formas
    let tbody = null;

    // 1. Buscar en vista activa de productos
    const activeView = document.querySelector('.tab-view[data-module="products"].active');
    if (activeView) {
        tbody = activeView.querySelector('tbody');
        console.log('Tbody encontrado en vista activa');
    }

    // 2. Buscar en cualquier vista de productos
    if (!tbody) {
        const anyProductView = document.querySelector('.tab-view[data-module="products"]');
        if (anyProductView) {
            tbody = anyProductView.querySelector('tbody');
            console.log('Tbody encontrado en vista de productos');
        }
    }

    // 3. Fallback: buscar por ID
    if (!tbody) {
        tbody = document.getElementById('productsTableBody');
        if (tbody) console.log('Tbody encontrado por ID');
    }

    if (!tbody) {
        console.warn('productsTableBody no encontrado - reintentando en 200ms');
        setTimeout(() => renderProductsTable(products), 200);
        return;
    }

    if (products.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    No hay productos registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = products.map(p => `
        <tr>
            <td><code>${p.code}</code></td>
            <td>${p.name}</td>
            <td>${p.category || '-'}</td>
            <td>
                <span class="stock-badge ${p.stock <= 5 ? 'low' : p.stock <= 10 ? 'medium' : 'high'}">
                    ${p.stock}
                </span>
            </td>
            <td>$${(p.public_price || 0).toFixed(2)}</td>
            <td>
                <button class="btn-icon" onclick="editProduct(${p.id})" title="Editar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');

    console.log(`Productos renderizados: ${products.length}`);
}

function filterProducts(query) {
    // TODO: Implementar filtro
    console.log('Filtrar:', query);
}

// ===== Departamentos (Pestañas de Productos) =====
function showProductsTab(tabName) {
    // Buscar vista activa de productos
    const activeView = document.querySelector('.tab-view[data-module="products"].active');
    if (!activeView) return;

    // Ocultar todas las pestañas
    activeView.querySelectorAll('.products-tab').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });

    // Quitar active de todos los botones
    activeView.querySelectorAll('.products-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar pestaña seleccionada
    const tab = activeView.querySelector(`#productsTab-${tabName}`);
    if (tab) {
        tab.classList.add('active');
        tab.style.display = 'block';
    }

    // Activar botón correspondiente
    event.target.closest('.products-nav-btn')?.classList.add('active');

    // Cargar datos si es departamentos
    if (tabName === 'departamentos') {
        loadDepartments();
    }
}

async function loadDepartments() {
    try {
        let categories = [];

        if (typeof eel !== 'undefined') {
            const result = await eel.get_categories()();
            if (result.success) {
                categories = result.data;
            }
        }

        // Si no hay categorías, usar las predeterminadas
        if (categories.length === 0) {
            categories = [
                { name: 'Abarrotes', color: '#3b82f6', icon: '🛒', count: 0 },
                { name: 'Bebidas', color: '#10b981', icon: '🥤', count: 0 },
                { name: 'Lácteos', color: '#f59e0b', icon: '🥛', count: 0 },
                { name: 'Carnes Frías', color: '#ef4444', icon: '🥓', count: 0 },
                { name: 'Botanas', color: '#8b5cf6', icon: '🍿', count: 0 },
                { name: 'Dulces', color: '#ec4899', icon: '🍬', count: 0 },
                { name: 'Limpieza', color: '#06b6d4', icon: '🧹', count: 0 },
                { name: 'Higiene Personal', color: '#84cc16', icon: '🧴', count: 0 }
            ];
        }

        renderDepartmentsGrid(categories);
    } catch (e) {
        console.error('Error cargando departamentos:', e);
    }
}

function renderDepartmentsGrid(departments) {
    const activeView = document.querySelector('.tab-view[data-module="products"].active');
    const grid = activeView?.querySelector('#departmentsGrid');

    if (!grid) {
        console.warn('departmentsGrid no encontrado');
        return;
    }

    if (departments.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--gray-500);">
                <p>No hay departamentos registrados</p>
                <button class="btn btn-primary" onclick="openDepartmentModal()" style="margin-top: 15px;">
                    Crear primer departamento
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = departments.map((dept, index) => {
        const color = dept.color || getRandomColor(index);
        const icon = dept.icon || '📦';
        const count = dept.count || 0;

        return `
            <div class="department-card">
                <div class="department-card-header">
                    <div class="department-icon" style="background: ${color}20; color: ${color};">
                        ${icon}
                    </div>
                    <div class="department-actions">
                        <button class="btn btn-ghost btn-sm" onclick="editDepartment('${dept.name}')">✏️</button>
                        <button class="btn btn-ghost btn-sm" onclick="deleteDepartment('${dept.name}')">🗑️</button>
                    </div>
                </div>
                <div class="department-name">${dept.name}</div>
                <div class="department-count">${count} productos</div>
            </div>
        `;
    }).join('');
}

function getRandomColor(index) {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    return colors[index % colors.length];
}

function openDepartmentModal(existingName = null) {
    let modal = document.getElementById('departmentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'departmentModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const icons = ['🛒', '🥤', '🥛', '🥓', '🍿', '🍬', '🧹', '🧴', '🍞', '🥫', '🧀', '🍎', '🥬', '🧊', '📦', '🔧'];
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h3>${existingName ? 'Editar' : 'Nuevo'} Departamento</h3>
                <button class="modal-close" onclick="closeModal('departmentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Nombre del Departamento *</label>
                    <input type="text" id="deptName" class="form-input" value="${existingName || ''}" placeholder="Ej: Bebidas, Lácteos, Carnes...">
                </div>
                <div class="form-group">
                    <label>Icono</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${icons.map(icon => `
                            <button type="button" class="icon-picker-btn" onclick="selectDeptIcon(this, '${icon}')" 
                                style="width: 40px; height: 40px; font-size: 1.3rem; border: 2px solid var(--dark-border); border-radius: 8px; background: var(--dark-surface); cursor: pointer;">
                                ${icon}
                            </button>
                        `).join('')}
                    </div>
                    <input type="hidden" id="deptIcon" value="📦">
                </div>
                <div class="form-group">
                    <label>Color</label>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;">
                        ${colors.map(color => `
                            <button type="button" class="color-picker-btn" onclick="selectDeptColor(this, '${color}')"
                                style="width: 35px; height: 35px; background: ${color}; border: 3px solid transparent; border-radius: 8px; cursor: pointer;">
                            </button>
                        `).join('')}
                    </div>
                    <input type="hidden" id="deptColor" value="#3b82f6">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('departmentModal')">Cancelar</button>
                <button class="btn btn-primary" onclick="saveDepartment('${existingName || ''}')">Guardar</button>
            </div>
        </div>
    `;

    openModal('departmentModal');
}

function selectDeptIcon(btn, icon) {
    document.querySelectorAll('.icon-picker-btn').forEach(b => b.style.borderColor = 'var(--dark-border)');
    btn.style.borderColor = 'var(--primary-500)';
    document.getElementById('deptIcon').value = icon;
}

function selectDeptColor(btn, color) {
    document.querySelectorAll('.color-picker-btn').forEach(b => b.style.borderColor = 'transparent');
    btn.style.borderColor = 'white';
    document.getElementById('deptColor').value = color;
}

async function saveDepartment(existingName) {
    const name = document.getElementById('deptName')?.value?.trim();
    const icon = document.getElementById('deptIcon')?.value || '📦';
    const color = document.getElementById('deptColor')?.value || '#3b82f6';

    if (!name) {
        showNotification('Ingresa el nombre del departamento', 'error');
        return;
    }

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.save_category({ name, icon, color, old_name: existingName || null })();
            if (result.success) {
                showNotification('Departamento guardado', 'success');
                closeModal('departmentModal');
                loadDepartments();
            } else {
                showNotification(result.error || 'Error al guardar', 'error');
            }
        } else {
            showNotification('Departamento guardado (demo)', 'success');
            closeModal('departmentModal');
        }
    } catch (e) {
        showNotification('Error al guardar departamento', 'error');
    }
}

function editDepartment(name) {
    openDepartmentModal(name);
}

async function deleteDepartment(name) {
    if (!confirm(`¿Eliminar el departamento "${name}"?`)) return;

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.delete_category(name)();
            if (result.success) {
                showNotification('Departamento eliminado', 'success');
                loadDepartments();
            } else {
                showNotification(result.error || 'Error al eliminar', 'error');
            }
        } else {
            showNotification('Departamento eliminado (demo)', 'success');
        }
    } catch (e) {
        showNotification('Error al eliminar', 'error');
    }
}

// ===== Movimientos =====
function initMovementsModule() {
    console.log('Inicializando Movimientos...');
    setTimeout(() => {
        loadPurchases();
    }, 150);
}

async function loadMovements() {
    try {
        let movements = [];

        if (typeof eel !== 'undefined') {
            const result = await eel.get_movements()();
            if (result.success) {
                movements = result.data;
            } else {
                movements = getDemoMovements();
            }
        } else {
            movements = getDemoMovements();
        }

        console.log('Movimientos cargados:', movements.length);
        renderMovementsTable(movements);
    } catch (e) {
        console.error('Error cargando movimientos:', e);
        renderMovementsTable(getDemoMovements());
    }
}

function getDemoMovements() {
    return [
        { id: 1, created_at: new Date().toISOString(), product_name: 'Aceite Motor 5W-30', type: 'entry', quantity: 10, reason: 'Compra a proveedor', user: 'Admin' },
        { id: 2, created_at: new Date().toISOString(), product_name: 'Filtro de Aire Universal', type: 'exit', quantity: 2, reason: 'Venta V000045', user: 'POS' },
        { id: 3, created_at: new Date().toISOString(), product_name: 'Batería 12V 60Ah', type: 'entry', quantity: 5, reason: 'Reposición', user: 'Admin' }
    ];
}

function renderMovementsTable(movements) {
    // Buscar el tbody de múltiples formas
    let tbody = null;

    const activeView = document.querySelector('.tab-view[data-module="movements"].active');
    if (activeView) {
        tbody = activeView.querySelector('tbody');
    }

    if (!tbody) {
        const anyView = document.querySelector('.tab-view[data-module="movements"]');
        if (anyView) {
            tbody = anyView.querySelector('tbody');
        }
    }

    if (!tbody) {
        tbody = document.getElementById('movementsTableBody');
    }

    if (!tbody) {
        console.warn('movementsTableBody no encontrado - reintentando');
        setTimeout(() => renderMovementsTable(movements), 200);
        return;
    }

    if (movements.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    No hay movimientos registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = movements.map(m => {
        const date = new Date(m.created_at).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        const typeClass = m.type === 'entry' ? 'success' : m.type === 'exit' ? 'danger' : 'warning';
        const typeLabel = m.type === 'entry' ? 'Entrada' : m.type === 'exit' ? 'Salida' : 'Ajuste';

        return `
            <tr>
                <td>${date}</td>
                <td>${m.product_name || m.product_code || '-'}</td>
                <td><span class="badge ${typeClass}">${typeLabel}</span></td>
                <td>${m.quantity}</td>
                <td>${m.reason || '-'}</td>
                <td>${m.user || '-'}</td>
            </tr>
        `;
    }).join('');

    console.log(`Movimientos renderizados: ${movements.length}`);
}

// ===== Proveedores =====
function initSuppliersModule() {
    console.log('Inicializando Proveedores...');
    setTimeout(() => {
        loadSuppliers();
    }, 150);
}

// ===== Variables de proveedores =====
if (typeof allSuppliers === 'undefined') {
    var allSuppliers = [];
}

async function loadSuppliers() {
    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.get_suppliers()();
            if (result.success) {
                allSuppliers = result.data;
            } else {
                allSuppliers = getDemoSuppliers();
            }
        } else {
            allSuppliers = getDemoSuppliers();
        }

        renderSuppliersGrid(allSuppliers);
    } catch (e) {
        console.error('Error cargando proveedores:', e);
        allSuppliers = getDemoSuppliers();
        renderSuppliersGrid(allSuppliers);
    }
}

function getDemoSuppliers() {
    return [
        {
            id: 1,
            name: 'AutoPartes del Norte',
            contact: 'Juan Pérez',
            phone: '(81) 1234-5678',
            email: 'ventas@autopartesnorte.com',
            products_count: 45,
            last_purchase: '2024-12-10',
            total_purchases: 125000
        },
        {
            id: 2,
            name: 'Lubricantes Nacionales',
            contact: 'María García',
            phone: '(55) 9876-5432',
            email: 'pedidos@lubnac.com',
            products_count: 12,
            last_purchase: '2024-12-08',
            total_purchases: 45000
        },
        {
            id: 3,
            name: 'Filtros Premium',
            contact: 'Roberto Sánchez',
            phone: '(33) 5555-1234',
            email: 'info@filtrospremium.mx',
            products_count: 28,
            last_purchase: '2024-12-05',
            total_purchases: 78500
        }
    ];
}

function renderSuppliersGrid(suppliers) {
    let container = null;
    const activeView = document.querySelector('.tab-view[data-module="suppliers"].active');
    if (activeView) {
        container = activeView.querySelector('#suppliersGrid');
    }
    if (!container) {
        container = document.getElementById('suppliersGrid');
    }

    if (!container) {
        console.warn('suppliersGrid no encontrado - reintentando');
        setTimeout(() => renderSuppliersGrid(suppliers), 200);
        return;
    }

    if (suppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 64px; height: 64px; color: var(--gray-500); margin-bottom: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <h3 style="color: var(--gray-300); margin-bottom: 10px;">No hay proveedores registrados</h3>
                <p style="color: var(--gray-500); margin-bottom: 20px;">Agrega tu primer proveedor para comenzar</p>
                <button class="btn btn-primary" onclick="openSupplierModal()">+ Nuevo Proveedor</button>
            </div>
        `;
        return;
    }

    container.innerHTML = suppliers.map(s => `
        <div class="supplier-card" onclick="openSupplierDetailModal(${s.id})" style="cursor: pointer;">
            <div class="supplier-card-header">
                <div class="supplier-avatar">${s.name.charAt(0)}</div>
                <div class="supplier-info">
                    <h4>${s.name}</h4>
                    <p>${s.contact || 'Sin contacto'}</p>
                </div>
            </div>
            <div class="supplier-stats">
                <div class="supplier-stat">
                    <span class="stat-value">${s.products_count || 0}</span>
                    <span class="stat-label">Productos</span>
                </div>
                <div class="supplier-stat">
                    <span class="stat-value">$${((s.total_purchases || 0) / 1000).toFixed(0)}K</span>
                    <span class="stat-label">Compras</span>
                </div>
            </div>
            <div class="supplier-card-footer">
                <span class="supplier-phone">${s.phone || '-'}</span>
                <div class="supplier-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editSupplier(${s.id})" title="Editar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="event.stopPropagation(); confirmDeleteSupplier(${s.id}, '${s.name.replace(/'/g, "\\'")}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    console.log(`Proveedores renderizados: ${suppliers.length}`);
}

// Confirmar y eliminar proveedor
async function confirmDeleteSupplier(supplierId, supplierName) {
    if (!confirm(`¿Está seguro que desea eliminar al proveedor "${supplierName}"?`)) return;

    try {
        const result = await eel.delete_supplier(supplierId)();
        if (result && result.success) {
            showNotification('Proveedor eliminado exitosamente', 'success');
            await loadSuppliers();
        } else {
            // Mostrar error claramente
            const errorMsg = result.error || 'Error al eliminar proveedor';
            alert('⚠️ ' + errorMsg);
            showNotification(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar proveedor', 'error');
    }
}

// Modal de detalle de proveedor
function openSupplierDetailModal(supplierId) {
    const supplier = allSuppliers.find(s => s.id == supplierId);
    if (!supplier) {
        showNotification('Proveedor no encontrado', 'error');
        return;
    }

    // Crear modal dinámicamente
    let modal = document.getElementById('supplierDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'supplierDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white;">
                <h3>📦 Detalle del Proveedor</h3>
                <button class="modal-close" onclick="closeModal('supplierDetailModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <!-- Cabecera -->
                <div style="padding: 20px; background: var(--dark-surface); border-bottom: 1px solid var(--dark-border);">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="width: 60px; height: 60px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; font-weight: bold; color: white;">
                            ${supplier.name.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <h2 style="margin: 0; color: var(--gray-100); font-size: 1.3rem;">${supplier.name}</h2>
                            <p style="margin: 5px 0 0; color: var(--gray-400);">${supplier.contact || 'Sin contacto asignado'}</p>
                        </div>
                    </div>
                </div>

                <!-- Información de contacto -->
                <div style="padding: 20px; border-bottom: 1px solid var(--dark-border);">
                    <h4 style="color: var(--gray-300); font-size: 0.85rem; margin-bottom: 15px; text-transform: uppercase;">📇 Contacto</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Teléfono</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.phone || '-'}</p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Email</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.email || '-'}</p>
                        </div>
                        <div style="grid-column: 1/-1;">
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Dirección</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.address || '-'}</p>
                        </div>
                    </div>
                </div>

                <!-- Estadísticas -->
                <div style="padding: 20px; background: var(--dark-surface);">
                    <h4 style="color: var(--gray-300); font-size: 0.85rem; margin-bottom: 15px; text-transform: uppercase;">📊 Estadísticas</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Productos</p>
                            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-400);">${supplier.products_count || 0}</p>
                        </div>
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Total Compras</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--success-400);">$${((supplier.total_purchases || 0) / 1000).toFixed(1)}K</p>
                        </div>
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Última Compra</p>
                            <p style="font-size: 0.9rem; font-weight: bold; color: var(--warning-400);">${supplier.last_purchase || 'N/A'}</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: space-between;">
                <button class="btn btn-ghost btn-danger" onclick="closeModal('supplierDetailModal'); confirmDeleteSupplier(${supplier.id}, '${supplier.name.replace(/'/g, "\\'")}')">
                    🗑️ Eliminar
                </button>
                <div>
                    <button class="btn btn-ghost" onclick="closeModal('supplierDetailModal')">Cerrar</button>
                    <button class="btn btn-primary" onclick="closeModal('supplierDetailModal'); editSupplier(${supplier.id})" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); border: none;">
                        ✏️ Editar
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('supplierDetailModal');
}

function getDemoSupplierProducts(supplierId) {
    // Datos demo de productos comprados a este proveedor
    const products = {
        1: [
            { product: 'Aceite Motor 5W-30', cost: 120.00, date: '10/12/2024', qty: 20 },
            { product: 'Filtro de Aceite', cost: 45.00, date: '10/12/2024', qty: 30 },
            { product: 'Bujía NGK Platino', cost: 28.00, date: '05/12/2024', qty: 100 }
        ],
        2: [
            { product: 'Aceite Transmisión', cost: 180.00, date: '08/12/2024', qty: 15 },
            { product: 'Grasa Multiusos', cost: 35.00, date: '08/12/2024', qty: 50 }
        ],
        3: [
            { product: 'Filtro de Aire', cost: 55.00, date: '05/12/2024', qty: 40 },
            { product: 'Filtro de Cabina', cost: 85.00, date: '05/12/2024', qty: 25 }
        ]
    };
    return products[supplierId] || [];
}

function openSupplierModal(supplierId = null) {
    const modal = document.getElementById('supplierModal');
    const title = document.getElementById('supplierModalTitle');
    const form = document.getElementById('supplierForm');

    // Limpiar formulario
    if (form) form.reset();
    document.getElementById('supplierId').value = '';

    if (supplierId) {
        // Modo edición
        title.textContent = 'Editar Proveedor';
        const supplier = allSuppliers.find(s => s.id == supplierId);
        if (supplier) {
            document.getElementById('supplierId').value = supplier.id;
            document.getElementById('supplierName').value = supplier.name || '';
            document.getElementById('supplierContact').value = supplier.contact || '';
            document.getElementById('supplierPhone').value = supplier.phone || '';
            document.getElementById('supplierEmail').value = supplier.email || '';
            document.getElementById('supplierRFC').value = supplier.rfc || '';
            document.getElementById('supplierAddress').value = supplier.address || '';
            document.getElementById('supplierNotes').value = supplier.notes || '';
        }
    } else {
        // Modo nuevo
        title.textContent = 'Nuevo Proveedor';
    }

    openModal('supplierModal');

    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('supplierName').focus();
    }, 100);
}

async function saveSupplier() {
    const supplierId = document.getElementById('supplierId').value;
    const name = document.getElementById('supplierName').value.trim();

    // Validaciones
    if (!name) {
        showNotification('El nombre es requerido', 'error');
        document.getElementById('supplierName').focus();
        return;
    }

    const supplierData = {
        name: name,
        contact: document.getElementById('supplierContact').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        rfc: document.getElementById('supplierRFC').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        notes: document.getElementById('supplierNotes').value.trim()
    };

    if (supplierId) {
        supplierData.id = parseInt(supplierId);
    }

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.save_supplier(supplierData)();

            if (result.success) {
                showNotification(result.message, 'success');
                closeModal('supplierModal');
                await loadSuppliers();
            } else {
                showNotification('Error: ' + result.error, 'error');
            }
        } else {
            // Modo demo/offline
            if (supplierId) {
                const index = allSuppliers.findIndex(s => s.id == supplierId);
                if (index !== -1) {
                    allSuppliers[index] = { ...allSuppliers[index], ...supplierData };
                }
                showNotification('Proveedor actualizado (modo demo)', 'success');
            } else {
                supplierData.id = Date.now();
                supplierData.products_count = 0;
                supplierData.total_purchases = 0;
                allSuppliers.push(supplierData);
                showNotification('Proveedor agregado (modo demo)', 'success');
            }

            closeModal('supplierModal');
            renderSuppliersGrid(allSuppliers);
        }
    } catch (e) {
        console.error('Error guardando proveedor:', e);
        showNotification('Error al guardar: ' + e.message, 'error');
    }
}

function editSupplier(supplierId) {
    openSupplierModal(supplierId);
}

// ===== Reportes =====
function initReportsModule() {
    console.log('Inicializando Reportes...');
    // Los reportes se generan bajo demanda
}

function generateSalesReport() {
    // Crear modal para seleccionar rango de fechas
    const today = new Date().toISOString().split('T')[0];
    const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    let modal = document.getElementById('salesReportModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'salesReportModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>📊 Reporte de Ventas</h3>
                <button class="modal-close" onclick="closeModal('salesReportModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 15px; color: var(--gray-400);">Selecciona el período para el reporte:</p>
                <div class="form-group">
                    <label>Fecha Inicio</label>
                    <input type="date" id="salesReportStartDate" class="form-input" value="${firstDayOfMonth}">
                </div>
                <div class="form-group">
                    <label>Fecha Fin</label>
                    <input type="date" id="salesReportEndDate" class="form-input" value="${today}">
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('salesReportModal')">Cancelar</button>
                <button class="btn btn-primary" onclick="executeSalesReport()">Generar Reporte</button>
            </div>
        </div>
    `;

    openModal('salesReportModal');
}

async function executeSalesReport() {
    const startDate = document.getElementById('salesReportStartDate')?.value;
    const endDate = document.getElementById('salesReportEndDate')?.value;

    if (!startDate || !endDate) {
        showNotification('Selecciona las fechas', 'error');
        return;
    }

    closeModal('salesReportModal');
    showNotification('Generando reporte de ventas...', 'info');

    const activeView = document.querySelector('.tab-view[data-module="reports"].active');
    const resultsContainer = activeView?.querySelector('#reportResults');

    if (!resultsContainer) {
        showNotification('Error: Contenedor no encontrado', 'error');
        return;
    }

    try {
        let data = null;

        if (typeof eel !== 'undefined') {
            const result = await eel.get_sales_report(startDate, endDate)();
            if (result.success) {
                data = result.data;
            } else {
                showNotification('Error: ' + result.error, 'error');
                return;
            }
        } else {
            data = getDemoSalesData();
        }

        const formatCurrency = (n) => '$' + (n || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        const formatDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

        // Calcular máximo para la barra visual
        const maxDaily = data.daily_sales.length > 0 ? Math.max(...data.daily_sales.map(d => d.daily_total || 0)) : 1;

        let html = `
            <div class="report-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0;">📊 Reporte de Ventas</h3>
                    <p style="margin: 5px 0 0; color: var(--gray-400); font-size: 0.9rem;">
                        Período: ${new Date(startDate + 'T00:00:00').toLocaleDateString('es-MX')} - ${new Date(endDate + 'T00:00:00').toLocaleDateString('es-MX')}
                    </p>
                </div>
                <button class="btn btn-ghost" onclick="hideReportResults()">✕ Cerrar</button>
            </div>
            
            <div class="sales-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Total Ventas</p>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--success-400);">${formatCurrency(data.summary.total_revenue)}</p>
                    <p style="margin: 5px 0 0; font-size: 0.8rem; color: var(--gray-500);">${data.summary.total_sales} transacciones</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">💵 Efectivo</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--gray-100);">${formatCurrency(data.summary.cash_total)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">💳 Tarjeta</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--primary-400);">${formatCurrency(data.summary.card_total)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">📱 Transferencia</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--warning-400);">${formatCurrency(data.summary.transfer_total)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Promedio por Venta</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--gray-100);">${formatCurrency(data.summary.average_sale)}</p>
                </div>
            </div>
            
            ${data.daily_sales.length > 0 ? `
                <div style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); padding: 20px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px; font-size: 1rem;">📈 Ventas por Día</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${data.daily_sales.map(d => {
            const percent = ((d.daily_total || 0) / maxDaily) * 100;
            return `
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <span style="width: 60px; font-size: 0.85rem; color: var(--gray-400);">${formatDate(d.date)}</span>
                                    <div style="flex: 1; height: 24px; background: var(--dark-surface-hover); border-radius: 6px; overflow: hidden;">
                                        <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--primary-500), var(--primary-600)); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                                            <span style="font-size: 0.75rem; font-weight: 600; color: white;">${formatCurrency(d.daily_total)}</span>
                                        </div>
                                    </div>
                                    <span style="width: 30px; font-size: 0.8rem; color: var(--gray-500);">${d.sales_count}</span>
                                </div>
                            `;
        }).join('')}
                    </div>
                </div>
            ` : ''}
            
            ${data.top_products.length > 0 ? `
                <div style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); overflow: hidden;">
                    <h4 style="margin: 0; padding: 15px; border-bottom: 1px solid var(--dark-border); font-size: 1rem;">🏆 Productos Más Vendidos</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--dark-surface-hover);">
                                <th style="padding: 10px 15px; text-align: left; font-size: 0.85rem; color: var(--gray-400);">Código</th>
                                <th style="padding: 10px 15px; text-align: left; font-size: 0.85rem; color: var(--gray-400);">Producto</th>
                                <th style="padding: 10px 15px; text-align: right; font-size: 0.85rem; color: var(--gray-400);">Cantidad</th>
                                <th style="padding: 10px 15px; text-align: right; font-size: 0.85rem; color: var(--gray-400);">Ingresos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.top_products.map((p, i) => `
                                <tr style="border-bottom: 1px solid var(--dark-border);">
                                    <td style="padding: 10px 15px; font-family: monospace; font-size: 0.9rem;">${p.product_code || '-'}</td>
                                    <td style="padding: 10px 15px;">
                                        ${i < 3 ? ['🥇', '🥈', '🥉'][i] : ''} ${p.product_name}
                                    </td>
                                    <td style="padding: 10px 15px; text-align: right; font-weight: 600;">${p.total_quantity}</td>
                                    <td style="padding: 10px 15px; text-align: right; color: var(--success-400); font-weight: 600;">${formatCurrency(p.total_revenue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p style="text-align: center; color: var(--gray-400);">No hay ventas en este período</p>'}
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
        showNotification('Reporte generado', 'success');

    } catch (e) {
        console.error('Error:', e);
        showNotification('Error al generar reporte', 'error');
    }
}

async function generateInventoryReport() {
    showNotification('Generando reporte de inventario...', 'info');

    const activeView = document.querySelector('.tab-view[data-module="reports"].active');
    const resultsContainer = activeView?.querySelector('#reportResults');

    if (!resultsContainer) {
        showNotification('Error: Contenedor no encontrado', 'error');
        return;
    }

    try {
        let data = null;

        if (typeof eel !== 'undefined') {
            const result = await eel.get_inventory_report()();
            if (result.success) {
                data = result.data;
            } else {
                showNotification('Error: ' + result.error, 'error');
                return;
            }
        } else {
            data = getDemoInventoryData();
        }

        const formatCurrency = (n) => '$' + (n || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        const maxCategoryValue = data.by_category.length > 0 ? Math.max(...data.by_category.map(c => c.category_value || 0)) : 1;

        let html = `
            <div class="report-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0;">📦 Reporte de Inventario</h3>
                    <p style="margin: 5px 0 0; color: var(--gray-400); font-size: 0.9rem;">Generado: ${new Date().toLocaleString('es-MX')}</p>
                </div>
                <button class="btn btn-ghost" onclick="hideReportResults()">✕ Cerrar</button>
            </div>
            
            <div class="inventory-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Total Productos</p>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--primary-400);">${data.summary.total_products || 0}</p>
                    <p style="margin: 5px 0 0; font-size: 0.8rem; color: var(--gray-500);">${data.summary.total_units || 0} unidades</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Valor a Costo</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--danger-400);">${formatCurrency(data.summary.total_cost_value)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Valor a Venta</p>
                    <p style="margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--success-400);">${formatCurrency(data.summary.total_sale_value)}</p>
                </div>
                <div class="stat-card" style="background: ${(data.summary.out_of_stock || 0) > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--dark-surface)'}; padding: 15px; border-radius: 12px; border: 1px solid ${(data.summary.out_of_stock || 0) > 0 ? 'var(--danger-500)' : 'var(--dark-border)'};">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">⚠️ Sin Stock</p>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--danger-400);">${data.summary.out_of_stock || 0}</p>
                </div>
                <div class="stat-card" style="background: ${(data.summary.low_stock || 0) > 0 ? 'rgba(234, 179, 8, 0.1)' : 'var(--dark-surface)'}; padding: 15px; border-radius: 12px; border: 1px solid ${(data.summary.low_stock || 0) > 0 ? 'var(--warning-500)' : 'var(--dark-border)'};">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">⚠️ Stock Bajo</p>
                    <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--warning-400);">${data.summary.low_stock || 0}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; margin-bottom: 20px;">
                ${data.by_category.length > 0 ? `
                    <div style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); padding: 20px;">
                        <h4 style="margin: 0 0 15px; font-size: 1rem;">📊 Valor por Categoría</h4>
                        <div style="display: flex; flex-direction: column; gap: 10px;">
                            ${data.by_category.map(c => {
            const percent = ((c.category_value || 0) / maxCategoryValue) * 100;
            return `
                                    <div>
                                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                            <span style="font-size: 0.9rem;">${c.category}</span>
                                            <span style="font-size: 0.85rem; color: var(--gray-400);">${c.product_count} productos | ${c.total_stock} uds</span>
                                        </div>
                                        <div style="height: 20px; background: var(--dark-surface-hover); border-radius: 6px; overflow: hidden;">
                                            <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--primary-500), var(--primary-600)); display: flex; align-items: center; justify-content: flex-end; padding-right: 8px;">
                                                <span style="font-size: 0.7rem; font-weight: 600; color: white;">${formatCurrency(c.category_value)}</span>
                                            </div>
                                        </div>
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${data.low_stock_products.length > 0 ? `
                    <div style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); overflow: hidden;">
                        <h4 style="margin: 0; padding: 15px; border-bottom: 1px solid var(--dark-border); font-size: 1rem; color: var(--warning-400);">⚠️ Productos con Stock Bajo</h4>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--dark-surface-hover);">
                                    <th style="padding: 8px 15px; text-align: left; font-size: 0.8rem; color: var(--gray-400);">Código</th>
                                    <th style="padding: 8px 15px; text-align: left; font-size: 0.8rem; color: var(--gray-400);">Producto</th>
                                    <th style="padding: 8px 15px; text-align: right; font-size: 0.8rem; color: var(--gray-400);">Stock</th>
                                    <th style="padding: 8px 15px; text-align: right; font-size: 0.8rem; color: var(--gray-400);">Mínimo</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.low_stock_products.slice(0, 10).map(p => `
                                    <tr style="border-bottom: 1px solid var(--dark-border);">
                                        <td style="padding: 8px 15px; font-family: monospace; font-size: 0.85rem;">${p.code || '-'}</td>
                                        <td style="padding: 8px 15px; font-size: 0.9rem;">${p.name}</td>
                                        <td style="padding: 8px 15px; text-align: right; font-weight: 600; color: ${p.stock === 0 ? 'var(--danger-400)' : 'var(--warning-400)'};">${p.stock}</td>
                                        <td style="padding: 8px 15px; text-align: right; color: var(--gray-500);">${p.min_stock}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
            
            ${data.inactive_products.length > 0 ? `
                <div style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); overflow: hidden;">
                    <h4 style="margin: 0; padding: 15px; border-bottom: 1px solid var(--dark-border); font-size: 1rem; color: var(--gray-400);">💤 Productos Sin Movimiento (30 días)</h4>
                    <div style="padding: 15px; display: flex; flex-wrap: wrap; gap: 10px;">
                        ${data.inactive_products.slice(0, 15).map(p => `
                            <span style="background: var(--dark-surface-hover); padding: 6px 12px; border-radius: 20px; font-size: 0.85rem;">
                                ${p.name} <span style="color: var(--gray-500);">(${p.stock} uds)</span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });
        showNotification('Reporte generado', 'success');

    } catch (e) {
        console.error('Error:', e);
        showNotification('Error al generar reporte', 'error');
    }
}

function getDemoSalesData() {
    return {
        summary: { total_sales: 45, total_revenue: 25000, cash_total: 15000, card_total: 8000, transfer_total: 2000, average_sale: 555 },
        daily_sales: [
            { date: '2024-12-01', sales_count: 8, daily_total: 4500 },
            { date: '2024-12-02', sales_count: 6, daily_total: 3200 }
        ],
        top_products: [
            { product_code: 'ACE001', product_name: 'Aceite Motor 5W-30', total_quantity: 25, total_revenue: 7500 }
        ]
    };
}

function getDemoInventoryData() {
    return {
        summary: { total_products: 150, total_units: 2500, total_cost_value: 75000, total_sale_value: 125000, out_of_stock: 5, low_stock: 12 },
        by_category: [
            { category: 'Lubricantes', product_count: 25, total_stock: 400, category_value: 25000 },
            { category: 'Filtros', product_count: 35, total_stock: 600, category_value: 18000 }
        ],
        low_stock_products: [
            { code: 'FIL001', name: 'Filtro de Aceite', stock: 3, min_stock: 10, category: 'Filtros' }
        ],
        inactive_products: []
    };
}

async function generateProfitReport() {
    showNotification('Generando reporte de utilidades...', 'info');

    const activeView = document.querySelector('.tab-view[data-module="reports"].active');
    const resultsContainer = activeView?.querySelector('#reportResults');

    if (!resultsContainer) {
        showNotification('Error: Contenedor de resultados no encontrado', 'error');
        return;
    }

    try {
        let data = null;

        if (typeof eel !== 'undefined') {
            const result = await eel.get_profit_report()();
            if (result.success) {
                data = result.data;
            } else {
                showNotification('Error: ' + result.error, 'error');
                return;
            }
        } else {
            // Datos demo
            data = getDemoProfitData();
        }

        const formatCurrency = (n) => '$' + (n || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        const getProfitClass = (percent) => percent >= 30 ? 'profit-high' : percent >= 15 ? 'profit-medium' : 'profit-low';

        let html = `
            <div class="report-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0;">📊 Reporte de Utilidades</h3>
                    <p style="margin: 5px 0 0; color: var(--gray-400); font-size: 0.9rem;">Generado: ${new Date().toLocaleString('es-MX')}</p>
                </div>
                <button class="btn btn-ghost" onclick="hideReportResults()">✕ Cerrar</button>
            </div>
            
            <div class="profit-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Costo Total Inventario</p>
                    <p style="margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--danger-400);">${formatCurrency(data.summary.total_cost)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Valor Total Inventario</p>
                    <p style="margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--primary-400);">${formatCurrency(data.summary.total_value)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Utilidad Total</p>
                    <p style="margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--success-400);">${formatCurrency(data.summary.total_profit)}</p>
                </div>
                <div class="stat-card" style="background: var(--dark-surface); padding: 15px; border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0 0 5px; color: var(--gray-400); font-size: 0.85rem;">Margen General</p>
                    <p style="margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--warning-400);">${(data.summary.overall_margin || 0).toFixed(1)}%</p>
                </div>
            </div>
            
            <div class="table-container" style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); overflow: hidden;">
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: var(--dark-surface-hover);">
                            <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--dark-border);">Código</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--dark-border);">Producto</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--dark-border);">Proveedor</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Stock</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Costo</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Precio</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Utilidad Unit.</th>
                            <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--dark-border);">% Margen</th>
                            <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Utilidad Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.products.map(p => {
            const profitClass = getProfitClass(p.profit_percent);
            const bgColor = profitClass === 'profit-high' ? 'rgba(34, 197, 94, 0.1)' :
                profitClass === 'profit-medium' ? 'rgba(234, 179, 8, 0.1)' :
                    'rgba(239, 68, 68, 0.1)';
            const textColor = profitClass === 'profit-high' ? '#22c55e' :
                profitClass === 'profit-medium' ? '#eab308' : '#ef4444';
            return `
                                <tr style="border-bottom: 1px solid var(--dark-border);">
                                    <td style="padding: 10px 12px; font-family: monospace;">${p.code || '-'}</td>
                                    <td style="padding: 10px 12px;">${p.name}</td>
                                    <td style="padding: 10px 12px; color: var(--gray-400);">${p.supplier}</td>
                                    <td style="padding: 10px 12px; text-align: right;">${p.stock}</td>
                                    <td style="padding: 10px 12px; text-align: right; color: var(--danger-400);">${formatCurrency(p.cost)}</td>
                                    <td style="padding: 10px 12px; text-align: right;">${formatCurrency(p.price)}</td>
                                    <td style="padding: 10px 12px; text-align: right; color: var(--success-400);">${formatCurrency(p.unit_profit)}</td>
                                    <td style="padding: 10px 12px; text-align: center;">
                                        <span style="background: ${bgColor}; color: ${textColor}; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                            ${(p.profit_percent || 0).toFixed(1)}%
                                        </span>
                                    </td>
                                    <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--success-400);">${formatCurrency(p.total_profit)}</td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 15px; padding: 15px; background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border);">
                <p style="margin: 0 0 10px; font-weight: 600;">🎯 Leyenda:</p>
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <span><span style="background: rgba(34, 197, 94, 0.2); color: #22c55e; padding: 2px 8px; border-radius: 8px;">30%+</span> Utilidad Alta</span>
                    <span><span style="background: rgba(234, 179, 8, 0.2); color: #eab308; padding: 2px 8px; border-radius: 8px;">15-29%</span> Utilidad Media</span>
                    <span><span style="background: rgba(239, 68, 68, 0.2); color: #ef4444; padding: 2px 8px; border-radius: 8px;">&lt;15%</span> Utilidad Baja</span>
                </div>
            </div>
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        showNotification('Reporte generado correctamente', 'success');

    } catch (e) {
        console.error('Error generando reporte:', e);
        showNotification('Error al generar reporte', 'error');
    }
}

async function generateSupplierComparison() {
    showNotification('Generando comparativa de proveedores...', 'info');

    const activeView = document.querySelector('.tab-view[data-module="reports"].active');
    const resultsContainer = activeView?.querySelector('#reportResults');

    if (!resultsContainer) {
        showNotification('Error: Contenedor de resultados no encontrado', 'error');
        return;
    }

    try {
        let data = null;

        if (typeof eel !== 'undefined') {
            const result = await eel.get_supplier_comparison()();
            if (result.success) {
                data = result.data;
            } else {
                showNotification('Error: ' + result.error, 'error');
                return;
            }
        } else {
            // Datos demo
            data = getDemoSupplierComparisonData();
        }

        const formatCurrency = (n) => '$' + (n || 0).toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
        const getProfitClass = (percent) => percent >= 30 ? 'profit-high' : percent >= 15 ? 'profit-medium' : 'profit-low';

        let html = `
            <div class="report-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div>
                    <h3 style="margin: 0;">🏆 Comparativa de Proveedores</h3>
                    <p style="margin: 5px 0 0; color: var(--gray-400); font-size: 0.9rem;">Generado: ${new Date().toLocaleString('es-MX')}</p>
                </div>
                <button class="btn btn-ghost" onclick="hideReportResults()">✕ Cerrar</button>
            </div>
            
            ${data.suppliers.length === 0 ? `
                <div style="text-align: center; padding: 40px; background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border);">
                    <p style="margin: 0; color: var(--gray-400);">No hay datos de compras registradas para generar la comparativa.</p>
                    <p style="margin: 10px 0 0; color: var(--gray-500); font-size: 0.9rem;">Registra compras a proveedores en el módulo de Movimientos.</p>
                </div>
            ` : `
                <div class="table-container" style="background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border); overflow: hidden;">
                    <table class="data-table" style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background: var(--dark-surface-hover);">
                                <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--dark-border);">Ranking</th>
                                <th style="padding: 12px; text-align: left; border-bottom: 1px solid var(--dark-border);">Proveedor</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Productos</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Costo Total</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Valor Total</th>
                                <th style="padding: 12px; text-align: right; border-bottom: 1px solid var(--dark-border);">Utilidad Total</th>
                                <th style="padding: 12px; text-align: center; border-bottom: 1px solid var(--dark-border);">% Margen Prom.</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.suppliers.map((s, index) => {
            const profitClass = getProfitClass(s.avg_margin);
            const bgColor = profitClass === 'profit-high' ? 'rgba(34, 197, 94, 0.1)' :
                profitClass === 'profit-medium' ? 'rgba(234, 179, 8, 0.1)' :
                    'rgba(239, 68, 68, 0.1)';
            const textColor = profitClass === 'profit-high' ? '#22c55e' :
                profitClass === 'profit-medium' ? '#eab308' : '#ef4444';
            const rankColor = index === 0 ? '#fbbf24' : index === 1 ? '#94a3b8' : index === 2 ? '#a16207' : 'var(--gray-400)';
            const rankBg = index === 0 ? 'rgba(251, 191, 36, 0.2)' : index === 1 ? 'rgba(148, 163, 184, 0.2)' : index === 2 ? 'rgba(161, 98, 7, 0.2)' : 'transparent';

            return `
                                    <tr style="border-bottom: 1px solid var(--dark-border);">
                                        <td style="padding: 10px 12px; text-align: center;">
                                            <span style="background: ${rankBg}; color: ${rankColor}; padding: 4px 10px; border-radius: 8px; font-weight: 700;">
                                                #${index + 1}
                                            </span>
                                        </td>
                                        <td style="padding: 10px 12px; font-weight: 500;">${s.name}</td>
                                        <td style="padding: 10px 12px; text-align: right;">${s.products_count}</td>
                                        <td style="padding: 10px 12px; text-align: right; color: var(--danger-400);">${formatCurrency(s.total_cost)}</td>
                                        <td style="padding: 10px 12px; text-align: right;">${formatCurrency(s.total_value)}</td>
                                        <td style="padding: 10px 12px; text-align: right; font-weight: 600; color: var(--success-400);">${formatCurrency(s.total_profit)}</td>
                                        <td style="padding: 10px 12px; text-align: center;">
                                            <span style="background: ${bgColor}; color: ${textColor}; padding: 3px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">
                                                ${(s.avg_margin || 0).toFixed(1)}%
                                            </span>
                                        </td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                    </table>
                </div>
                
                ${data.recommendations && data.recommendations.length > 0 ? `
                    <div style="margin-top: 20px; padding: 15px; background: var(--dark-surface); border-radius: 12px; border: 1px solid var(--dark-border);">
                        <p style="margin: 0 0 10px; font-weight: 600;">💡 Recomendaciones:</p>
                        <ul style="margin: 0; padding-left: 20px; color: var(--gray-300);">
                            ${data.recommendations.map(r => `<li style="margin: 5px 0;">${r}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            `}
        `;

        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        resultsContainer.scrollIntoView({ behavior: 'smooth' });

        showNotification('Comparativa generada correctamente', 'success');

    } catch (e) {
        console.error('Error generando comparativa:', e);
        showNotification('Error al generar comparativa', 'error');
    }
}

function hideReportResults() {
    const activeView = document.querySelector('.tab-view[data-module="reports"].active');
    const resultsContainer = activeView?.querySelector('#reportResults');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
}

function getDemoProfitData() {
    return {
        summary: { total_cost: 50000, total_value: 75000, total_profit: 25000, overall_margin: 50 },
        products: [
            { code: 'ACE001', name: 'Aceite Motor 5W-30', supplier: 'Lubricantes SA', stock: 25, cost: 180, price: 299, unit_profit: 119, profit_percent: 66, total_profit: 2975 },
            { code: 'FIL001', name: 'Filtro de Aceite', supplier: 'AutoPartes Norte', stock: 40, cost: 45, price: 89, unit_profit: 44, profit_percent: 97, total_profit: 1760 }
        ]
    };
}

function getDemoSupplierComparisonData() {
    return {
        suppliers: [
            { id: 1, name: 'Lubricantes SA', products_count: 15, total_cost: 25000, total_value: 42000, total_profit: 17000, avg_margin: 68 },
            { id: 2, name: 'AutoPartes Norte', products_count: 28, total_cost: 18000, total_value: 27000, total_profit: 9000, avg_margin: 50 }
        ],
        recommendations: ['Mejor proveedor: Lubricantes SA - Mayor utilidad total ($17,000.00)']
    };
}

// ===== Ajustes =====
function initSettingsModule() {
    console.log('Inicializando Ajustes...');
    loadSettingsData();

    // Ocultar elementos que requieren módulos deshabilitados
    // Esta función se ejecuta después de que el template se renderiza
    setTimeout(() => {
        if (window.enabledConfigModules && typeof TabsManager !== 'undefined') {
            TabsManager.hideDisabledModuleElements(window.enabledConfigModules);
        }
    }, 100);
}

async function loadSettingsData() {
    try {
        let settings = {};

        if (typeof eel !== 'undefined') {
            const result = await eel.get_settings()();
            if (result.success) {
                settings = result.data;
            }
        }

        // Llenar campos
        const setInputValue = (id, value) => {
            const el = document.getElementById(id);
            if (el && value) el.value = value;
        };

        setInputValue('settingsCompanyName', settings.company_name);
        setInputValue('settingsCompanyPhone', settings.company_phone);
        setInputValue('settingsCompanyAddress', settings.company_address);
    } catch (e) {
        console.error('Error cargando configuración:', e);
    }
}

async function saveCompanySettings() {
    const settings = {
        company_name: document.getElementById('settingsCompanyName')?.value || '',
        company_phone: document.getElementById('settingsCompanyPhone')?.value || '',
        company_address: document.getElementById('settingsCompanyAddress')?.value || '',
        company_rfc: document.getElementById('settingsCompanyRFC')?.value || '',
        company_email: document.getElementById('settingsCompanyEmail')?.value || ''
    };

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.save_settings(settings)();
            if (result.success) {
                showNotification('Configuración guardada', 'success');
            }
        } else {
            showNotification('Configuración guardada (modo demo)', 'success');
        }
    } catch (e) {
        showNotification('Error al guardar', 'error');
    }
}

// ===== Navegación de Ajustes - Nuevo diseño con paneles =====
function openSettingsPanel(panelName) {
    const grid = document.getElementById('settingsMainGrid');
    const panel = document.getElementById('settingsPanel');
    const panelTitle = document.getElementById('settingsPanelTitle');
    const panelContent = document.getElementById('settingsPanelContent');

    if (!grid || !panel) return;

    // Ocultar grid, mostrar panel
    grid.style.display = 'none';
    panel.style.display = 'block';

    // Títulos por sección
    const titles = {
        empresa: '🏢 Información de la Empresa',
        apariencia: '🎨 Apariencia y Temas',
        tickets: '🎫 Configuración de Tickets',
        usuarios: '👥 Gestión de Usuarios',
        ventas: '💰 Configuración de Ventas',
        dispositivos: '🔌 Dispositivos',
        respaldos: '☁️ Respaldos y Datos'
    };

    panelTitle.textContent = titles[panelName] || 'Configuración';

    // Cargar contenido según sección
    if (panelName === 'apariencia') {
        panelContent.innerHTML = getAparienciaContent();
        initThemeSelection();
    } else if (panelName === 'empresa') {
        panelContent.innerHTML = getEmpresaContent();
    } else if (panelName === 'tickets') {
        panelContent.innerHTML = getTicketsContent();
        setTimeout(() => updateTicketPreviewNew(), 100);
    } else if (panelName === 'usuarios') {
        panelContent.innerHTML = getUsuariosContent();
        if (typeof loadUsers === 'function') loadUsers();
    } else if (panelName === 'ventas') {
        panelContent.innerHTML = getVentasContent();
    } else if (panelName === 'dispositivos') {
        panelContent.innerHTML = getDispositivosContent();
        // Inicializar detección de puertos al abrir
        setTimeout(() => {
            if (typeof detectSerialPorts === 'function') detectSerialPorts();
            if (typeof detectPrinters === 'function') detectPrinters();
        }, 300);
    } else if (panelName === 'respaldos') {
        panelContent.innerHTML = getRespaldosContent();
    }
}

function closeSettingsPanel() {
    const grid = document.getElementById('settingsMainGrid');
    const panel = document.getElementById('settingsPanel');

    if (grid) grid.style.display = 'grid';
    if (panel) panel.style.display = 'none';
}

// ===== Contenido de Apariencia =====
function getAparienciaContent() {
    return `
        <div class="settings-section">
            <h4 style="color: var(--gray-100); margin-bottom: 5px;">Tema de Color</h4>
            <p style="color: var(--gray-500); font-size: 0.85rem; margin-bottom: 15px;">Selecciona el color principal de la aplicación</p>
            
            <div class="theme-colors-grid">
                <div class="theme-color-option active" onclick="selectThemeColor('#3b82f6', this)" data-color="#3b82f6">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #3b82f6, #2563eb);"></div>
                    <span>Azul</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#8b5cf6', this)" data-color="#8b5cf6">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);"></div>
                    <span>Morado</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#10b981', this)" data-color="#10b981">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #10b981, #059669);"></div>
                    <span>Verde</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#f59e0b', this)" data-color="#f59e0b">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #f59e0b, #d97706);"></div>
                    <span>Naranja</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#ef4444', this)" data-color="#ef4444">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #ef4444, #dc2626);"></div>
                    <span>Rojo</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#ec4899', this)" data-color="#ec4899">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #ec4899, #db2777);"></div>
                    <span>Rosa</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#14b8a6', this)" data-color="#14b8a6">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #14b8a6, #0d9488);"></div>
                    <span>Teal</span>
                </div>
                <div class="theme-color-option" onclick="selectThemeColor('#6366f1', this)" data-color="#6366f1">
                    <div class="theme-color-swatch" style="background: linear-gradient(135deg, #6366f1, #4f46e5);"></div>
                    <span>Índigo</span>
                </div>
            </div>
        </div>
        
        <div class="settings-section" style="margin-top: 25px;">
            <h4 style="color: var(--gray-100); margin-bottom: 5px;">Modo de Visualización</h4>
            <p style="color: var(--gray-500); font-size: 0.85rem; margin-bottom: 15px;">Elige entre modo oscuro o claro</p>
            
            <div class="theme-mode-options">
                <button class="theme-mode-btn active" onclick="selectThemeMode('dark', this)" data-mode="dark">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                    Oscuro
                </button>
                <button class="theme-mode-btn" onclick="selectThemeMode('light', this)" data-mode="light">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    Claro
                </button>
            </div>
        </div>
        
        <div style="margin-top: 25px;">
            <button class="btn btn-primary" onclick="saveAppearanceSettings()">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                Guardar Cambios
            </button>
        </div>
    `;
}

let selectedThemeColor = '#3b82f6';
let selectedThemeMode = 'dark';

function initThemeSelection() {
    // Cargar configuración guardada
    const settings = StorageManager.get('appSettings') || {};
    selectedThemeColor = settings.primaryColor || '#3b82f6';
    selectedThemeMode = settings.theme || 'dark';

    // Marcar el color activo
    document.querySelectorAll('.theme-color-option').forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.color === selectedThemeColor) {
            opt.classList.add('active');
        }
    });

    // Marcar el modo activo
    document.querySelectorAll('.theme-mode-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.mode === selectedThemeMode) {
            btn.classList.add('active');
        }
    });
}

function selectThemeColor(color, element) {
    selectedThemeColor = color;
    document.querySelectorAll('.theme-color-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');

    // Vista previa inmediata
    applyPrimaryColor(color);
}

function selectThemeMode(mode, element) {
    selectedThemeMode = mode;
    document.querySelectorAll('.theme-mode-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');

    // Aplicar modo
    if (typeof applyTheme === 'function') {
        applyTheme(mode);
    }
}

function saveAppearanceSettings() {
    const settings = StorageManager.get('appSettings') || {};
    settings.primaryColor = selectedThemeColor;
    settings.theme = selectedThemeMode;
    StorageManager.set('appSettings', settings);

    showNotification('Apariencia guardada correctamente', 'success');
}

// ===== Contenido de otras secciones =====
function getEmpresaContent() {
    const settings = StorageManager.get('appSettings') || {};
    return `
        <div class="settings-section">
            <!-- Logo de la Empresa -->
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">Logo de la Empresa</h4>
            <div style="display: flex; align-items: flex-start; gap: 20px; margin-bottom: 25px; padding: 15px; background: var(--dark-bg); border-radius: 12px;">
                <div id="companyLogoPreview" style="width: 100px; height: 100px; border: 2px dashed var(--dark-border); border-radius: 12px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--dark-surface); flex-shrink: 0;">
                    ${settings.companyLogo ?
            '<img src="' + settings.companyLogo + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">' :
            '<div style="text-align: center; color: var(--gray-500);"><div style="font-size: 2rem;">🏢</div><span style="font-size: 0.7rem;">Sin logo</span></div>'}
                </div>
                <div style="flex: 1;">
                    <p style="color: var(--gray-300); margin: 0 0 10px; font-size: 0.85rem;">El logo aparecerá en tickets, reportes y el encabezado del sistema.</p>
                    <input type="file" id="companyLogoInput" accept="image/*" style="display: none;" onchange="handleCompanyLogoUpload(this)">
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-secondary btn-sm" onclick="document.getElementById('companyLogoInput').click()">
                            📷 ${settings.companyLogo ? 'Cambiar Logo' : 'Subir Logo'}
                        </button>
                        ${settings.companyLogo ? '<button class="btn btn-ghost btn-sm" style="color: var(--danger-400);" onclick="removeCompanyLogo()">✕ Quitar</button>' : ''}
                    </div>
                    <p style="color: var(--gray-500); font-size: 0.7rem; margin-top: 8px;">Formatos: JPG, PNG, GIF. Tamaño recomendado: 200x200px. Máx 300KB</p>
                </div>
            </div>

            <!-- Datos de la Empresa -->
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">Datos de la Empresa</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre de la Empresa</label>
                    <input type="text" id="settingsCompanyName" class="form-input" value="${settings.companyName || 'Refaccionaria SMIP'}" placeholder="Nombre de tu empresa">
                </div>
                <div class="form-group">
                    <label>RFC</label>
                    <input type="text" id="settingsCompanyRFC" class="form-input" value="${settings.companyRFC || ''}" placeholder="XAXX010101000">
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" id="settingsCompanyPhone" class="form-input" value="${settings.companyPhone || ''}" placeholder="(999) 999-9999">
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="settingsCompanyEmail" class="form-input" value="${settings.companyEmail || ''}" placeholder="correo@empresa.com">
                </div>
            </div>
            <div class="form-group">
                <label>Dirección</label>
                <textarea id="settingsCompanyAddress" class="form-input" rows="2" placeholder="Calle, número, colonia, ciudad">${settings.companyAddress || ''}</textarea>
            </div>
            <button class="btn btn-primary" onclick="saveCompanySettings()">
                ✓ Guardar Cambios
            </button>
        </div>
    `;
}

// Funciones para manejar el logo de la empresa
function handleCompanyLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamaño (máx 300KB)
    if (file.size > 300 * 1024) {
        showNotification('La imagen es muy grande. Máximo 300KB.', 'error');
        input.value = '';
        return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor selecciona una imagen válida.', 'error');
        input.value = '';
        return;
    }

    // Convertir a Base64
    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;

        // Guardar en settings
        const settings = StorageManager.get('appSettings') || {};
        settings.companyLogo = base64;
        // También usar como logo de ticket por defecto
        settings.ticketLogo = base64;
        StorageManager.set('appSettings', settings);

        showNotification('Logo cargado correctamente', 'success');

        // Recargar panel
        openSettingsPanel('empresa');
    };
    reader.readAsDataURL(file);
}

function removeCompanyLogo() {
    const settings = StorageManager.get('appSettings') || {};
    delete settings.companyLogo;
    delete settings.ticketLogo;
    StorageManager.set('appSettings', settings);

    showNotification('Logo eliminado', 'success');
    openSettingsPanel('empresa');
}

// Exponer funciones
window.handleCompanyLogoUpload = handleCompanyLogoUpload;
window.removeCompanyLogo = removeCompanyLogo;

function getTicketsContent() {
    const settings = StorageManager.get('appSettings') || {};
    return `
        <div style="display: grid; grid-template-columns: 1fr 280px; gap: 20px;">
            <div>
                <div class="settings-section">
                    <h4 style="color: var(--gray-100); margin-bottom: 15px;">Formato del Ticket</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label>Ancho del papel (mm)</label>
                            <select id="settingsTicketWidth" class="form-input" onchange="updateTicketPreviewNew()">
                                <option value="58" ${settings.ticketWidth === '58' ? 'selected' : ''}>58mm (Térmico pequeño)</option>
                                <option value="80" ${settings.ticketWidth !== '58' ? 'selected' : ''}>80mm (Térmico estándar)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Tamaño de fuente</label>
                            <select id="settingsTicketFont" class="form-input" onchange="updateTicketPreviewNew()">
                                <option value="small" ${settings.ticketFont === 'small' ? 'selected' : ''}>Pequeño</option>
                                <option value="normal" ${settings.ticketFont === 'normal' || !settings.ticketFont ? 'selected' : ''}>Normal</option>
                                <option value="large" ${settings.ticketFont === 'large' ? 'selected' : ''}>Grande</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="settings-section" style="margin-top: 20px;">
                    <h4 style="color: var(--gray-100); margin-bottom: 15px;">Mensajes personalizados</h4>
                    <div class="form-group">
                        <label>Encabezado adicional</label>
                        <input type="text" id="settingsTicketHeader" class="form-input" value="${settings.ticketHeader || ''}" placeholder="Texto adicional en encabezado" oninput="updateTicketPreviewNew()">
                    </div>
                    <div class="form-group">
                        <label>Pie del ticket</label>
                        <input type="text" id="settingsTicketFooter" class="form-input" value="${settings.ticketFooter || '¡Gracias por su compra!'}" oninput="updateTicketPreviewNew()">
                    </div>
                </div>
                <div class="settings-section" style="margin-top: 20px;">
                    <h4 style="color: var(--gray-100); margin-bottom: 15px;">Logo de la Empresa</h4>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div id="logoPreviewContainer" style="width: 80px; height: 80px; border: 2px dashed var(--dark-border); border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--dark-bg);">
                            ${settings.ticketLogo ?
            '<img id="logoPreview" src="' + settings.ticketLogo + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">' :
            '<span style="color: var(--gray-500); font-size: 0.8rem; text-align: center;">Sin logo</span>'}
                        </div>
                        <div style="flex: 1;">
                            <input type="file" id="logoFileInput" accept="image/*" style="display: none;" onchange="handleLogoUpload(this)">
                            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('logoFileInput').click()" style="margin-bottom: 8px;">
                                📷 Seleccionar imagen
                            </button>
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin: 0;">Formatos: JPG, PNG, GIF. Máx 200KB</p>
                            ${settings.ticketLogo ? '<button class="btn btn-ghost btn-sm" style="color: var(--danger-400); margin-top: 5px;" onclick="removeLogo()">✕ Quitar logo</button>' : ''}
                        </div>
                    </div>
                </div>
                <div class="settings-section" style="margin-top: 20px;">
                    <h4 style="color: var(--gray-100); margin-bottom: 15px;">Opciones de Visualización</h4>
                    <div class="checkbox-group">
                        <label class="checkbox-label">
                            <input type="checkbox" id="settingsTicketShowLogo" ${settings.ticketShowLogo !== false ? 'checked' : ''} onchange="updateTicketPreviewNew()">
                            <span>Mostrar logo en ticket</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="settingsTicketShowRFC" ${settings.ticketShowRFC !== false ? 'checked' : ''} onchange="updateTicketPreviewNew()">
                            <span>Mostrar RFC</span>
                        </label>
                    </div>
                </div>
                <button class="btn btn-primary" style="margin-top: 20px;" onclick="saveTicketSettingsNew()">
                    ✓ Guardar Configuración
                </button>
            </div>
            <div>
                <h4 style="color: var(--gray-100); margin-bottom: 10px; text-align: center;">Vista Previa</h4>
                <div id="settingsTicketPreview" style="background: white; color: #333; padding: 12px; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 11px; min-height: 300px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Se llena dinámicamente -->
                </div>
            </div>
        </div>
    `;
}

// Nueva función de preview que no depende de campos externos
function updateTicketPreviewNew() {
    const container = document.getElementById('settingsTicketPreview');
    if (!container) return;

    // Obtener valores del formulario
    const header = document.getElementById('settingsTicketHeader')?.value || '';
    const footer = document.getElementById('settingsTicketFooter')?.value || '¡Gracias por su compra!';
    const showLogo = document.getElementById('settingsTicketShowLogo')?.checked ?? true;
    const showRFC = document.getElementById('settingsTicketShowRFC')?.checked ?? true;
    const font = document.getElementById('settingsTicketFont')?.value || 'normal';

    // Obtener datos de la empresa desde StorageManager
    const settings = StorageManager.get('appSettings') || {};
    const companyName = settings.companyName || 'Mi Empresa';
    const companyRFC = settings.companyRFC || 'XAXX010101000';

    // Tamaño de fuente
    let fontSize = '11px';
    if (font === 'small') fontSize = '9px';
    if (font === 'large') fontSize = '13px';

    container.style.fontSize = fontSize;

    // Generar Preview
    const now = new Date();
    const fecha = now.toLocaleDateString('es-MX');
    const hora = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

    let html = '';

    // Header
    if (showLogo) {
        if (settings.ticketLogo) {
            html += '<div style="margin-bottom: 8px;"><img src="' + settings.ticketLogo + '" style="max-width: 80px; max-height: 50px; object-fit: contain;"></div>';
        } else {
            html += '<div style="font-size: 1.3em; margin-bottom: 5px;">🏪</div>';
        }
    }
    html += '<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 5px;">' + companyName + '</div>';

    if (showRFC) {
        html += '<div style="font-size: 0.9em; color: #666;">RFC: ' + companyRFC + '</div>';
    }

    if (header) {
        html += '<div style="font-size: 0.85em; color: #888; margin-top: 3px;">' + header + '</div>';
    }

    html += '<div style="border-top: 1px dashed #ccc; margin: 8px 0;"></div>';

    // Info de venta
    html += '<div style="text-align: left; font-size: 0.9em;">';
    html += '<div>Folio: <strong>V-0001</strong></div>';
    html += '<div>Fecha: ' + fecha + ' ' + hora + '</div>';
    html += '</div>';

    html += '<div style="border-top: 1px dashed #ccc; margin: 8px 0;"></div>';

    // Productos de ejemplo
    html += '<div style="text-align: left;">';
    html += '<div style="display: flex; justify-content: space-between;"><span>1 x Producto A</span><span>$99.00</span></div>';
    html += '<div style="display: flex; justify-content: space-between;"><span>2 x Producto B</span><span>$150.00</span></div>';
    html += '</div>';

    html += '<div style="border-top: 1px solid #333; margin: 8px 0;"></div>';

    // Total
    html += '<div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 1.1em;">';
    html += '<span>TOTAL:</span><span>$249.00</span>';
    html += '</div>';

    html += '<div style="border-top: 1px dashed #ccc; margin: 8px 0;"></div>';

    // Footer
    html += '<div style="font-size: 0.9em; color: #666; margin-top: 10px;">' + footer + '</div>';

    container.innerHTML = html;
}

// Nueva función para guardar configuración de tickets
function saveTicketSettingsNew() {
    const settings = StorageManager.get('appSettings') || {};

    settings.ticketHeader = document.getElementById('settingsTicketHeader')?.value || '';
    settings.ticketFooter = document.getElementById('settingsTicketFooter')?.value || '';
    settings.ticketWidth = document.getElementById('settingsTicketWidth')?.value || '80';
    settings.ticketFont = document.getElementById('settingsTicketFont')?.value || 'normal';
    settings.ticketShowLogo = document.getElementById('settingsTicketShowLogo')?.checked ?? true;
    settings.ticketShowRFC = document.getElementById('settingsTicketShowRFC')?.checked ?? true;

    StorageManager.set('appSettings', settings);
    showNotification('Configuración de tickets guardada', 'success');
}

// Función para manejar la carga del logo
function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;

    // Validar tamaño (máx 200KB)
    if (file.size > 200 * 1024) {
        showNotification('La imagen es muy grande. Máximo 200KB.', 'error');
        input.value = '';
        return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
        showNotification('Por favor selecciona una imagen válida.', 'error');
        input.value = '';
        return;
    }

    // Convertir a Base64
    const reader = new FileReader();
    reader.onload = function (e) {
        const base64 = e.target.result;

        // Guardar en settings
        const settings = StorageManager.get('appSettings') || {};
        settings.ticketLogo = base64;
        StorageManager.set('appSettings', settings);

        // Actualizar vista previa del logo
        const container = document.getElementById('logoPreviewContainer');
        if (container) {
            container.innerHTML = '<img id="logoPreview" src="' + base64 + '" style="max-width: 100%; max-height: 100%; object-fit: contain;">';
        }

        // Actualizar preview del ticket
        updateTicketPreviewNew();

        showNotification('Logo cargado correctamente', 'success');

        // Recargar contenido para mostrar botón de quitar
        openSettingsPanel('tickets');
    };
    reader.readAsDataURL(file);
}

// Función para quitar el logo
function removeLogo() {
    const settings = StorageManager.get('appSettings') || {};
    delete settings.ticketLogo;
    StorageManager.set('appSettings', settings);

    showNotification('Logo eliminado', 'success');

    // Recargar contenido
    openSettingsPanel('tickets');
}

// Exponer nuevas funciones
window.updateTicketPreviewNew = updateTicketPreviewNew;
window.saveTicketSettingsNew = saveTicketSettingsNew;
window.handleLogoUpload = handleLogoUpload;
window.removeLogo = removeLogo;

function getUsuariosContent() {
    return `
        <div class="settings-section">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
                <button class="btn btn-primary" onclick="openUserModal()">+ Nuevo Usuario</button>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Rol</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody id="usersTableBody">
                        <tr><td colspan="5" style="text-align: center; color: var(--gray-500);">Cargando usuarios...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function getVentasContent() {
    const settings = StorageManager.get('appSettings') || {};
    return `
        <div class="settings-section">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">Configuración de Impuestos</h4>
            <div class="form-row">
                <div class="form-group">
                    <label>IVA (%)</label>
                    <input type="number" id="settingsIVA" class="form-input" value="${settings.iva || 16}" min="0" max="100">
                </div>
                <div class="form-group">
                    <label>Descuento máximo (%)</label>
                    <input type="number" id="settingsMaxDiscount" class="form-input" value="${settings.maxDiscount || 20}" min="0" max="100">
                </div>
            </div>
        </div>
        <div class="settings-section" style="margin-top: 20px;">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">Control de Inventario en Ventas</h4>
            <div style="background: var(--dark-bg); border-radius: 12px; padding: 15px; border: 1px solid var(--dark-border);">
                <div class="checkbox-group">
                    <label class="checkbox-label" style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                        <input type="checkbox" id="settingsSkipStockCheck" ${settings.skipStockCheck ? 'checked' : ''} style="margin-top: 3px;">
                        <div>
                            <span style="font-weight: 600; color: var(--gray-100);">🚫 NO verificar stock al vender</span>
                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--gray-400);">
                                Si activas esta opción, podrás vender cualquier producto sin importar el stock disponible. 
                                Útil cuando el inventario no está actualizado o no llevas control de stock.
                            </p>
                        </div>
                    </label>
                </div>
                <div class="checkbox-group" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--dark-border);">
                    <label class="checkbox-label" style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                        <input type="checkbox" id="settingsAllowNegativeStock" ${settings.allowNegativeStock ? 'checked' : ''} style="margin-top: 3px;">
                        <div>
                            <span style="font-weight: 600; color: var(--gray-100);">📉 Permitir stock negativo</span>
                            <p style="margin: 4px 0 0; font-size: 0.85rem; color: var(--gray-400);">
                                Permite que el stock baje a valores negativos después de una venta.
                                Se mostrará una alerta pero se permitirá continuar.
                            </p>
                        </div>
                    </label>
                </div>
            </div>
        </div>
        <div class="settings-section" style="margin-top: 20px;">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">Métodos de Pago</h4>
            <div class="checkbox-group">
                <label class="checkbox-label"><input type="checkbox" checked disabled><span>Efectivo</span></label>
                <label class="checkbox-label"><input type="checkbox" id="settingsPaymentCard" ${settings.paymentCard !== false ? 'checked' : ''}><span>Tarjeta</span></label>
                <label class="checkbox-label"><input type="checkbox" id="settingsPaymentTransfer" ${settings.paymentTransfer !== false ? 'checked' : ''}><span>Transferencia</span></label>
                <label class="checkbox-label"><input type="checkbox" id="settingsPaymentCredit" ${settings.paymentCredit ? 'checked' : ''}><span>Crédito</span></label>
            </div>
        </div>
        <button class="btn btn-primary" style="margin-top: 20px;" onclick="saveSalesSettings()">
            ✓ Guardar configuración de ventas
        </button>
    `;
}

function getRespaldosContent() {
    return `
        <div class="settings-section">
            <h4 style="color: var(--gray-100); margin-bottom: 10px;">Respaldo de Datos</h4>
            <p style="color: var(--gray-500); margin-bottom: 15px;">Crea una copia de seguridad de toda la información del sistema.</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="createBackup()">
                    📤 Crear Respaldo Ahora
                </button>
                <button class="btn btn-secondary" onclick="exportProductsCSV()">
                    📊 Exportar Inventario (CSV)
                </button>
                <input type="file" id="importInventoryInput" accept=".csv" style="display: none;" onchange="importProductsCSV(this)">
                <button class="btn btn-warning" onclick="document.getElementById('importInventoryInput').click()">
                    📥 Importar Inventario (CSV)
                </button>
            </div>
        </div>
        <div class="settings-section" style="margin-top: 25px;">
            <h4 style="color: var(--gray-100); margin-bottom: 10px;">Restaurar Datos</h4>
            <p style="color: var(--warning-400); margin-bottom: 15px;">⚠️ Esta acción reemplazará todos los datos actuales.</p>
            <button class="btn btn-danger" onclick="restoreBackup()">
                🔄 Restaurar desde archivo
            </button>
        </div>
        <div class="settings-section" style="margin-top: 25px;">
            <h4 style="color: var(--gray-100); margin-bottom: 10px;">Información del Sistema</h4>
            <div style="display: grid; gap: 10px;">
                <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--dark-bg); border-radius: 8px;">
                    <span style="color: var(--gray-400);">Versión</span>
                    <span style="color: var(--gray-200);">1.0.0</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--dark-bg); border-radius: 8px;">
                    <span style="color: var(--gray-400);">Desarrollador</span>
                    <span style="color: var(--gray-200);">SATd3S_soft</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 10px; background: var(--dark-bg); border-radius: 8px;">
                    <span style="color: var(--gray-400);">Última Actualización</span>
                    <span style="color: var(--gray-200);">Diciembre 2024</span>
                </div>
            </div>
        </div>
    `;
}

function getDispositivosContent() {
    return `
        <style>
            .device-card-setting {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 20px;
                background: var(--dark-bg);
                border: 1px solid var(--dark-border);
                border-radius: 12px;
                margin-bottom: 15px;
            }
            .device-card-setting:hover {
                border-color: var(--primary-500);
            }
            .device-icon-setting {
                width: 50px;
                height: 50px;
                background: rgba(59, 130, 246, 0.1);
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.8rem;
            }
            .device-icon-setting.connected { background: rgba(34, 197, 94, 0.1); }
            .device-info-setting { flex: 1; }
            .device-info-setting h4 { margin: 0 0 5px; color: var(--gray-100); }
            .device-status-indicator {
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .device-status-indicator::before {
                content: '';
                width: 8px;
                height: 8px;
                border-radius: 50%;
            }
            .device-status-indicator.connected { color: var(--success-400); }
            .device-status-indicator.connected::before { background: var(--success-400); }
            .device-status-indicator.disconnected { color: var(--gray-400); }
            .device-status-indicator.disconnected::before { background: var(--gray-500); }
            .scale-config-grid-panel {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 12px;
                margin: 15px 0;
            }
            .scale-weight-box {
                background: var(--dark-bg);
                border: 2px solid var(--dark-border);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                margin-top: 15px;
            }
            .scale-weight-value {
                font-size: 2.5rem;
                font-weight: 700;
                color: var(--primary-400);
                font-family: 'Consolas', monospace;
            }
        </style>

        <!-- Impresora -->
        <div class="settings-section">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">🖨️ Impresora de Tickets</h4>
            <div class="device-card-setting">
                <div class="device-icon-setting" id="printerIconPanel">🖨️</div>
                <div class="device-info-setting">
                    <h4>Impresora Térmica</h4>
                    <p class="device-status-indicator disconnected" id="printerStatusPanel">No configurada</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn btn-sm btn-secondary" onclick="detectPrinters()">Detectar</button>
                    <button class="btn btn-sm btn-primary" onclick="testPrinter()">Probar</button>
                </div>
            </div>
            <div class="form-group" style="max-width: 400px;">
                <label>Impresora seleccionada</label>
                <select id="printerSelect" class="form-input" onchange="savePrinterConfig()">
                    <option value="">-- Seleccionar impresora --</option>
                </select>
            </div>
        </div>

        <!-- Escáner -->
        <div class="settings-section" style="margin-top: 25px;">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">📷 Lector de Código de Barras</h4>
            <div class="device-card-setting">
                <div class="device-icon-setting connected">📷</div>
                <div class="device-info-setting">
                    <h4>Lector USB (Modo Teclado)</h4>
                    <p class="device-status-indicator connected">Funciona automáticamente</p>
                </div>
            </div>
            <p style="color: var(--gray-500); font-size: 0.85rem;">
                ℹ️ Los lectores USB en modo teclado no requieren configuración. 
                Simplemente escanea un código en cualquier campo de texto.
            </p>
        </div>

        <!-- Báscula -->
        <div class="settings-section" style="margin-top: 25px;">
            <h4 style="color: var(--gray-100); margin-bottom: 15px;">⚖️ Báscula Digital (Serial)</h4>
            <div class="device-card-setting">
                <div class="device-icon-setting" id="scaleIconPanel">⚖️</div>
                <div class="device-info-setting">
                    <h4>Báscula Serial</h4>
                    <p class="device-status-indicator disconnected" id="scaleStatusPanel">No configurada</p>
                </div>
                <button class="btn btn-sm btn-secondary" onclick="detectSerialPorts()">Detectar Puertos</button>
            </div>

            <div class="scale-config-grid-panel">
                <div class="form-group">
                    <label>Puerto COM</label>
                    <select id="scalePort" class="form-input">
                        <option value="">-- Seleccionar --</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Velocidad (Baudios)</label>
                    <select id="scaleBaudRate" class="form-input">
                        <option value="9600" selected>9600</option>
                        <option value="4800">4800</option>
                        <option value="19200">19200</option>
                        <option value="38400">38400</option>
                        <option value="115200">115200</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bits de datos</label>
                    <select id="scaleDataBits" class="form-input">
                        <option value="8" selected>8</option>
                        <option value="7">7</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Paridad</label>
                    <select id="scaleParity" class="form-input">
                        <option value="N" selected>Ninguna</option>
                        <option value="E">Par</option>
                        <option value="O">Impar</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bits de parada</label>
                    <select id="scaleStopBits" class="form-input">
                        <option value="1" selected>1</option>
                        <option value="2">2</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unidad</label>
                    <select id="scaleUnit" class="form-input">
                        <option value="kg" selected>Kilogramos (kg)</option>
                        <option value="g">Gramos (g)</option>
                        <option value="lb">Libras (lb)</option>
                    </select>
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button class="btn btn-primary" onclick="connectScale()">
                    ⚡ Conectar Báscula
                </button>
                <button class="btn btn-secondary" onclick="disconnectScale()">Desconectar</button>
                <button class="btn btn-ghost" onclick="saveScaleConfig()">Guardar Config</button>
            </div>

            <!-- Área de prueba -->
            <div class="scale-weight-box">
                <div style="color: var(--gray-400); font-size: 0.85rem; margin-bottom: 5px;">PESO ACTUAL</div>
                <div class="scale-weight-value" id="scaleWeightDisplay">
                    0.000 <span style="font-size: 1rem; color: var(--gray-400);">kg</span>
                </div>
                <div style="display: flex; justify-content: center; gap: 15px; margin-top: 10px; font-size: 0.8rem; color: var(--gray-500);">
                    <span id="scaleConnectionStatus">⚪ Desconectada</span>
                    <span id="scaleLastRead">Última lectura: --</span>
                </div>
                <button class="btn btn-sm btn-primary" onclick="readScaleWeight()" style="margin-top: 12px;">
                    Leer Peso
                </button>
            </div>
        </div>
    `;
}

// Mantener compatibilidad con función antigua
function showSettingsTab(tabName) {
    openSettingsPanel(tabName);
}

// ===== Categorías =====
let allCategories = ['Lubricantes', 'Filtros', 'Frenos', 'Suspensión', 'Eléctrico', 'Motor', 'Transmisión', 'Accesorios'];

function loadCategories() {
    const container = document.getElementById('categoriesList');
    if (!container) return;

    container.innerHTML = allCategories.map(cat => `
        <span class="tag">
            ${cat}
            <button class="tag-delete" onclick="deleteCategory('${cat}')" title="Eliminar">×</button>
        </span>
    `).join('');
}

function openCategoryModal() {
    const name = prompt('Nombre de la nueva categoría:');
    if (name && name.trim()) {
        const trimmed = name.trim();
        if (!allCategories.includes(trimmed)) {
            allCategories.push(trimmed);
            loadCategories();
            updateCategoryDropdowns();
            showNotification(`Categoría "${trimmed}" agregada`, 'success');
        } else {
            showNotification('Esta categoría ya existe', 'warning');
        }
    }
}

function deleteCategory(name) {
    if (confirm(`¿Eliminar la categoría "${name}"?`)) {
        allCategories = allCategories.filter(c => c !== name);
        loadCategories();
        updateCategoryDropdowns();
        showNotification(`Categoría "${name}" eliminada`, 'success');
    }
}

function updateCategoryDropdowns() {
    const selects = document.querySelectorAll('#productCategory');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Sin categoría</option>' +
            allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
        select.value = currentValue;
    });
}

// ===== Configuración de Tickets =====
function saveTicketSettings() {
    const settings = {
        ticket_width: document.getElementById('settingsTicketWidth')?.value || '80',
        ticket_font: document.getElementById('settingsTicketFont')?.value || 'normal',
        ticket_header: document.getElementById('settingsTicketHeader')?.value || '',
        ticket_footer: document.getElementById('settingsTicketFooter')?.value || '',
        ticket_show_logo: document.getElementById('settingsTicketShowLogo')?.checked || false,
        ticket_show_rfc: document.getElementById('settingsTicketShowRFC')?.checked || false
    };

    // TODO: Guardar en backend
    showNotification('Configuración de tickets guardada', 'success');
}

// ===== Configuración de Ventas =====
async function saveSalesSettings() {
    // Obtener configuración existente
    const currentSettings = StorageManager.get('appSettings') || {};

    // Actualizar con nuevos valores
    const skipStockCheck = document.getElementById('settingsSkipStockCheck')?.checked || false;
    const allowNegativeStock = document.getElementById('settingsAllowNegativeStock')?.checked || false;

    const newSettings = {
        ...currentSettings,
        iva: parseFloat(document.getElementById('settingsIVA')?.value) || 16,
        maxDiscount: parseFloat(document.getElementById('settingsMaxDiscount')?.value) || 20,
        skipStockCheck: skipStockCheck,
        allowNegativeStock: allowNegativeStock,
        paymentCard: document.getElementById('settingsPaymentCard')?.checked ?? true,
        paymentTransfer: document.getElementById('settingsPaymentTransfer')?.checked ?? true,
        paymentCredit: document.getElementById('settingsPaymentCredit')?.checked || false
    };

    // Guardar en StorageManager (localStorage)
    StorageManager.set('appSettings', newSettings);

    // Sincronizar con backend (config.json) si eel está disponible
    if (typeof eel !== 'undefined' && eel.set_config_value) {
        try {
            // Actualizar config.json para que el backend también respete estas configuraciones
            await eel.set_config_value('sales.check_stock', !skipStockCheck)();
            await eel.set_config_value('sales.allow_negative_stock', allowNegativeStock)();
            console.log('Configuración sincronizada con backend');
        } catch (e) {
            console.warn('No se pudo sincronizar con backend:', e);
        }
    }

    // Log para debug
    console.log('Configuración de ventas guardada:', {
        skipStockCheck: newSettings.skipStockCheck,
        allowNegativeStock: newSettings.allowNegativeStock
    });

    showNotification('Configuración de ventas guardada', 'success');
}

// ===== Dispositivos =====
function configurePrinter() {
    showNotification('Configuración de impresora próximamente', 'info');
}

// ===== Respaldos =====
function createBackup() {
    showNotification('Creando respaldo...', 'info');
    // TODO: Implementar respaldo
    setTimeout(() => {
        showNotification('Respaldo creado exitosamente', 'success');
    }, 1500);
}

function restoreBackup() {
    if (confirm('⚠️ Esta acción reemplazará todos los datos actuales. ¿Continuar?')) {
        showNotification('Función de restauración próximamente', 'info');
    }
}

// ===== Utilidades =====
function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) {
        console.log(`[${type}] ${message}`);
        return;
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 4000);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('active');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('active');
}

// ===== Variables de productos =====
var allProducts = allProducts || [];

// ===== Funciones de Productos =====
function openProductModal(productId = null) {
    const modal = document.getElementById('productModal');
    const title = document.getElementById('productModalTitle');
    const form = document.getElementById('productForm');

    if (!modal || !form) {
        console.error('productModal o productForm no encontrado en el DOM');
        showNotification('Error: Modal de producto no disponible', 'error');
        return;
    }

    // Limpiar formulario
    form.reset();

    const productIdInput = document.getElementById('productId');
    const productMargin = document.getElementById('productMargin');

    if (productIdInput) productIdInput.value = '';
    if (productMargin) {
        productMargin.textContent = '0%';
        productMargin.classList.remove('negative');
    }

    if (productId) {
        // Modo edición
        title.textContent = 'Editar Producto';
        const product = allProducts.find(p => p.id == productId);
        if (product) {
            document.getElementById('productId').value = product.id;
            document.getElementById('productCode').value = product.code || '';
            document.getElementById('productPartNumber').value = product.part_number || product.partNumber || '';
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productCategory').value = product.category || '';

            // Campos opcionales
            const supplierInput = document.getElementById('productSupplier');
            if (supplierInput) supplierInput.value = product.supplier || '';

            document.getElementById('productStock').value = product.stock || 0;
            document.getElementById('productMinStock').value = product.min_stock || product.minStock || 5;
            document.getElementById('productCost').value = product.cost || product.purchase_cost || 0;
            document.getElementById('productPrice').value = product.public_price || product.publicPrice || 0;
            document.getElementById('productNotes').value = product.notes || '';

            // Cargar unidad de venta
            const unitSelect = document.getElementById('productUnit');
            if (unitSelect) {
                unitSelect.value = product.unit || 'pieza';
            }

            calculateMargin();
        }
    } else {
        // Modo nuevo
        title.textContent = 'Nuevo Producto';
    }

    openModal('productModal');

    // Focus en el primer campo
    setTimeout(() => {
        const codeInput = document.getElementById('productCode');
        codeInput.focus();

        // Agregar listener para búsqueda en catálogo (solo si no existe ya)
        if (!codeInput.hasAttribute('data-catalog-listener')) {
            codeInput.setAttribute('data-catalog-listener', 'true');

            // Debounce para no hacer muchas consultas
            let catalogTimeout;
            codeInput.addEventListener('input', (e) => {
                clearTimeout(catalogTimeout);
                const codigo = e.target.value.trim();

                // Solo buscar si el código tiene suficientes dígitos (típico de códigos de barras)
                if (codigo.length >= 8) {
                    catalogTimeout = setTimeout(() => {
                        buscarEnCatalogo(codigo);
                    }, 300);
                }
            });

            // También buscar al perder el foco
            codeInput.addEventListener('blur', (e) => {
                const codigo = e.target.value.trim();
                if (codigo.length >= 8) {
                    buscarEnCatalogo(codigo);
                }
            });
        }
    }, 100);
}

// Función para buscar en el catálogo de abarrotes
async function buscarEnCatalogo(codigo) {
    // Si ya tiene nombre, no sobrescribir
    const nombreInput = document.getElementById('productName');
    if (nombreInput.value.trim()) return;

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.buscar_catalogo_por_codigo(codigo)();

            if (result.success && result.encontrado && result.data) {
                // Autocompletar campos
                nombreInput.value = result.data.nombre || '';

                // Llenar categoría si existe
                const catSelect = document.getElementById('productCategory');
                if (catSelect && result.data.categoria) {
                    // Intentar seleccionar la categoría
                    const options = catSelect.querySelectorAll('option');
                    let found = false;
                    options.forEach(opt => {
                        if (opt.value.toLowerCase() === result.data.categoria.toLowerCase() ||
                            opt.textContent.toLowerCase() === result.data.categoria.toLowerCase()) {
                            catSelect.value = opt.value;
                            found = true;
                        }
                    });

                    // Si no existe como opción, crear una nueva
                    if (!found) {
                        const newOption = document.createElement('option');
                        newOption.value = result.data.categoria;
                        newOption.textContent = result.data.categoria;
                        catSelect.appendChild(newOption);
                        catSelect.value = result.data.categoria;
                    }
                }

                // Mostrar marca en notas o proveedor
                const notesInput = document.getElementById('productNotes');
                if (notesInput && result.data.marca && !notesInput.value) {
                    notesInput.value = `Marca: ${result.data.marca}`;
                }

                showNotification(`✨ Producto encontrado: ${result.data.nombre}`, 'success');

                // Mover foco al precio (para que complete los datos restantes)
                document.getElementById('productCost').focus();
            }
        }
    } catch (e) {
        console.log('Error buscando en catálogo:', e);
    }
}

// ===== FUNCIONES DE BÚSQUEDA EN CATÁLOGO =====

// Abrir modal de búsqueda en catálogo
function openCatalogSearch() {
    openModal('catalogSearchModal');
    setTimeout(() => {
        const input = document.getElementById('catalogSearchInput');
        if (input) {
            input.value = '';
            input.focus();
        }
        // Resetear resultados
        document.getElementById('catalogSearchResults').innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-500);">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
                <p>Escribe para buscar productos del catálogo</p>
            </div>
        `;
    }, 100);
}

// Buscar en catálogo
let catalogSearchTimeout;
async function searchInCatalog(query) {
    clearTimeout(catalogSearchTimeout);

    const resultsContainer = document.getElementById('catalogSearchResults');

    if (query.length < 3) {
        resultsContainer.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray-500);">
                <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
                <p>Escribe al menos 3 caracteres para buscar</p>
            </div>
        `;
        return;
    }

    // Mostrar cargando
    resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--gray-500);">
            <div style="font-size: 2rem; animation: pulse 1s infinite;">⏳</div>
            <p>Buscando...</p>
        </div>
    `;

    // Debounce
    catalogSearchTimeout = setTimeout(async () => {
        try {
            if (typeof eel !== 'undefined') {
                const result = await eel.buscar_catalogo_por_nombre(query)();

                if (result.success && result.data && result.data.length > 0) {
                    let html = '';
                    result.data.forEach((item, index) => {
                        const icon = getCategoryIcon(item.categoria);
                        html += `
                            <div class="catalog-result-item" onclick="selectCatalogProduct('${item.codigo}', '${escapeHtml(item.nombre)}', '${item.categoria || ''}', '${item.marca || ''}')">
                                <div class="catalog-result-icon">${icon}</div>
                                <div class="catalog-result-info">
                                    <div class="catalog-result-name">${item.nombre}</div>
                                    <div class="catalog-result-details">
                                        ${item.categoria || 'Sin categoría'} ${item.marca ? '• ' + item.marca : ''}
                                    </div>
                                </div>
                                <div class="catalog-result-action">Seleccionar →</div>
                            </div>
                        `;
                    });
                    resultsContainer.innerHTML = html;
                } else {
                    resultsContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: var(--gray-500);">
                            <div style="font-size: 3rem; margin-bottom: 10px;">😕</div>
                            <p>No se encontraron productos con "${query}"</p>
                            <p style="font-size: 0.8rem; margin-top: 10px;">Puedes agregar el producto manualmente</p>
                        </div>
                    `;
                }
            }
        } catch (e) {
            console.error('Error buscando en catálogo:', e);
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--danger-400);">
                    <div style="font-size: 3rem; margin-bottom: 10px;">❌</div>
                    <p>Error al buscar en el catálogo</p>
                </div>
            `;
        }
    }, 300);
}

// Obtener ícono de categoría
function getCategoryIcon(categoria) {
    const icons = {
        'Bebidas': '🥤',
        'Lácteos': '🥛',
        'Botanas': '🍿',
        'Dulces': '🍬',
        'Galletas': '🍪',
        'Pan': '🍞',
        'Cereales': '🥣',
        'Enlatados': '🥫',
        'Limpieza': '🧹',
        'Higiene': '🧴',
        'Abarrotes': '🛒',
        'Frutas': '🍎',
        'Verduras': '🥬'
    };
    return icons[categoria] || '📦';
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/'/g, "\\'");
}

// Seleccionar producto del catálogo
function selectCatalogProduct(codigo, nombre, categoria, marca) {
    // Cerrar modal de catálogo
    closeModal('catalogSearchModal');

    // Llenar los campos del formulario de producto
    document.getElementById('productCode').value = codigo;
    document.getElementById('productName').value = nombre;

    // Seleccionar categoría si existe
    const catSelect = document.getElementById('productCategory');
    if (catSelect && categoria) {
        const options = catSelect.querySelectorAll('option');
        let found = false;
        options.forEach(opt => {
            if (opt.value.toLowerCase() === categoria.toLowerCase() ||
                opt.textContent.toLowerCase().includes(categoria.toLowerCase())) {
                catSelect.value = opt.value;
                found = true;
            }
        });
        if (!found && categoria) {
            const newOption = document.createElement('option');
            newOption.value = categoria;
            newOption.textContent = categoria;
            catSelect.appendChild(newOption);
            catSelect.value = categoria;
        }
    }

    // Agregar marca a notas
    const notesInput = document.getElementById('productNotes');
    if (notesInput && marca) {
        notesInput.value = `Marca: ${marca}`;
    }

    showNotification(`✨ Producto seleccionado: ${nombre}`, 'success');

    // Enfocar en el campo de precio de costo
    setTimeout(() => {
        const costInput = document.getElementById('productCost');
        if (costInput) {
            costInput.focus();
            costInput.select();
        }
    }, 200);
}

// Exponer funciones al scope global
window.openCatalogSearch = openCatalogSearch;
window.searchInCatalog = searchInCatalog;
window.selectCatalogProduct = selectCatalogProduct;

// Función para generar código interno para productos sin código de barras
async function generarCodigoInterno() {
    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.generate_internal_code()();

            if (result.success && result.code) {
                document.getElementById('productCode').value = result.code;
                showNotification(`🔢 Código generado: ${result.code}`, 'success');

                // Mover foco al nombre del producto
                document.getElementById('productName').focus();
            } else {
                showNotification('Error al generar código', 'error');
            }
        } else {
            // Modo demo: generar código localmente
            const demoCode = '2' + String(Date.now()).slice(-12);
            document.getElementById('productCode').value = demoCode;
            showNotification(`🔢 Código generado: ${demoCode}`, 'success');
            document.getElementById('productName').focus();
        }
    } catch (e) {
        console.error('Error generando código:', e);
        showNotification('Error al generar código', 'error');
    }
}

function editProduct(productId) {
    openProductDetailModal(productId);
}

// ===== Modal de Detalle de Producto con Gráficas =====
async function openProductDetailModal(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }

    // Crear o reutilizar el modal
    let modal = document.getElementById('productDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Mostrar loading
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8);">
                <h3>📦 ${product.name}</h3>
                <button class="modal-close" onclick="closeModal('productDetailModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 60px;">
                <div style="width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid rgba(255,255,255,0.2); border-top-color: var(--primary-400); border-radius: 50%; animation: spin 1s linear infinite;"></div>
                <p style="color: var(--gray-400);">Cargando estadísticas...</p>
            </div>
        </div>
    `;
    openModal('productDetailModal');

    // Cargar historial de ventas
    let salesData = { stats: { total_sold: 0, total_revenue: 0, transaction_count: 0 }, daily_sales: [], recent_sales: [] };

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.get_product_sales_history(productId)();
            if (result.success) {
                salesData = result.data;
            }
        }
    } catch (e) {
        console.error('Error cargando historial:', e);
    }

    // Calcular margen
    const cost = product.purchase_cost || 0;
    const price = product.public_price || 0;
    const margin = cost > 0 ? ((price - cost) / cost * 100).toFixed(1) : 0;
    const marginClass = margin >= 20 ? 'success' : margin >= 10 ? 'warning' : 'danger';

    // Generar gráfica simple con barras CSS
    const maxQty = Math.max(...salesData.daily_sales.map(d => d.quantity), 1);
    const chartBars = salesData.daily_sales.slice(-14).map(d => {
        const height = (d.quantity / maxQty * 100);
        const dateLabel = new Date(d.date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        return `
            <div class="chart-bar-container" title="${dateLabel}: ${d.quantity} vendidos">
                <div class="chart-bar" style="height: ${height}%;"></div>
                <div class="chart-label">${d.quantity}</div>
            </div>
        `;
    }).join('');

    // Renderizar modal completo
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white;">
                <div>
                    <h3 style="margin: 0;">${product.name}</h3>
                    <span style="opacity: 0.8; font-size: 0.85rem;">${product.code} ${product.brand ? '• ' + product.brand : ''}</span>
                </div>
                <button class="modal-close" onclick="closeModal('productDetailModal')" style="color: white;">&times;</button>
            </div>
            
            <div class="modal-body" style="padding: 0;">
                <!-- Info Cards -->
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--dark-border);">
                    <div style="background: var(--dark-surface); padding: 20px; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: var(--primary-400);">$${price.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 5px;">PRECIO VENTA</div>
                    </div>
                    <div style="background: var(--dark-surface); padding: 20px; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: var(--gray-300);">$${cost.toFixed(2)}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 5px;">COSTO</div>
                    </div>
                    <div style="background: var(--dark-surface); padding: 20px; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: bold;" class="text-${marginClass}">${margin}%</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 5px;">MARGEN</div>
                    </div>
                    <div style="background: var(--dark-surface); padding: 20px; text-align: center;">
                        <div style="font-size: 1.8rem; font-weight: bold; color: ${product.stock <= (product.min_stock || 5) ? 'var(--danger-400)' : 'var(--success-400)'};">${product.stock}</div>
                        <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 5px;">EXISTENCIA</div>
                    </div>
                </div>

                <!-- Stats de Ventas -->
                <div style="padding: 20px; border-bottom: 1px solid var(--dark-border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--gray-300);">📊 Estadísticas de Ventas</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--success-400);">${salesData.stats.total_sold}</div>
                            <div style="font-size: 0.75rem; color: var(--gray-500);">Unidades Vendidas</div>
                        </div>
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary-400);">$${(salesData.stats.total_revenue || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
                            <div style="font-size: 0.75rem; color: var(--gray-500);">Ingresos Totales</div>
                        </div>
                        <div style="background: var(--dark-bg); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 1.5rem; font-weight: bold; color: var(--gray-300);">${salesData.stats.transaction_count}</div>
                            <div style="font-size: 0.75rem; color: var(--gray-500);">Transacciones</div>
                        </div>
                    </div>
                </div>

                <!-- Gráfica de Ventas -->
                <div style="padding: 20px; border-bottom: 1px solid var(--dark-border);">
                    <h4 style="margin: 0 0 15px 0; color: var(--gray-300);">📈 Ventas Últimos 14 Días</h4>
                    ${salesData.daily_sales.length > 0 ? `
                        <div class="simple-chart" style="display: flex; align-items: flex-end; gap: 8px; height: 120px; padding: 10px 0;">
                            ${chartBars}
                        </div>
                    ` : `
                        <div style="text-align: center; padding: 30px; color: var(--gray-500);">
                            <span style="font-size: 2rem;">📭</span>
                            <p>Sin ventas registradas en los últimos 30 días</p>
                        </div>
                    `}
                </div>

                <!-- Últimas Ventas -->
                ${salesData.recent_sales.length > 0 ? `
                    <div style="padding: 20px;">
                        <h4 style="margin: 0 0 15px 0; color: var(--gray-300);">🛒 Últimas Ventas</h4>
                        <div style="max-height: 150px; overflow-y: auto;">
                            <table style="width: 100%; font-size: 0.85rem;">
                                <thead>
                                    <tr style="color: var(--gray-500); border-bottom: 1px solid var(--dark-border);">
                                        <th style="text-align: left; padding: 8px;">Folio</th>
                                        <th style="text-align: center; padding: 8px;">Fecha</th>
                                        <th style="text-align: center; padding: 8px;">Cantidad</th>
                                        <th style="text-align: right; padding: 8px;">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${salesData.recent_sales.map(s => `
                                        <tr style="border-bottom: 1px solid var(--dark-border);">
                                            <td style="padding: 8px; color: var(--primary-400);">${s.folio}</td>
                                            <td style="padding: 8px; text-align: center; color: var(--gray-400);">${new Date(s.created_at).toLocaleDateString('es-MX')}</td>
                                            <td style="padding: 8px; text-align: center;">${s.quantity}</td>
                                            <td style="padding: 8px; text-align: right; color: var(--success-400);">$${(s.subtotal || 0).toFixed(2)}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ` : ''}

                <!-- Info Adicional -->
                <div style="padding: 15px 20px; background: var(--dark-bg); display: flex; gap: 20px; flex-wrap: wrap; font-size: 0.85rem; color: var(--gray-400);">
                    ${product.category ? `<span>📁 ${product.category}</span>` : ''}
                    ${product.supplier ? `<span>🏭 ${product.supplier}</span>` : ''}
                    ${product.location ? `<span>📍 ${product.location}</span>` : ''}
                    ${product.part_number ? `<span>🔢 ${product.part_number}</span>` : ''}
                    <span>📦 Mín: ${product.min_stock || 5}</span>
                </div>
            </div>
            
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: space-between;">
                <button class="btn btn-danger" onclick="confirmDeleteProduct(${productId})" style="flex: 0;">
                    🗑️ Eliminar
                </button>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-ghost" onclick="closeModal('productDetailModal')">
                        Cerrar
                    </button>
                    <button class="btn btn-primary" onclick="closeModal('productDetailModal'); openProductModal(${productId});">
                        ✏️ Editar Producto
                    </button>
                </div>
            </div>
        </div>
    `;

    // Agregar estilos para la gráfica si no existen
    if (!document.getElementById('productDetailStyles')) {
        const style = document.createElement('style');
        style.id = 'productDetailStyles';
        style.textContent = `
            .chart-bar-container {
                flex: 1;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 30px;
            }
            .chart-bar {
                width: 100%;
                max-width: 40px;
                background: linear-gradient(to top, var(--primary-600), var(--primary-400));
                border-radius: 4px 4px 0 0;
                min-height: 4px;
                transition: height 0.3s ease;
            }
            .chart-bar-container:hover .chart-bar {
                background: linear-gradient(to top, var(--primary-500), var(--primary-300));
            }
            .chart-label {
                font-size: 0.7rem;
                color: var(--gray-500);
                margin-top: 4px;
            }
            .text-success { color: var(--success-400); }
            .text-warning { color: var(--warning-400); }
            .text-danger { color: var(--danger-400); }
            @keyframes spin { to { transform: rotate(360deg); } }
        `;
        document.head.appendChild(style);
    }
}

// Confirmar eliminación de producto
async function confirmDeleteProduct(productId) {
    const product = allProducts.find(p => p.id == productId);
    if (!product) return;

    if (!confirm(`¿Estás seguro de eliminar "${product.name}"?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.delete_product(productId)();
            if (result.success) {
                showNotification('Producto eliminado correctamente', 'success');
                closeModal('productDetailModal');
                // Recargar productos
                await loadProducts(true);
            } else {
                showNotification(result.error || 'Error al eliminar', 'error');
            }
        }
    } catch (e) {
        showNotification('Error al eliminar producto', 'error');
    }
}

window.saveProduct = async function () {
    console.log("saveProduct iniciada");
    // alert("Debug: Iniciando guardado - CLICK DETECTADO");
    const productId = document.getElementById('productId').value;
    const code = document.getElementById('productCode').value.trim();
    const name = document.getElementById('productName').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value) || 0;

    // Validaciones
    if (!code) {
        showNotification('El código es requerido', 'error');
        document.getElementById('productCode').focus();
        return;
    }

    if (!name) {
        showNotification('El nombre es requerido', 'error');
        document.getElementById('productName').focus();
        return;
    }

    if (price <= 0) {
        showNotification('El precio debe ser mayor a 0', 'error');
        document.getElementById('productPrice').focus();
        return;
    }

    const productData = {
        code: code,
        part_number: document.getElementById('productPartNumber').value.trim(),
        name: name,
        category: document.getElementById('productCategory').value,
        supplier: document.getElementById('productSupplier') ? document.getElementById('productSupplier').value.trim() : '',
        stock: parseInt(document.getElementById('productStock').value) || 0,
        min_stock: parseInt(document.getElementById('productMinStock').value) || 5,
        purchase_cost: parseFloat(document.getElementById('productCost').value) || 0,
        public_price: price,
        unit: document.getElementById('productUnit')?.value || 'pieza',
        notes: document.getElementById('productNotes').value.trim()
    };

    // Incluir ID si es edición
    if (productId) {
        productData.id = parseInt(productId);
    }

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.save_product(productData)();

            if (result.success) {
                showNotification(productId ? 'Producto actualizado' : 'Producto creado', 'success');
                closeModal('productModal');

                // Recargar productos
                await loadProducts();

                // Manejo de retorno a Compra Rápida
                if (isQuickAddingToPurchase && quickAddRowId) {
                    const newId = productId ? parseInt(productId) : result.id;
                    const newProduct = allProducts.find(p => p.id === newId);

                    if (newProduct) {
                        selectPurchaseProduct(quickAddRowId, newProduct);
                        // Enfocar el campo cantidad
                        setTimeout(() => {
                            const qtyInput = document.getElementById(`purchase-qty-${quickAddRowId}`);
                            if (qtyInput) {
                                qtyInput.focus();
                                qtyInput.select();
                            }
                        }, 200);
                    }

                    isQuickAddingToPurchase = false;
                    quickAddRowId = null;
                }
            } else {
                showNotification(result.error || 'Error al guardar', 'error');
            }
        } else {
            // Modo demo - guardar en memoria
            if (productId) {
                const index = allProducts.findIndex(p => p.id == productId);
                if (index !== -1) {
                    allProducts[index] = { ...allProducts[index], ...productData };
                }
            } else {
                productData.id = Date.now();
                allProducts.push(productData);
            }
            showNotification(productId ? 'Producto actualizado (demo)' : 'Producto creado (demo)', 'success');
            closeModal('productModal');
            renderProductsTable(allProducts);
        }
    } catch (e) {
        console.error('Error guardando producto:', e);
        showNotification('Error al guardar el producto', 'error');
    }
}

function deleteProduct(productId) {
    if (!confirm('¿Está seguro de eliminar este producto?')) {
        return;
    }

    // TODO: Implementar eliminación
    showNotification('Producto eliminado', 'success');
    loadProducts();
}

function calculateMargin() {
    const cost = parseFloat(document.getElementById('productCost').value) || 0;
    const price = parseFloat(document.getElementById('productPrice').value) || 0;
    const marginEl = document.getElementById('productMargin');

    if (cost > 0 && price > 0) {
        const margin = ((price - cost) / cost) * 100;
        marginEl.textContent = `${margin.toFixed(1)}%`;
        marginEl.classList.toggle('negative', margin < 0);
    } else if (price > 0 && cost === 0) {
        marginEl.textContent = '100%';
        marginEl.classList.remove('negative');
    } else {
        marginEl.textContent = '0%';
        marginEl.classList.remove('negative');
    }
}

function filterProducts(query) {
    if (!query || query.length < 2) {
        renderProductsTable(allProducts);
        return;
    }

    const q = query.toLowerCase();
    const filtered = allProducts.filter(p =>
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.part_number && p.part_number.toLowerCase().includes(q))
    );

    renderProductsTable(filtered);
}

// Función cuando cambia la unidad de venta
function onUnitChange() {
    const unit = document.getElementById('productUnit')?.value || 'pieza';

    // Buscar el label de Stock en el formulario
    const stockGroup = document.getElementById('productStock')?.closest('.form-group');
    const stockLabel = stockGroup?.querySelector('label');

    // Actualizar label según la unidad
    if (stockLabel) {
        if (unit === 'peso') {
            stockLabel.textContent = 'Stock (Kg)';
        } else {
            stockLabel.textContent = 'Stock';
        }
    }
}

// ===== Funciones de Movimientos/Compras =====
var purchaseProducts = purchaseProducts || [];
var allMovements = allMovements || [];

function openPurchaseModal() {
    // Limpiar datos previos
    purchaseProducts = [];
    document.getElementById('purchaseProductsBody').innerHTML = '';
    document.getElementById('purchaseTotal').textContent = '$0.00';
    document.getElementById('purchaseFolio').value = '';
    document.getElementById('purchaseNotes').value = '';

    // Fecha de hoy
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchaseDate').value = today;

    // Llenar select de proveedores
    const supplierSelect = document.getElementById('purchaseSupplier');
    supplierSelect.innerHTML = '<option value="">Seleccionar proveedor...</option>';
    allSuppliers.forEach(s => {
        supplierSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
    });

    // Agregar primera fila de producto
    addPurchaseProductRow();

    openModal('purchaseModal');
}

function addPurchaseProductRow() {
    const tbody = document.getElementById('purchaseProductsBody');
    const rowId = Date.now();

    // Crear opciones de productos
    let productOptions = '<option value="">Seleccionar...</option>';
    allProducts.forEach(p => {
        productOptions += `<option value="${p.id}" data-code="${p.code}">${p.code} - ${p.name}</option>`;
    });

    const row = document.createElement('tr');
    row.id = `purchase-row-${rowId}`;
    row.innerHTML = `
        <td>
            <select onchange="onPurchaseProductChange(${rowId})" id="purchase-product-${rowId}">
                ${productOptions}
            </select>
        </td>
        <td>
            <input type="number" min="1" value="1" id="purchase-qty-${rowId}" onchange="updatePurchaseTotal()">
        </td>
        <td>
            <input type="number" step="0.01" min="0" value="0.00" id="purchase-cost-${rowId}" onchange="updatePurchaseTotal()">
        </td>
        <td id="purchase-subtotal-${rowId}">$0.00</td>
        <td>
            <button class="btn-delete-row" onclick="removePurchaseRow(${rowId})" title="Eliminar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </td>
    `;

    tbody.appendChild(row);
}

// ===== Funciones de Compras Avanzadas (Búsqueda inteligente) =====
let isQuickAddingToPurchase = false;
let quickAddRowId = null;

// Inyectar estilos para el buscador si no existen
if (!document.getElementById('search-styles')) {
    const style = document.createElement('style');
    style.id = 'search-styles';
    style.textContent = `
        .search-container {
            position: relative;
            width: 100%;
        }
        .product-search-input {
            width: 100%;
            padding-right: 30px; /* Espacio para el icono X si se agrega */
        }
        .search-results {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #1e293b; /* Color de fondo oscuro */
            border: 1px solid #334155;
            border-radius: 0 0 6px 6px;
            max-height: 250px;
            overflow-y: auto;
            z-index: 1050; /* Mayor que el modal */
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        }
        .search-result-item {
            padding: 10px 12px;
            cursor: pointer;
            border-bottom: 1px solid #334155;
            color: #f8fafc;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .search-result-item:last-child {
            border-bottom: none;
        }
        .search-result-item:hover, .search-result-item.selected {
            background-color: #334155;
        }
        .search-result-code {
            font-weight: bold;
            color: #60a5fa; /* Azul claro */
            margin-right: 8px;
        }
        .search-result-stock {
            font-size: 0.8em;
            color: #94a3b8;
        }
        .search-no-result {
            padding: 12px;
            text-align: center;
            color: #94a3b8;
        }
        .btn-quick-create {
            display: block;
            width: 100%;
            padding: 8px;
            background: #0f172a;
            color: #60a5fa;
            text-align: center;
            font-weight: 500;
            cursor: pointer;
            border-top: 1px solid #334155;
        }
        .btn-quick-create:hover {
            background: #1e293b;
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);
}

// Global para cerrar resultados al hacer clic fuera
document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-container')) {
        document.querySelectorAll('.search-results').forEach(el => el.style.display = 'none');
    }
});

function addPurchaseProductRow() {
    const tbody = document.getElementById('purchaseProductsBody');
    const rowId = Date.now();

    const row = document.createElement('tr');
    row.id = `purchase-row-${rowId}`;
    row.innerHTML = `
        <td style="position: relative; overflow: visible;">
            <div class="search-container">
                <input type="text" 
                       class="form-input product-search-input" 
                       id="purchase-search-${rowId}" 
                       placeholder="Buscar por nombre o código..." 
                       oninput="searchPurchaseProduct(this, ${rowId})"
                       onfocus="searchPurchaseProduct(this, ${rowId})"
                       autocomplete="off">
                <input type="hidden" id="purchase-product-${rowId}">
                <div id="results-${rowId}" class="search-results" style="display:none;"></div>
            </div>
        </td>
        <td>
            <input type="number" min="1" value="1" class="form-input" id="purchase-qty-${rowId}" onchange="updatePurchaseTotal()">
        </td>
        <td>
            <input type="number" step="0.01" min="0" value="0.00" class="form-input" id="purchase-cost-${rowId}" onchange="updatePurchaseTotal()">
        </td>
        <td id="purchase-subtotal-${rowId}" style="vertical-align: middle; font-weight: bold;">$0.00</td>
        <td>
            <button class="btn-icon" onclick="removePurchaseRow(${rowId})" title="Eliminar" style="color: #ef4444;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </td>
    `;

    tbody.appendChild(row);

    // Focus en el nuevo input
    setTimeout(() => {
        const input = document.getElementById(`purchase-search-${rowId}`);
        if (input) input.focus();
    }, 100);
}

function searchPurchaseProduct(input, rowId) {
    const term = input.value.toLowerCase().trim();
    const resultsDiv = document.getElementById(`results-${rowId}`);

    // Si está vacío, ocultar
    if (!term) {
        resultsDiv.style.display = 'none';
        return;
    }

    // Filtrar productos
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.code.toLowerCase().includes(term) ||
        (p.part_number && p.part_number.toLowerCase().includes(term))
    ).slice(0, 10); // Limitar a 10 resultados

    resultsDiv.innerHTML = '';
    resultsDiv.style.display = 'block';

    if (filtered.length > 0) {
        filtered.forEach(p => {
            const div = document.createElement('div');
            div.className = 'search-result-item';
            div.innerHTML = `
                <div>
                    <span class="search-result-code">${p.code}</span>
                    <span>${p.name}</span>
                </div>
                <div class="search-result-stock">Stock: ${p.stock || 0}</div>
            `;
            div.onclick = () => selectPurchaseProduct(rowId, p);
            resultsDiv.appendChild(div);
        });
    }

    // Opción para crear nuevo si no existe coincidencia exacta
    // O siempre mostrarla al final si hay pocos resultados
    const exactMatch = filtered.find(p => p.code.toLowerCase() === term || p.name.toLowerCase() === term);

    if (!exactMatch) {
        const createDiv = document.createElement('div');
        createDiv.className = 'btn-quick-create';
        createDiv.innerHTML = `+ Crear nuevo: "${input.value}"`;
        createDiv.onclick = () => quickCreateFromPurchase(input.value, rowId);
        resultsDiv.appendChild(createDiv);
    }

    if (filtered.length === 0 && exactMatch) {
        // Si hay coincidencia exacta y es la única, ya se muestra arriba, no hacemos nada más
    } else if (filtered.length === 0 && !exactMatch) {
        resultsDiv.innerHTML = `
            <div class="search-no-result">No encontrado</div>
            <div class="btn-quick-create" onclick="quickCreateFromPurchase('${input.value}', ${rowId})">
                + Crear nuevo: "${input.value}"
            </div>
         `;
    }
}

function selectPurchaseProduct(rowId, product) {
    document.getElementById(`purchase-search-${rowId}`).value = product.name;
    document.getElementById(`purchase-product-${rowId}`).value = product.id;
    document.getElementById(`results-${rowId}`).style.display = 'none';

    // Auto-llenar costo si existe historial (usar purchase_cost)
    if (product.purchase_cost) {
        document.getElementById(`purchase-cost-${rowId}`).value = product.purchase_cost;
    }

    updatePurchaseTotal();
}

function quickCreateFromPurchase(name, rowId) {
    isQuickAddingToPurchase = true;
    quickAddRowId = rowId;

    // Cerrar resultados
    document.getElementById(`results-${rowId}`).style.display = 'none';

    // Abrir modal de producto
    // Nota: El modal purchaseModal se mantiene abierto debajo (z-index)

    // Usar la función existente para abrir modal de producto
    // pasando el nombre predefinido si es posible
    if (typeof openProductModal === 'function') {
        openProductModal();

        // Pre-llenar datos después de que se abra
        setTimeout(() => {
            document.getElementById('productName').value = name;
            // Generar un código sugerido si es posible, o dejar vacío

            // Indicar visualmente que es creación rápida
            const title = document.getElementById('productModalTitle');
            if (title) title.textContent = "Nuevo Producto (para Compra)";
        }, 200);
    }
}

function onPurchaseProductChange(rowId) {
    // Ya no se usa con el nuevo buscador, pero mantengo por compatibilidad si algo llama
}

function removePurchaseRow(rowId) {
    const row = document.getElementById(`purchase-row-${rowId}`);
    if (row) {
        row.remove();
        updatePurchaseTotal();
    }
}

function updatePurchaseTotal() {
    const tbody = document.getElementById('purchaseProductsBody');
    const rows = tbody.querySelectorAll('tr');
    let total = 0;

    rows.forEach(row => {
        const rowId = row.id.replace('purchase-row-', '');
        const qty = parseFloat(document.getElementById(`purchase-qty-${rowId}`)?.value) || 0;
        const cost = parseFloat(document.getElementById(`purchase-cost-${rowId}`)?.value) || 0;
        const subtotal = qty * cost;

        const subtotalEl = document.getElementById(`purchase-subtotal-${rowId}`);
        if (subtotalEl) {
            subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
        }

        total += subtotal;
    });

    document.getElementById('purchaseTotal').textContent = `$${total.toFixed(2)}`;
}

async function savePurchase() {
    const supplierId = document.getElementById('purchaseSupplier').value;
    const folio = document.getElementById('purchaseFolio').value.trim();
    const date = document.getElementById('purchaseDate').value;
    const notes = document.getElementById('purchaseNotes').value.trim();

    if (!supplierId) {
        showNotification('Selecciona un proveedor', 'error');
        return;
    }

    // Recopilar productos
    const tbody = document.getElementById('purchaseProductsBody');
    const rows = tbody.querySelectorAll('tr');
    const items = [];

    rows.forEach(row => {
        const rowId = row.id.replace('purchase-row-', '');
        const productId = document.getElementById(`purchase-product-${rowId}`)?.value;
        const qty = parseInt(document.getElementById(`purchase-qty-${rowId}`)?.value) || 0;
        const cost = parseFloat(document.getElementById(`purchase-cost-${rowId}`)?.value) || 0;

        if (productId && qty > 0) {
            const product = allProducts.find(p => p.id == productId);
            items.push({
                product_id: parseInt(productId),
                product_name: product?.name || 'Desconocido',
                product_code: product?.code || '',
                quantity: qty,
                unit_cost: cost
            });
        }
    });

    if (items.length === 0) {
        showNotification('Agrega al menos un producto con cantidad válida', 'error');
        return;
    }

    // Obtener nombre del proveedor
    const supplier = allSuppliers.find(s => s.id == supplierId);
    const supplierName = supplier?.name || 'Desconocido';

    // Datos de la compra
    const purchaseData = {
        supplier_id: parseInt(supplierId),
        supplier_name: supplierName,
        folio: folio || `ENT-${Date.now()}`,
        purchase_date: date,
        notes: notes,
        user: 'Admin',
        items: items
    };

    try {
        // Intentar guardar en backend
        if (typeof eel !== 'undefined') {
            const result = await eel.create_purchase(purchaseData)();

            if (result.success) {
                showNotification(result.message, 'success');
                closeModal('purchaseModal');

                // Recargar productos (stock actualizado) y movimientos
                await loadProducts();
                await loadPurchases();

                // Actualizar proveedores también
                await loadSuppliers();
            } else {
                showNotification('Error: ' + result.error, 'error');
            }
        } else {
            // Modo demo/offline - guardar en memoria
            const total = items.reduce((sum, p) => sum + (p.quantity * p.unit_cost), 0);

            const movement = {
                id: Date.now(),
                type: 'entrada',
                date: date,
                folio: purchaseData.folio,
                supplier_id: supplierId,
                supplier_name: supplierName,
                products: items,
                total: total,
                notes: notes,
                user: 'Admin'
            };

            allMovements.unshift(movement);

            // Actualizar stock en memoria
            items.forEach(item => {
                const productIndex = allProducts.findIndex(p => p.id == item.product_id);
                if (productIndex !== -1) {
                    allProducts[productIndex].stock = (allProducts[productIndex].stock || 0) + item.quantity;
                    allProducts[productIndex].purchase_cost = item.unit_cost;
                }
            });

            showNotification(`Compra registrada (modo demo): ${items.length} productos, Total: $${total.toFixed(2)}`, 'success');
            closeModal('purchaseModal');
            renderMovementsTable(allMovements);
        }
    } catch (e) {
        console.error('Error guardando compra:', e);
        showNotification('Error al guardar la compra: ' + e.message, 'error');
    }
}

// Función para cargar compras del backend
async function loadPurchases() {
    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.get_purchases({ limit: 50 })();
            if (result.success) {
                allMovements = result.data.map(p => ({
                    id: p.id,
                    type: 'entrada',
                    date: p.purchase_date,
                    folio: p.folio,
                    supplier_id: p.supplier_id,
                    supplier_name: p.supplier_name,
                    products_count: p.items_count,
                    total: p.total,
                    notes: p.notes,
                    user: p.user,
                    status: p.status
                }));
            }
        }
        renderPurchasesTable(allMovements);
    } catch (e) {
        console.error('Error cargando compras:', e);
    }
}

// Renderizar tabla de compras/movimientos
function renderPurchasesTable(purchases) {
    let tbody = null;
    const activeView = document.querySelector('.tab-view[data-module="movements"].active');
    if (activeView) {
        tbody = activeView.querySelector('tbody');
    }
    if (!tbody) {
        tbody = document.getElementById('movementsTableBody');
    }
    if (!tbody) {
        console.warn('movementsTableBody no encontrado');
        return;
    }

    if (!purchases || purchases.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray-500);">
                    No hay movimientos registrados
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = purchases.map(p => {
        const date = p.date ? new Date(p.date).toLocaleDateString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric'
        }) : '-';
        const typeClass = p.type === 'entrada' ? 'success' : p.type === 'salida' ? 'danger' : 'warning';
        const typeLabel = p.type === 'entrada' ? 'Entrada' : p.type === 'salida' ? 'Salida' : 'Ajuste';
        const statusBadge = p.status === 'cancelled' ? '<span class="badge danger" style="margin-left: 5px;">Cancelada</span>' : '';

        return `
            <tr class="${p.status === 'cancelled' ? 'row-cancelled' : ''}">
                <td>${date}</td>
                <td><span class="badge ${typeClass}">${typeLabel}</span>${statusBadge}</td>
                <td><code>${p.folio || '-'}</code></td>
                <td>${p.supplier_name || '-'}</td>
                <td>${p.products_count || p.products?.length || '-'}</td>
                <td>$${(p.total || 0).toFixed(2)}</td>
                <td>${p.user || '-'}</td>
            </tr>
        `;
    }).join('');
}

function openOutputModal() {
    // Limpiar formulario
    document.getElementById('outputForm').reset();
    document.getElementById('outputProductId').value = '';
    document.getElementById('outputProductSearch').value = '';
    document.getElementById('outputProductResults').style.display = 'none';
    document.getElementById('outputSelectedProduct').style.display = 'none';

    openModal('outputModal');

    // Focus en el buscador
    setTimeout(() => {
        document.getElementById('outputProductSearch').focus();
    }, 100);
}

// Variable temporal para el producto seleccionado
let selectedOutputProduct = null;

async function searchProductsForOutput(query) {
    const resultsDiv = document.getElementById('outputProductResults');

    if (query.length < 2) {
        resultsDiv.style.display = 'none';
        return;
    }

    try {
        const result = await eel.search_products(query)();

        if (result && result.success && result.data.length > 0) {
            resultsDiv.innerHTML = result.data.slice(0, 10).map(p => `
                <div class="search-result-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid var(--dark-border);"
                     onclick="selectOutputProduct(${p.id}, '${p.name.replace(/'/g, "\\'")}', ${p.stock || 0})"
                     onmouseover="this.style.background='var(--dark-surface)'"
                     onmouseout="this.style.background='transparent'">
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--gray-200);">${p.code || ''} - ${p.name}</span>
                        <span style="color: var(--primary-400);">Stock: ${p.stock || 0}</span>
                    </div>
                </div>
            `).join('');
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = '<div style="padding: 10px; color: var(--gray-500); text-align: center;">Sin resultados</div>';
            resultsDiv.style.display = 'block';
        }
    } catch (error) {
        console.error('Error buscando productos:', error);
    }
}

function selectOutputProduct(productId, productName, stock) {
    selectedOutputProduct = { id: productId, name: productName, stock: stock };

    document.getElementById('outputProductId').value = productId;
    document.getElementById('outputProductSearch').value = '';
    document.getElementById('outputProductResults').style.display = 'none';

    // Mostrar producto seleccionado
    document.getElementById('outputProductName').textContent = productName;
    document.getElementById('outputCurrentStock').textContent = stock;
    document.getElementById('outputSelectedProduct').style.display = 'block';

    // Focus en cantidad
    document.getElementById('outputQuantity').focus();
}

function clearOutputProduct() {
    selectedOutputProduct = null;
    document.getElementById('outputProductId').value = '';
    document.getElementById('outputSelectedProduct').style.display = 'none';
    document.getElementById('outputProductSearch').focus();
}

async function saveOutputMovement() {
    const productId = document.getElementById('outputProductId').value;
    const movementType = document.querySelector('input[name="outputType"]:checked').value;
    const quantity = parseInt(document.getElementById('outputQuantity').value) || 0;
    const reason = document.getElementById('outputReason').value;
    const notes = document.getElementById('outputNotes').value;

    // Validaciones
    if (!productId) {
        showNotification('Seleccione un producto', 'error');
        return;
    }

    if (quantity <= 0) {
        showNotification('La cantidad debe ser mayor a 0', 'error');
        return;
    }

    // Validar stock para salidas
    if (movementType === 'exit' && selectedOutputProduct && quantity > selectedOutputProduct.stock) {
        showNotification(`Stock insuficiente. Disponible: ${selectedOutputProduct.stock}`, 'error');
        return;
    }

    try {
        const movementData = {
            product_id: parseInt(productId),
            type: movementType,
            quantity: quantity,
            reason: reason || (movementType === 'exit' ? 'Salida manual' : 'Ajuste de inventario'),
            notes: notes,
            user: (typeof currentUser !== 'undefined' && currentUser) ? currentUser.name : 'Sistema'
        };

        const result = await eel.create_movement(movementData)();

        if (result && result.success) {
            closeModal('outputModal');
            showNotification(result.message || 'Movimiento registrado exitosamente', 'success');

            // Recargar movimientos si estamos en esa vista
            if (typeof loadMovements === 'function') {
                loadMovements();
            }
        } else {
            showNotification(result.error || 'Error al registrar movimiento', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al registrar movimiento', 'error');
    }
}

// Exponer funciones globalmente
window.openOutputModal = openOutputModal;
window.searchProductsForOutput = searchProductsForOutput;
window.selectOutputProduct = selectOutputProduct;
window.clearOutputProduct = clearOutputProduct;
window.saveOutputMovement = saveOutputMovement;

function filterMovements(type) {
    // Actualizar botones activos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');

    if (type === 'all') {
        renderMovementsTable(allMovements);
    } else {
        const filtered = allMovements.filter(m => m.type === type);
        renderMovementsTable(filtered);
    }
}

// Exponer globalmente
window.initDashboard = initDashboard;
window.initProductsModule = initProductsModule;
window.initMovementsModule = initMovementsModule;
window.initSuppliersModule = initSuppliersModule;
window.initReportsModule = initReportsModule;
window.initSettingsModule = initSettingsModule;
window.showNotification = showNotification;
window.openModal = openModal;
window.closeModal = closeModal;
window.filterProducts = filterProducts;
window.generateSalesReport = generateSalesReport;
window.executeSalesReport = executeSalesReport;
window.generateInventoryReport = generateInventoryReport;
window.generateProfitReport = generateProfitReport;
window.generateSupplierComparison = generateSupplierComparison;
window.hideReportResults = hideReportResults;
window.saveCompanySettings = saveCompanySettings;
window.openProductModal = openProductModal;
window.editProduct = editProduct;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.calculateMargin = calculateMargin;
window.loadProducts = loadProducts;
window.openMovementModal = typeof openAddMovementModal !== 'undefined' ? openAddMovementModal : function () { console.warn('openMovementModal no disponible'); };
window.openSupplierModal = openSupplierModal;

// Funciones de Proveedores
window.loadSuppliers = loadSuppliers;
window.viewSupplierDetails = viewSupplierDetails;
window.editSupplier = editSupplier;
window.saveSupplier = saveSupplier;

// Funciones de Ajustes
window.showSettingsTab = showSettingsTab;
window.openSettingsPanel = openSettingsPanel;
window.closeSettingsPanel = closeSettingsPanel;
window.selectThemeColor = selectThemeColor;
window.selectThemeMode = selectThemeMode;
window.saveAppearanceSettings = saveAppearanceSettings;
window.loadCategories = loadCategories;
window.openCategoryModal = openCategoryModal;
window.deleteCategory = deleteCategory;
window.saveTicketSettings = saveTicketSettings;
window.saveSalesSettings = saveSalesSettings;
window.configurePrinter = configurePrinter;
window.createBackup = createBackup;
window.restoreBackup = restoreBackup;
window.getDispositivosContent = getDispositivosContent;

// Funciones de Compras/Movimientos
window.openPurchaseModal = openPurchaseModal;
window.addPurchaseProductRow = addPurchaseProductRow;
window.removePurchaseRow = removePurchaseRow;
window.onPurchaseProductChange = onPurchaseProductChange;
window.updatePurchaseTotal = updatePurchaseTotal;
window.savePurchase = savePurchase;
window.loadPurchases = loadPurchases;
window.openOutputModal = openOutputModal;
window.filterMovements = filterMovements;

// Nuevas funciones de búsqueda inteligente
window.searchPurchaseProduct = searchPurchaseProduct;
window.selectPurchaseProduct = selectPurchaseProduct; // Necesaria para el onclick inyectado
window.quickCreateFromPurchase = quickCreateFromPurchase;

// Funciones de Departamentos (dentro de Productos)
window.showProductsTab = showProductsTab;
window.loadDepartments = loadDepartments;
window.openDepartmentModal = openDepartmentModal;
window.selectDeptIcon = selectDeptIcon;
window.selectDeptColor = selectDeptColor;
window.saveDepartment = saveDepartment;
window.editDepartment = editDepartment;
window.deleteDepartment = deleteDepartment;

// Funciones de generación de códigos y catálogo
window.generarCodigoInterno = generarCodigoInterno;
window.buscarEnCatalogo = buscarEnCatalogo;
window.onUnitChange = onUnitChange;
