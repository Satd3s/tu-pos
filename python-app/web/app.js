// ===== Data Storage =====
// NOTA: StorageManager está definido en storage-manager.js - NO duplicar aquí
// La clase StorageManager completa (con soporte para backend Python) se carga primero


// ===== Initialize Default Data =====
function initializeDefaultData() {
    // Initialize users if not exists
    if (!StorageManager.get('users')) {
        const defaultUsers = [
            {
                id: 'user_1',
                username: 'admin',
                password: 'admin123',
                fullName: 'Administrador',
                role: 'admin',
                active: true
            },
            {
                id: 'user_2',
                username: 'usuario',
                password: 'user123',
                fullName: 'Usuario Regular',
                role: 'usuario',
                active: true
            }
        ];
        StorageManager.set('users', defaultUsers);
    }

    // Initialize products if not exists - start with empty array
    if (!StorageManager.get('products')) {
        StorageManager.set('products', []);
    }

    // Initialize movements if not exists
    if (!StorageManager.get('movements')) {
        StorageManager.set('movements', []);
    }

    // Initialize suppliers
    if (typeof initializeSuppliers === 'function') {
        initializeSuppliers();
    }
}

// ===== Global State =====
// Usar var para evitar errores de redeclaración (modules-init.js también define estas variables)
var currentUser = currentUser || null;
var allProducts = allProducts || [];
var allMovements = allMovements || [];
var allUsers = allUsers || [];

// ===== Utility Functions =====
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)} `;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

// ===== Notification System (Toast) =====
function showNotification(message, type = 'info') {
    // 1. Obtener o crear contenedor
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        // Estilos inline para asegurar que funcione sin CSS externo
        container.style.cssText = `
            position: fixed; 
            top: 20px; 
            right: 20px; 
            z-index: 10000; 
            display: flex; 
            flex-direction: column; 
            gap: 10px;
            pointer-events: none; /* Dejar pasar clics a través del contenedor vacío */
        `;
        document.body.appendChild(container);
    }

    // 2. Colores y Iconos
    let bg = '#1f2937'; // Dark gray default
    let icon = 'ℹ️';
    let borderLeft = '4px solid #6b7280';

    if (type === 'success') {
        bg = '#064e3b'; // Dark green
        icon = '✅';
        borderLeft = '4px solid #10b981';
    } else if (type === 'error') {
        bg = '#7f1d1d'; // Dark red
        icon = '❌';
        borderLeft = '4px solid #ef4444';
    } else if (type === 'warning') {
        bg = '#78350f'; // Dark amber
        icon = '⚠️';
        borderLeft = '4px solid #f59e0b';
    }

    // 3. Crear elemento Toast
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.innerHTML = `
        <div style="font-size: 1.2rem; margin-right: 12px;">${icon}</div>
        <div style="flex: 1; font-weight: 500;">${message}</div>
    `;

    toast.style.cssText = `
        background: ${bg};
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 0.95rem;
        min-width: 300px;
        max-width: 400px;
        display: flex;
        align-items: center;
        border-left: ${borderLeft};
        opacity: 0;
        transform: translateX(50px);
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        pointer-events: auto; /* Permitir cerrar o interactuar */
        backdrop-filter: blur(4px);
    `;

    container.appendChild(toast);

    // 4. Animación de entrada
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    });

    // 5. Auto-cerrado
    setTimeout(() => {
        closeToast(toast);
    }, 3000); // 3 segundos

    // Click para cerrar antes
    toast.onclick = () => closeToast(toast);
}

function closeToast(toast) {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 300);
}

// ===== Modal Functions =====
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');

        // Re-enfocar la barra de búsqueda del POS si estamos en esa vista
        setTimeout(() => {
            const posView = document.querySelector('.tab-view[data-module="pos"].active');
            if (posView && typeof focusPOSSearch === 'function') {
                focusPOSSearch(100);
            }
        }, 100);
    }
}

// Make closeModal globally available
window.closeModal = closeModal;

// ===== Login Functions =====
// ===== Login Functions =====
async function handleLogin(event) {
    if (event) {
        try {
            event.preventDefault();
            event.stopPropagation();
        } catch (e) { console.warn('Event error', e); }
    }

    const usernameInput = document.getElementById('loginUser') || document.getElementById('username');
    const passwordInput = document.getElementById('loginPass') || document.getElementById('password');
    const loginOverlay = document.getElementById('loginOverlay');
    const loginError = document.getElementById('loginError');

    if (!usernameInput || !passwordInput) {
        console.error('Login inputs not found');
        return false;
    }

    const username = usernameInput.value;
    const password = passwordInput.value;

    let user = null;

    // 1. Intentar Login vía Backend (Backend es la Verdad)
    if (typeof eel !== 'undefined') {
        try {
            const result = await eel.user_login(username, password)();
            if (result && result.success) {
                user = result.user;
                console.log('✅ Login exitoso vía Backend');
            }
        } catch (e) {
            console.warn('Eel login failed, falling back to local', e);
        }
    }

    // 2. Fallback a LocalStorage (solo si el backend falla o no está disponible)
    if (!user) {
        const users = StorageManager.get('users', []);
        user = users.find(u => u.username === username && u.password === password && u.active);
        if (user) console.log('⚠️ Login vía LocalStorage (Offline)');
    }

    if (user) {
        currentUser = user;
        StorageManager.set('currentUser', user);

        if (loginOverlay) loginOverlay.style.display = 'none';

        // Maximizar ventana al entrar
        try {
            if (typeof eel !== 'undefined' && eel.maximize_window) {
                eel.maximize_window();
            }

            // Force JS resize as well since Python backend might be no-op
            if (window.resizeTo) {
                window.resizeTo(window.screen.availWidth, window.screen.availHeight);
                window.moveTo(0, 0);
            }
        } catch (e) {
            console.log('Cannot resize window', e);
        }

        // Mostrar App Principal
        const mainApp = document.getElementById('mainAppContainer') || document.getElementById('mainApp');
        if (mainApp) {
            mainApp.style.display = 'flex';
            mainApp.classList.remove('hidden');
        }

        const oldLogin = document.getElementById('loginSection');
        if (oldLogin) oldLogin.classList.add('hidden');

        // Inicialización segura
        try {
            if (typeof updateUserInfo === 'function') updateUserInfo();
            if (typeof updateDashboard === 'function') updateDashboard();
            if (typeof TabsManager !== 'undefined') {
                // Recargar módulos habilitados según permisos del nuevo usuario
                TabsManager.loadEnabledModules().then(() => {
                    TabsManager.renderSidebar();
                    TabsManager.renderTabsBar();
                    
                    // Si no hay pestañas abiertas, abrir Dashboard
                    const activeTab = document.querySelector('.tab-item.active');
                    if (!activeTab) {
                        TabsManager.openTab('dashboard');
                    }
                });
            }
        } catch (initErr) {
            console.error('Init error:', initErr);
        }

    } else {
        if (loginError) {
            loginError.style.display = 'block';
            loginError.textContent = 'Credenciales incorrectas';
        } else {
            alert('Credenciales incorrectas');
        }
    }

    return false;
}
window.handleLogin = handleLogin;

function handleLogout() {
    // Mostrar modal de confirmación en lugar de logout directo
    openModal('logoutConfirmModal');
}

function confirmLogout() {
    // Cerrar el modal de confirmación
    closeModal('logoutConfirmModal');

    // Ejecutar el cierre de sesión real
    currentUser = null;
    StorageManager.remove('currentUser');

    // Compatibilidad con ambos layouts (index.html y index-tabs.html)
    const loginScreen = document.getElementById('loginScreen');
    const mainApp = document.getElementById('mainApp');
    const loginOverlay = document.getElementById('loginOverlay');
    const mainAppContainer = document.getElementById('mainAppContainer');

    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainApp) mainApp.style.display = 'none';
    if (loginOverlay) loginOverlay.style.display = 'flex';
    if (mainAppContainer) mainAppContainer.style.display = 'none';

    // Resetear formulario si existe
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.reset();

    // Recargar para limpiar todo el estado
    location.reload();
}

// Función para cerrar la aplicación mostrando el respaldo
async function exitAppWithBackup() {
    // Mostrar el modal de respaldo
    const backupModal = document.getElementById('backupModal');
    const backupStatus = document.getElementById('backupStatus');

    if (backupModal) {
        backupModal.classList.add('active');
    }

    try {
        // Intentar crear respaldo
        if (typeof eel !== 'undefined' && eel.create_backup) {
            const result = await eel.create_backup()();

            if (backupStatus) {
                if (result && result.success) {
                    backupStatus.className = 'backup-success';
                    backupStatus.innerHTML = '✅ Respaldo creado correctamente';
                    backupStatus.style.display = 'block';
                    backupStatus.style.background = 'rgba(16, 185, 129, 0.15)';
                    backupStatus.style.color = '#10b981';
                } else {
                    backupStatus.className = 'backup-error';
                    backupStatus.innerHTML = '⚠️ ' + (result?.error || 'Error al crear respaldo');
                    backupStatus.style.display = 'block';
                    backupStatus.style.background = 'rgba(239, 68, 68, 0.15)';
                    backupStatus.style.color = '#ef4444';
                }
            }

            // Esperar 2 segundos para que el usuario vea el resultado
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    } catch (e) {
        console.log('El respaldo se creará al cerrar:', e);
    }

    // Cerrar la ventana
    window.close();
}

// Asignación global inmediata para onclick
window.logout = handleLogout;
window.handleLogout = handleLogout;
window.confirmLogout = confirmLogout;
window.exitAppWithBackup = exitAppWithBackup;

function updateUserInfo() {
    if (currentUser) {
        // IDs actualizados según index.html
        const nameDisplay = document.getElementById('userNameDisplay');
        const roleDisplay = document.getElementById('userRoleDisplay');
        const initialDisplay = document.getElementById('userInitials');

        if (nameDisplay) nameDisplay.textContent = currentUser.fullName;
        if (roleDisplay) roleDisplay.textContent = currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
        if (initialDisplay) initialDisplay.textContent = currentUser.fullName.charAt(0).toUpperCase();
    }
}

// ===== Navigation =====
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const viewName = item.dataset.view;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active view
            const views = document.querySelectorAll('.view');
            views.forEach(view => view.classList.remove('active-view'));

            const targetView = document.getElementById(`${viewName}View`);
            if (targetView) {
                targetView.classList.add('active-view');

                // Load specific view data
                if (viewName === 'products') {
                    renderProductsTable();
                } else if (viewName === 'pos') {
                    if (typeof initPOSModule === 'function') {
                        initPOSModule();
                    }
                } else if (viewName === 'suppliers') {
                    if (typeof renderSuppliersTable === 'function') {
                        renderSuppliersTable();
                    }
                } else if (viewName === 'movements') {
                    renderMovementsTable();
                } else if (viewName === 'users') {
                    renderUsersTable();
                } else if (viewName === 'dashboard') {
                    updateDashboard();
                } else if (viewName === 'settings') {
                    if (typeof initSettingsModule === 'function') {
                        initSettingsModule();
                    }
                }
            }
        });
    });
}

// ===== Load Data =====
function loadData() {
    allProducts = StorageManager.get('products', []) || [];
    allMovements = StorageManager.get('movements', []) || [];
    allUsers = StorageManager.get('users', []) || [];

    // Load suppliers from the suppliers module
    if (typeof loadSuppliers === 'function') {
        loadSuppliers();
    }
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout
    const logoutBtn = document.getElementById('logoutButtonFinal');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    // Mantener compatibilidad global por si acaso
    window.logout = handleLogout;

    // Products
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);

    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const searchProducts = document.getElementById('searchProducts');
    if (searchProducts) {
        searchProducts.addEventListener('input', (e) => {
            renderProductsTable(e.target.value);
        });
    }
}

// ===== Navigation =====
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const viewName = item.dataset.view;

            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Update active view
            const views = document.querySelectorAll('.view');
            views.forEach(view => view.classList.remove('active-view'));

            const targetView = document.getElementById(`${viewName}View`);
            if (targetView) {
                targetView.classList.add('active-view');

                // Load specific view data
                if (viewName === 'products') {
                    renderProductsTable();
                } else if (viewName === 'suppliers') {
                    if (typeof renderSuppliersTable === 'function') {
                        renderSuppliersTable();
                    }
                } else if (viewName === 'movements') {
                    renderMovementsTable();
                } else if (viewName === 'users') {
                    renderUsersTable();
                } else if (viewName === 'dashboard') {
                    updateDashboard();
                }
            }
        });
    });
}

// ===== Load Data =====
function loadData() {
    allProducts = StorageManager.get('products', []);
    allMovements = StorageManager.get('movements', []);
    allUsers = StorageManager.get('users', []);

    // Load suppliers from the suppliers module
    if (typeof loadSuppliers === 'function') {
        loadSuppliers();
    }
}

// ===== Dashboard Functions =====
function updateDashboard() {
    loadData();

    // Update statistics
    const totalProducts = allProducts.length;
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    // Usar 5 como umbral por defecto si minStock no existe
    const lowStockProducts = allProducts.filter(p => p.stock <= (p.minStock !== undefined ? p.minStock : 5));
    const today = new Date().toDateString();
    const todayMovements = allMovements.filter(m => new Date(m.date).toDateString() === today);

    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalValue').textContent = formatCurrency(totalValue);
    document.getElementById('lowStock').textContent = lowStockProducts.length;
    document.getElementById('todayMovements').textContent = todayMovements.length;

    // Update recent movements
    renderRecentMovements();

    // Update low stock products
    renderLowStockProducts();
}

function renderRecentMovements() {
    const container = document.getElementById('recentMovements');
    const recentMovements = allMovements.slice(-5).reverse();

    if (recentMovements.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay movimientos recientes</p>';
        return;
    }

    container.innerHTML = recentMovements.map(movement => {
        const product = allProducts.find(p => p.id === movement.productId);
        const productName = product ? product.name : 'Producto eliminado';

        return `
    < div class="movement-item" >
                <div class="item-header">
                    <span class="item-title">${productName}</span>
                    <span class="badge badge-${movement.type}">${movement.type.toUpperCase()}</span>
                </div>
                <p class="item-subtitle">Cantidad: ${movement.quantity} | ${formatDate(movement.date)}</p>
            </div >
    `;
    }).join('');
}

function renderLowStockProducts() {
    const container = document.getElementById('lowStockProducts');
    const lowStockProducts = allProducts.filter(p => p.stock <= p.minStock);

    if (lowStockProducts.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay productos con stock bajo</p>';
        return;
    }

    container.innerHTML = lowStockProducts.map(product => `
    < div class="product-item" >
            <div class="item-header">
                <span class="item-title">${product.name}</span>
                <span class="badge badge-low-stock">Stock Bajo</span>
            </div>
            <p class="item-subtitle">Stock actual: ${product.stock} | Mínimo: ${product.minStock}</p>
        </div >
    `).join('');
}

// ===== Products Functions =====
function renderProductsTable(searchTerm = '') {
    const tbody = document.getElementById('productsTableBody');

    let filteredProducts = allProducts;
    if (searchTerm) {
        filteredProducts = allProducts.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.partNumber && p.partNumber.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron productos</td></tr>';
        return;
    }

    tbody.innerHTML = filteredProducts.map(product => {
        const price = product.price || 0;

        return `
    < tr >
                <td>${product.code}</td>
                <td>${product.partNumber || '-'}</td>
                <td>${product.name}</td>
                <td>${product.stock}</td>
                <td>${formatCurrency(price)}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn-action edit" onclick="editProduct('${product.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        ${currentUser.role === 'admin' ? `
                        <button class="btn-action delete" onclick="deleteProduct('${product.id}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                            </svg>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr >
    `;
    }).join('');
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Agregar Producto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';

    // Asegurar que el stock está habilitado por defecto
    const stockInput = document.getElementById('productStock');
    stockInput.disabled = false;
    stockInput.placeholder = "0";

    openModal('productModal');
}

function quickCreateProduct(initialName) {
    isQuickAddingFromPurchase = true;

    // Ocultar modal de movimiento quitando la clase active
    document.getElementById('movementModal').classList.remove('active');

    // Abrir modal de producto
    openAddProductModal();

    // Configuración específica para Quick Add: Bloquear Stock
    const stockInput = document.getElementById('productStock');
    stockInput.value = 0;
    stockInput.disabled = true;
    stockInput.placeholder = "Gestionar en Compra";

    // Pre-llenar nombre
    setTimeout(() => {
        document.getElementById('productName').value = initialName;
        document.getElementById('productCode').focus();
    }, 100);
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    document.getElementById('productModalTitle').textContent = 'Editar Producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('productCode').value = product.code;
    document.getElementById('productPartNumber').value = product.partNumber || '';
    document.getElementById('productName').value = product.name;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productPrice').value = product.price || '';
    openModal('productModal');
}

function deleteProduct(productId) {
    if (currentUser.role !== 'admin') {
        showNotification('Solo los administradores pueden eliminar productos', 'error');
        return;
    }

    if (confirm('¿Está seguro que desea eliminar este producto?')) {
        allProducts = allProducts.filter(p => p.id !== productId);
        StorageManager.set('products', allProducts);
        renderProductsTable();
        updateDashboard();
        showNotification('Producto eliminado exitosamente', 'success');
    }
}

function handleProductSubmit(event) {
    event.preventDefault();

    const productId = document.getElementById('productId').value;
    const price = document.getElementById('productPrice').value;

    const productData = {
        code: document.getElementById('productCode').value.trim(),
        partNumber: document.getElementById('productPartNumber').value.trim(),
        name: document.getElementById('productName').value.trim(),
        // Si es compra rápida, forzar stock 0, si no, tomar valor del input
        stock: isQuickAddingFromPurchase ? 0 : (parseInt(document.getElementById('productStock').value) || 0),
        price: price ? parseFloat(price) : 0
    };

    if (productId) {
        // Edit existing product
        const index = allProducts.findIndex(p => p.id === productId);
        if (index !== -1) {
            allProducts[index] = { ...allProducts[index], ...productData };
            showNotification('Producto actualizado exitosamente', 'success');
        }
    } else {
        // Add new product
        const newProduct = {
            id: generateId('prod'),
            ...productData
        };
        allProducts.push(newProduct);
        showNotification('Producto agregado exitosamente', 'success');
    }

    StorageManager.set('products', allProducts);
    renderProductsTable();
    updateDashboard();

    // Resetear el formulario antes de cerrar el modal
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';

    // Cerrar el modal
    closeModal('productModal');

    // Si veníamos de una compra rápida, restaurar
    if (isQuickAddingFromPurchase) {
        isQuickAddingFromPurchase = false;

        // Restaurar modal de movimiento
        openModal('movementModal');

        // Si fue un producto nuevo (no edición), agregarlo a la lista
        if (!productId) {
            // El último producto agregado es el nuevo
            const lastProduct = allProducts[allProducts.length - 1];
            addTransactionItem(lastProduct.id, 'entrada');
        }
    }
}

// ===== Movements Functions =====
function renderMovementsTable(searchTerm = '', filterType = '') {
    const tbody = document.getElementById('movementsTableBody');

    let filteredMovements = allMovements;

    if (searchTerm) {
        filteredMovements = filteredMovements.filter(m => {
            const product = allProducts.find(p => p.id === m.productId);
            return product && (
                product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.code.toLowerCase().includes(searchTerm.toLowerCase())
            );
        });
    }

    if (filterType) {
        filteredMovements = filteredMovements.filter(m => m.type === filterType);
    }

    if (filteredMovements.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron movimientos</td></tr>';
        return;
    }

    const suppliers = StorageManager.get('suppliers', []);

    tbody.innerHTML = filteredMovements.slice().reverse().map(movement => {
        const product = allProducts.find(p => p.id === movement.productId);
        const productName = product ? `${product.code} - ${product.name} ` : 'Producto eliminado';

        // Detalles adicionales para entrada
        let details = movement.notes || '-';
        if (movement.type === 'entrada') {
            const supplier = suppliers.find(s => s.id === movement.supplierId);
            const supplierName = supplier ? supplier.name : '';
            const invoice = movement.invoice || '';

            if (supplierName || invoice) {
                const parts = [];
                if (supplierName) parts.push(`Prov: ${supplierName} `);
                if (invoice) parts.push(`Fact: ${invoice} `);
                if (details !== '-' && details) parts.push(details);
                details = parts.join(' | ');
            }
        }

        return `
    < tr >
                <td>${formatDate(movement.date)}</td>
                <td><span class="badge badge-${movement.type}">${movement.type.toUpperCase()}</span></td>
                <td>${productName}</td>
                <td>${movement.quantity}</td>
                <td>${movement.userName}</td>
                <td>${details}</td>
            </tr >
    `;
    }).join('');
}

// Estado temporal para movimientos (entrada o salida)
let transactionItems = [];
let isQuickAddingFromPurchase = false;

function openAddMovementModal() {
    document.getElementById('movementForm').reset();
    document.getElementById('movementType').value = '';

    // Ocultar secciones
    document.getElementById('entrySection').style.display = 'none';
    document.getElementById('exitSection').style.display = 'none';

    // Limpiar buscadores
    document.getElementById('purchaseProductSearch').value = '';
    document.getElementById('exitProductSearch').value = '';

    transactionItems = [];
    renderTransactionTable('entrada'); // Limpiar visualmente
    renderTransactionTable('salida');

    // Populate suppliers dropdown (solo necesario para entradas)
    const supplierSelect = document.getElementById('purchaseSupplier');
    supplierSelect.innerHTML = '<option value="">Seleccione proveedor...</option>';
    const suppliers = StorageManager.get('suppliers', []);
    suppliers.filter(s => s.active !== false).forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.name;
        supplierSelect.appendChild(option);
    });

    // Event listener para mostrar la sección correcta
    const typeSelect = document.getElementById('movementType');
    typeSelect.onchange = function () {
        const entrySection = document.getElementById('entrySection');
        const exitSection = document.getElementById('exitSection');

        transactionItems = []; // Limpiar items al cambiar tipo

        if (this.value === 'entrada') {
            entrySection.style.display = 'block';
            exitSection.style.display = 'none';
            setupTransactionSearch('purchaseProductSearch', 'purchaseSearchResults', 'entrada');
            renderTransactionTable('entrada');
        } else if (this.value === 'salida') {
            entrySection.style.display = 'none';
            exitSection.style.display = 'block';
            setupTransactionSearch('exitProductSearch', 'exitSearchResults', 'salida');
            renderTransactionTable('salida');
        } else {
            entrySection.style.display = 'none';
            exitSection.style.display = 'none';
        }
    };

    openModal('movementModal');
}

function setupTransactionSearch(inputId, resultsId, type) {
    const searchInput = document.getElementById(inputId);
    const resultsDiv = document.getElementById(resultsId);

    if (!searchInput) return;

    // Clonar el elemento para eliminar event listeners anteriores
    const newInput = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newInput, searchInput);

    // Reasignar referencias
    const inputElement = document.getElementById(inputId);

    // Prevenir submit al dar Enter
    inputElement.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    inputElement.oninput = function () {
        const term = this.value;
        const termLower = term.toLowerCase();

        if (termLower.length < 2) {
            resultsDiv.style.display = 'none';
            return;
        }

        const matches = allProducts.filter(p =>
            p.name.toLowerCase().includes(termLower) ||
            p.code.toLowerCase().includes(termLower) ||
            (p.partNumber && p.partNumber.toLowerCase().includes(termLower))
        ).slice(0, 10);

        if (matches.length > 0) {
            resultsDiv.innerHTML = matches.map(p => `
    < div class="dropdown-item" onclick = "addTransactionItem('${p.id}', '${type}')" >
        <strong>${p.code}</strong> - ${p.name}
                    ${type === 'salida' ? `<span class="text-sm text-gray"> (Stock: ${p.stock})</span>` : ''}
                </div >
    `).join('');
        } else {
            if (type === 'entrada') {
                resultsDiv.innerHTML = `
    < div class="dropdown-item text-primary" onclick = "quickCreateProduct('${term}')" >
        <span style="font-weight:bold">+ Crear producto: "${term}"</span>
                    </div >
    `;
            } else {
                resultsDiv.innerHTML = `< div class="dropdown-item text-gray" > No encontrado</div > `;
            }
        }
        resultsDiv.style.display = 'block';
    };

    // Ocultar al hacer clic fuera
    document.addEventListener('click', function (e) {
        if (e.target !== inputElement) {
            resultsDiv.style.display = 'none';
        }
    });
}

function quickCreateProduct(initialName) {
    isQuickAddingFromPurchase = true;
    document.getElementById('movementModal').classList.remove('active');
    openAddProductModal();

    // Configuración para Quick Add
    const stockInput = document.getElementById('productStock');
    stockInput.value = 0;
    stockInput.disabled = true;
    stockInput.placeholder = "Gestionar en Compra";

    setTimeout(() => {
        document.getElementById('productName').value = initialName;
        document.getElementById('productCode').focus();
    }, 100);
}

function addTransactionItem(productId, type) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;

    if (transactionItems.find(i => i.id === productId)) {
        showNotification('El producto ya está en la lista', 'warning');
        return;
    }

    if (type === 'salida' && product.stock <= 0) {
        showNotification('Producto sin stock disponible', 'error');
        return;
    }

    let cost = 0;
    // Buscar costo si es entrada
    if (type === 'entrada') {
        const supplierId = document.getElementById('purchaseSupplier').value;
        if (supplierId) {
            const allPrices = StorageManager.get('supplierPrices', {});
            if (allPrices[supplierId] && allPrices[supplierId][productId]) {
                cost = allPrices[supplierId][productId];
            }
        }
    }

    transactionItems.push({
        id: product.id,
        code: product.code,
        name: product.name,
        stock: product.stock,
        quantity: 1,
        cost: cost
    });

    // Limpiar inputs
    if (type === 'entrada') {
        document.getElementById('purchaseProductSearch').value = '';
        document.getElementById('purchaseSearchResults').style.display = 'none';
    } else {
        document.getElementById('exitProductSearch').value = '';
        document.getElementById('exitSearchResults').style.display = 'none';
    }

    renderTransactionTable(type);
}

function removeTransactionItem(index, type) {
    transactionItems.splice(index, 1);
    renderTransactionTable(type);
}

function updateTransactionItem(index, field, value, type) {
    const val = parseFloat(value);

    // Validar cantidad vs stock en salidas
    if (type === 'salida' && field === 'quantity') {
        if (val > transactionItems[index].stock) {
            showNotification('Cantidad excede el stock actual', 'error');
            // Resetear al maximo o dejar valor invalido pero no procesable? Mejor visual
            // Por ahora permitimos escribir pero validamos al enviar
        }
    }

    if (val >= 0) {
        transactionItems[index][field] = val;
        renderTransactionTable(type);
    }
}

function renderTransactionTable(type) {
    const tbodyId = type === 'entrada' ? 'purchaseItemsTableBody' : 'exitItemsTableBody';
    const tbody = document.getElementById(tbodyId);

    if (!tbody) return;

    if (transactionItems.length === 0) {
        tbody.innerHTML = `< tr > <td colspan="${type === 'entrada' ? 6 : 4}" class="empty-state">Agregue productos usando el buscador</td></tr > `;
        if (type === 'entrada') {
            const totalDisplay = document.getElementById('purchaseTotalDisplay');
            if (totalDisplay) totalDisplay.textContent = '$0.00';
        }
        return;
    }

    let grandTotal = 0;

    tbody.innerHTML = transactionItems.map((item, index) => {
        if (type === 'entrada') {
            const subtotal = item.quantity * item.cost;
            grandTotal += subtotal;
            return `
    < tr >
                    <td>
                        <div class="font-bold">${item.code}</div>
                        <div class="text-sm text-gray">${item.name}</div>
                    </td>
                    <td>${item.stock}</td>
                    <td>
                        <input type="number" class="form-input p-1" style="width:80px" min="1" 
                               value="${item.quantity}" 
                               onchange="updateTransactionItem(${index}, 'quantity', this.value, 'entrada')">
                    </td>
                    <td>
                        <input type="number" class="form-input p-1" style="width:100px" step="0.01" 
                               value="${item.cost}" 
                               onchange="updateTransactionItem(${index}, 'cost', this.value, 'entrada')">
                    </td>
                    <td>${formatCurrency(subtotal)}</td>
                    <td>
                        <button type="button" class="btn-icon text-danger" onclick="removeTransactionItem(${index}, 'entrada')">
                            &times;
                        </button>
                    </td>
                </tr >
    `;
        } else {
            // Salida row
            const isStockError = item.quantity > item.stock;
            return `
    < tr >
                    <td>
                        <div class="font-bold">${item.code}</div>
                        <div class="text-sm text-gray">${item.name}</div>
                    </td>
                    <td>${item.stock}</td>
                    <td>
                        <input type="number" class="form-input p-1 ${isStockError ? 'border-danger' : ''}" 
                               style="width:100px" min="1" max="${item.stock}"
                               value="${item.quantity}" 
                               onchange="updateTransactionItem(${index}, 'quantity', this.value, 'salida')">
                        ${isStockError ? '<div class="text-danger text-xs">Excede stock</div>' : ''}
                    </td>
                    <td>
                        <button type="button" class="btn-icon text-danger" onclick="removeTransactionItem(${index}, 'salida')">
                            &times;
                        </button>
                    </td>
                </tr >
    `;
        }
    }).join('');

    if (type === 'entrada') {
        const totalDisplay = document.getElementById('purchaseTotalDisplay');
        if (totalDisplay) totalDisplay.textContent = formatCurrency(grandTotal);
    }
}

function handleMovementSubmit(event) {
    event.preventDefault();

    const type = document.getElementById('movementType').value;
    const notes = document.getElementById('movementNotes').value;

    if (!type) {
        showNotification('Seleccione un tipo de movimiento', 'error');
        return;
    }

    if (transactionItems.length === 0) {
        showNotification('Agregue al menos un producto a la lista', 'error');
        return;
    }

    if (type === 'salida') {
        // Validar stocks en masa
        for (const item of transactionItems) {
            const product = allProducts.find(p => p.id === item.id);
            if (!product) continue;
            if (item.quantity > product.stock) {
                showNotification(`Stock insuficiente para ${item.code}.Disponible: ${product.stock} `, 'error');
                return;
            }
        }

        // Procesar salidas
        transactionItems.forEach(item => {
            const product = allProducts.find(p => p.id === item.id);
            if (product) {
                product.stock -= item.quantity;
                updateProduct(product);
                saveMovementRecord('salida', item.id, item.quantity, notes, null, null);
            }
        });

    } else if (type === 'entrada') {
        const supplierId = document.getElementById('purchaseSupplier').value;
        const invoice = document.getElementById('purchaseInvoice').value;

        if (!supplierId) {
            showNotification('Seleccione un proveedor', 'error');
            return;
        }

        const allSupplierPrices = StorageManager.get('supplierPrices', {});
        if (!allSupplierPrices[supplierId]) allSupplierPrices[supplierId] = {};

        // Procesar entradas
        transactionItems.forEach(item => {
            const product = allProducts.find(p => p.id === item.id);
            if (product) {
                product.stock += item.quantity;
                updateProduct(product);

                // Actualizar precio de compra
                if (item.cost > 0) {
                    allSupplierPrices[supplierId][item.id] = item.cost;
                }

                saveMovementRecord('entrada', item.id, item.quantity, notes, supplierId, invoice);
            }
        });

        StorageManager.set('supplierPrices', allSupplierPrices);
    }

    showNotification('Movimientos registrados exitosamente', 'success');
    closeModal('movementModal');
    renderMovementsTable();
    updateDashboard();
}

function saveMovementRecord(type, productId, quantity, notes, supplierId, invoice) {
    const movement = {
        id: generateId('mov'),
        type,
        productId,
        quantity,
        notes,
        date: new Date().toISOString(),
        userName: currentUser.fullName,
        userId: currentUser.id,
        supplierId: supplierId,
        invoice: invoice
    };
    allMovements.push(movement);
    StorageManager.set('movements', allMovements);
}

function updateProduct(product) {
    const index = allProducts.findIndex(p => p.id === product.id);
    if (index !== -1) {
        allProducts[index] = product;
        StorageManager.set('products', allProducts);
    }
}

// ===== Users Functions =====
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');

    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay usuarios registrados</td></tr>';
        return;
    }

    tbody.innerHTML = allUsers.map(user => `
    < tr >
            <td>${user.username}</td>
            <td>${user.fullName}</td>
            <td><span class="badge badge-${user.role}">${user.role === 'admin' ? 'Administrador' : 'Usuario'}</span></td>
            <td><span class="badge badge-${user.active ? 'active' : 'inactive'}">${user.active ? 'Activo' : 'Inactivo'}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-action edit" onclick="editUser('${user.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    ${user.id !== currentUser.id ? `
                    <button class="btn-action delete" onclick="deleteUser('${user.id}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr >
    `).join('');
}

function openAddUserModal() {
    document.getElementById('userModalTitle').textContent = 'Agregar Usuario';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    openModal('userModal');
}

function editUser(userId) {
    const user = allUsers.find(u => u.id === userId);
    if (!user) return;

    document.getElementById('userModalTitle').textContent = 'Editar Usuario';
    document.getElementById('userId').value = user.id;
    document.getElementById('userUsername').value = user.username;
    document.getElementById('userFullName').value = user.fullName;
    document.getElementById('userPassword').value = user.password;
    document.getElementById('userRole').value = user.role;

    openModal('userModal');
}

function deleteUser(userId) {
    if (userId === currentUser.id) {
        showNotification('No puedes eliminar tu propio usuario', 'error');
        return;
    }

    if (confirm('¿Está seguro que desea eliminar este usuario?')) {
        allUsers = allUsers.filter(u => u.id !== userId);
        StorageManager.set('users', allUsers);
        renderUsersTable();
        showNotification('Usuario eliminado exitosamente', 'success');
    }
}

function handleUserSubmit(event) {
    event.preventDefault();

    const userId = document.getElementById('userId').value;
    const userData = {
        username: document.getElementById('userUsername').value,
        fullName: document.getElementById('userFullName').value,
        password: document.getElementById('userPassword').value,
        role: document.getElementById('userRole').value,
        active: true
    };

    // Check if username already exists (for new users or when changing username)
    const existingUser = allUsers.find(u => u.username === userData.username && u.id !== userId);
    if (existingUser) {
        showNotification('El nombre de usuario ya existe', 'error');
        return;
    }

    if (userId) {
        // Edit existing user
        const index = allUsers.findIndex(u => u.id === userId);
        if (index !== -1) {
            allUsers[index] = { ...allUsers[index], ...userData };

            // Update current user if editing self
            if (userId === currentUser.id) {
                currentUser = allUsers[index];
                StorageManager.set('currentUser', currentUser);
                updateUserInfo();
            }

            showNotification('Usuario actualizado exitosamente', 'success');
        }
    } else {
        // Add new user
        const newUser = {
            id: generateId('user'),
            ...userData
        };
        allUsers.push(newUser);
        showNotification('Usuario agregado exitosamente', 'success');
    }

    StorageManager.set('users', allUsers);
    renderUsersTable();

    // Resetear el formulario antes de cerrar el modal
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';

    closeModal('userModal');
}

// ===== Reports Functions =====
function generateInventoryReport() {
    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');

    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);

    let html = `
    < h4 class="mb-2" > Reporte de Inventario Completo</h4 >
        <p class="mb-3"><strong>Fecha:</strong> ${formatDate(new Date())}</p>
        
        <div class="mb-3">
            <p><strong>Total de Productos:</strong> ${allProducts.length}</p>
            <p><strong>Valor Total del Inventario:</strong> ${formatCurrency(totalValue)}</p>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Stock</th>
                        <th>Precio</th>
                        <th>Valor Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${allProducts.map(p => `
                        <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td>${p.category}</td>
                            <td>${p.stock}</td>
                            <td>${formatCurrency(p.price)}</td>
                            <td>${formatCurrency(p.price * p.stock)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
`;

    reportResults.innerHTML = html;
    reportCard.style.display = 'block';
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

function generateMovementsReport() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    if (!startDate || !endDate) {
        showNotification('Por favor seleccione las fechas de inicio y fin', 'error');
        return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59);

    const filteredMovements = allMovements.filter(m => {
        const movDate = new Date(m.date);
        return movDate >= start && movDate <= end;
    });

    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');

    const totalEntradas = filteredMovements.filter(m => m.type === 'entrada').reduce((sum, m) => sum + m.quantity, 0);
    const totalSalidas = filteredMovements.filter(m => m.type === 'salida').reduce((sum, m) => sum + m.quantity, 0);

    let html = `
    < h4 class="mb-2" > Reporte de Movimientos</h4 >
        <p class="mb-3"><strong>Período:</strong> ${formatDate(start)} - ${formatDate(end)}</p>
        
        <div class="mb-3">
            <p><strong>Total de Movimientos:</strong> ${filteredMovements.length}</p>
            <p><strong>Total Entradas:</strong> ${totalEntradas} unidades</p>
            <p><strong>Total Salidas:</strong> ${totalSalidas} unidades</p>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Usuario</th>
                        <th>Notas</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredMovements.slice().reverse().map(m => {
        const product = allProducts.find(p => p.id === m.productId);
        return `
                            <tr>
                                <td>${formatDate(m.date)}</td>
                                <td><span class="badge badge-${m.type}">${m.type.toUpperCase()}</span></td>
                                <td>${product ? product.name : 'Producto eliminado'}</td>
                                <td>${m.quantity}</td>
                                <td>${m.userName}</td>
                                <td>${m.notes || '-'}</td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
`;

    reportResults.innerHTML = html;
    reportCard.style.display = 'block';
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

function generateLowStockReport() {
    const lowStockProducts = allProducts.filter(p => p.stock <= p.minStock);

    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');

    let html = `
    < h4 class="mb-2" > Reporte de Stock Bajo</h4 >
        <p class="mb-3"><strong>Fecha:</strong> ${formatDate(new Date())}</p>
        
        <div class="mb-3">
            <p><strong>Productos con Stock Bajo:</strong> ${lowStockProducts.length}</p>
        </div>
        
        ${lowStockProducts.length > 0 ? `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Stock Actual</th>
                        <th>Stock Mínimo</th>
                        <th>Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    ${lowStockProducts.map(p => `
                        <tr>
                            <td>${p.code}</td>
                            <td>${p.name}</td>
                            <td>${p.category}</td>
                            <td><span class="badge badge-low-stock">${p.stock}</span></td>
                            <td>${p.minStock}</td>
                            <td>${Math.abs(p.stock - p.minStock)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : '<p class="empty-state">No hay productos con stock bajo</p>'
        }
`;

    reportResults.innerHTML = html;
    reportCard.style.display = 'block';
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

function printReport() {
    window.print();
}

// ===== Profit Calculator =====
function updateProfitDisplay() {
    const costInput = document.getElementById('productCost');
    const priceInput = document.getElementById('productPrice');
    const profitAmountSpan = document.getElementById('profitAmount');
    const profitMarginSpan = document.getElementById('profitMargin');

    if (!profitAmountSpan || !profitMarginSpan) return;

    const cost = parseFloat(costInput?.value) || 0;
    const price = parseFloat(priceInput?.value) || 0;

    const profit = price - cost;
    const profitPercentage = cost > 0 ? ((profit / cost) * 100) : 0;

    profitAmountSpan.textContent = formatCurrency(profit);
    profitMarginSpan.textContent = `${profitPercentage.toFixed(1)}% `;

    // Update display class based on profit level
    const profitDisplay = document.getElementById('profitDisplay');
    if (profitDisplay) {
        profitDisplay.classList.remove('profit-high', 'profit-medium', 'profit-low');

        if (cost > 0 && price > 0) {
            if (profitPercentage >= 30) {
                profitDisplay.classList.add('profit-high');
            } else if (profitPercentage >= 15) {
                profitDisplay.classList.add('profit-medium');
            } else {
                profitDisplay.classList.add('profit-low');
            }
        }
    }
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Login
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Logout maneja via onclick global, no listener aquí

    // Products
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) addProductBtn.addEventListener('click', openAddProductModal);

    const productForm = document.getElementById('productForm');
    if (productForm) productForm.addEventListener('submit', handleProductSubmit);

    const searchProducts = document.getElementById('searchProducts');
    if (searchProducts) {
        searchProducts.addEventListener('input', (e) => {
            renderProductsTable(e.target.value);
        });
    }

    // Real-time profit calculation
    const costInput = document.getElementById('productCost');
    const priceInput = document.getElementById('productPrice');

    if (costInput) {
        costInput.addEventListener('input', updateProfitDisplay);
    }
    if (priceInput) {
        priceInput.addEventListener('input', updateProfitDisplay);
    }

    // Movements
    const addMovementBtn = document.getElementById('addMovementBtn');
    if (addMovementBtn) addMovementBtn.addEventListener('click', openAddMovementModal);

    const movementForm = document.getElementById('movementForm');
    if (movementForm) movementForm.addEventListener('submit', handleMovementSubmit);

    const searchMovements = document.getElementById('searchMovements');
    if (searchMovements) {
        searchMovements.addEventListener('input', (e) => {
            const filterType = document.getElementById('filterMovementType')?.value || '';
            renderMovementsTable(e.target.value, filterType);
        });
    }

    const filterMovementType = document.getElementById('filterMovementType');
    if (filterMovementType) {
        filterMovementType.addEventListener('change', (e) => {
            const searchTerm = document.getElementById('searchMovements')?.value || '';
            renderMovementsTable(searchTerm, e.target.value);
        });
    }

    // Users
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn) addUserBtn.addEventListener('click', openAddUserModal);

    const userForm = document.getElementById('userForm');
    if (userForm) userForm.addEventListener('submit', handleUserSubmit);

    // Suppliers
    const addSupplierBtn = document.getElementById('addSupplierBtn');
    if (addSupplierBtn) {
        addSupplierBtn.addEventListener('click', () => {
            if (typeof openAddSupplierModal === 'function') {
                openAddSupplierModal();
            }
        });
    }

    const supplierForm = document.getElementById('supplierForm');
    if (supplierForm) {
        supplierForm.addEventListener('submit', (e) => {
            if (typeof handleSupplierSubmit === 'function') {
                handleSupplierSubmit(e);
            }
        });
    }

    const searchSuppliers = document.getElementById('searchSuppliers');
    if (searchSuppliers) {
        searchSuppliers.addEventListener('input', (e) => {
            if (typeof renderSuppliersTable === 'function') {
                renderSuppliersTable(e.target.value);
            }
        });
    }

    // Reports
    const genInvReport = document.getElementById('generateInventoryReport');
    if (genInvReport) genInvReport.addEventListener('click', generateInventoryReport);

    const genMovReport = document.getElementById('generateMovementsReport');
    if (genMovReport) genMovReport.addEventListener('click', generateMovementsReport);

    const genLowStockReport = document.getElementById('generateLowStockReport');
    if (genLowStockReport) genLowStockReport.addEventListener('click', generateLowStockReport);

    const printReportBtn = document.getElementById('printReport');
    if (printReportBtn) printReportBtn.addEventListener('click', printReport);

    // New Profit Reports
    const profitReportBtn = document.getElementById('generateProfitReport');
    if (profitReportBtn) {
        profitReportBtn.addEventListener('click', () => {
            if (typeof generateProfitReport === 'function') {
                generateProfitReport();
            }
        });
    }

    const supplierComparisonBtn = document.getElementById('generateSupplierComparisonReport');
    if (supplierComparisonBtn) {
        supplierComparisonBtn.addEventListener('click', () => {
            if (typeof generateSupplierComparisonReport === 'function') {
                generateSupplierComparisonReport();
            }
        });
    }

    // Modal close on outside click
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
}

// Make functions globally available
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
window.editUser = editUser;
window.deleteUser = deleteUser;

// ===== Initialize Application =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialize data
    initializeDefaultData();

    // Setup event listeners
    setupEventListeners();

    // Setup navigation
    setupNavigation();

    // Check if user is already logged in
    const savedUser = StorageManager.get('currentUser');
    if (savedUser) {
        const users = StorageManager.get('users', []);
        const user = users.find(u => u.id === savedUser.id && u.active);

        if (user) {
            currentUser = user;
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'flex';

            updateUserInfo();
            loadData();
            updateDashboard();

            if (user.role !== 'admin') {
                document.getElementById('usersNavItem').style.display = 'none';
            }
        }
    }
});

// Función para mostrar detalles del dashboard
function showDashboardDetails(type) {
    const modalTitle = document.getElementById('dashboardDetailsTitle');
    const thead = document.getElementById('dashboardDetailsHead');
    const tbody = document.getElementById('dashboardDetailsBody');

    // Clear previous content
    tbody.innerHTML = '';
    thead.innerHTML = '';

    // Cargar datos frescos
    const products = StorageManager.get('products', []);
    const movements = StorageManager.get('movements', []);

    if (type === 'products' || type === 'list') {
        modalTitle.textContent = 'Listado de Productos';
        thead.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Stock</th>
                <th>Precio</th>
            </tr>
        `;
        products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.code}</td>
                    <td>${p.name}</td>
                    <td>${p.stock}</td>
                    <td>${formatCurrency(p.price)}</td>
                </tr>
            `;
        });
    } else if (type === 'value') {
        modalTitle.textContent = 'Valor del Inventario';
        thead.innerHTML = `
            <tr>
                <th>Producto</th>
                <th>Stock</th>
                <th>Precio Unit.</th>
                <th>Valor Total</th>
            </tr>
        `;
        let totalVal = 0;
        products.forEach(p => {
            const val = p.stock * p.price;
            totalVal += val;
            tbody.innerHTML += `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.stock}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${formatCurrency(val)}</td>
                </tr>
            `;
        });
        tbody.innerHTML += `
            <tr style="font-weight:bold; background:rgba(255,255,255,0.05)">
                <td colspan="3" style="text-align:right">TOTAL:</td>
                <td>${formatCurrency(totalVal)}</td>
            </tr>
        `;
    } else if (type === 'lowStock') {
        modalTitle.textContent = 'Productos con Stock Bajo';
        thead.innerHTML = `
             <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Stock Actual</th>
                <th>Estado</th>
            </tr>
        `;
        const low = products.filter(p => p.stock <= (p.minStock !== undefined ? p.minStock : 5));

        if (low.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No hay productos con stock bajo</td></tr>';
        } else {
            low.forEach(p => {
                tbody.innerHTML += `
                    <tr>
                        <td>${p.code}</td>
                        <td>${p.name}</td>
                        <td class="text-danger font-bold">${p.stock}</td>
                        <td><span class="badge badge-danger">Bajo</span></td>
                    </tr>
                `;
            });
        }
    } else if (type === 'movements') {
        modalTitle.textContent = 'Movimientos de Hoy';
        thead.innerHTML = `
            <tr>
                <th>Hora</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Usuario</th>
            </tr>
        `;

        const today = new Date().toDateString();
        const todaysMovs = movements.filter(m => new Date(m.date).toDateString() === today).reverse();

        if (todaysMovs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay movimientos hoy</td></tr>';
        } else {
            todaysMovs.forEach(m => {
                const prod = products.find(p => p.id === m.productId);
                const prodName = prod ? prod.name : 'Producto eliminado';
                const time = new Date(m.date).toLocaleTimeString();

                tbody.innerHTML += `
                    <tr>
                        <td>${time}</td>
                        <td>${prodName}</td>
                        <td>
                            <span class="badge ${m.type === 'entrada' ? 'badge-success' : 'badge-danger'}">
                                ${m.type.toUpperCase()}
                            </span>
                        </td>
                        <td>${m.quantity}</td>
                        <td>${m.user || '-'}</td>
                    </tr>
                `;
            });
        }
    }

    openModal('dashboardDetailsModal');
}

// Exportar función global
window.showDashboardDetails = showDashboardDetails;

// ===== System Maintenance =====
function factoryReset() {
    if (confirm('⚠ ADVERTENCIA ⚠\n\nEstá a punto de BORRAR TODOS LOS DATOS del sistema (Productos, Movimientos, Proveedores).\n\nEsta acción NO se puede deshacer.\n\n¿Está seguro que desea comenzar de cero?')) {
        if (confirm('Por favor confirme nuevamente:\n\nSe eliminará todo el inventario y el historial.\n\n¿Continuar?')) {
            // Mantener usuarios, borrar el resto
            StorageManager.set('products', []);
            StorageManager.set('movements', []);
            StorageManager.set('suppliers', []);
            StorageManager.set('supplierPrices', {});

            alert('El sistema se ha restablecido correctamente. Se recargará la página.');
            location.reload();
        }
    }
}
window.factoryReset = factoryReset;

// ===== About Modal =====
function openAboutModal() {
    openModal('aboutModal');
}
window.openAboutModal = openAboutModal;

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    // NOTA: Removido el HARD RESET que borraba localStorage

    initializeDefaultData();

    // Cargar datos globales en memoria
    allProducts = StorageManager.get('products', []) || [];
    allMovements = StorageManager.get('movements', []) || [];
    allUsers = StorageManager.get('users', []) || [];

    // Check login status - DESACTIVADO para forzar login siempre
    // const session = StorageManager.get('currentUser');
    // if (session) {
    //     currentUser = session;
    //     showMainApp();
    // } else {
    //     // Asegurar que se muestre el login
    //     const loginSection = document.getElementById('loginSection');
    //     const mainApp = document.getElementById('mainApp');
    //     if (loginSection) loginSection.classList.remove('hidden');
    //     if (mainApp) mainApp.classList.add('hidden');
    // }

    setupEventListeners();
    setupNavigation();
});
