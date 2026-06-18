// ===== Data Storage =====
class StorageManager {
    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from storage:', error);
            return defaultValue;
        }
    }

    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to storage:', error);
            return false;
        }
    }

    static remove(key) {
        localStorage.removeItem(key);
    }
}

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

    // Initialize products if not exists
    if (!StorageManager.get('products')) {
        const defaultProducts = [
            {
                id: 'prod_1',
                code: 'ACC001',
                name: 'Aceite Motor 5W-30',
                category: 'Lubricantes',
                price: 299.99,
                stock: 45,
                minStock: 10,
                description: 'Aceite sintético para motor'
            },
            {
                id: 'prod_2',
                code: 'FIL001',
                name: 'Filtro de Aceite',
                category: 'Filtros',
                price: 89.50,
                stock: 120,
                minStock: 20,
                description: 'Filtro de aceite universal'
            },
            {
                id: 'prod_3',
                code: 'BAL001',
                name: 'Balata Delantera',
                category: 'Frenos',
                price: 450.00,
                stock: 8,
                minStock: 15,
                description: 'Balata cerámica delantera'
            },
            {
                id: 'prod_4',
                code: 'BUJ001',
                name: 'Bujías Platinum',
                category: 'Sistema Eléctrico',
                price: 125.00,
                stock: 60,
                minStock: 25,
                description: 'Bujías de platino larga duración'
            }
        ];
        StorageManager.set('products', defaultProducts);
    }

    // Initialize movements if not exists
    if (!StorageManager.get('movements')) {
        StorageManager.set('movements', []);
    }
}

// ===== Global State =====
let currentUser = null;
let allProducts = [];
let allMovements = [];
let allUsers = [];

// ===== Utility Functions =====
function generateId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

function showNotification(message, type = 'info') {
    // Simple alert for now - could be enhanced with toast notifications
    alert(message);
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
    }
}

// Make closeModal globally available
window.closeModal = closeModal;

// ===== Login Functions =====
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    const users = StorageManager.get('users', []);
    const user = users.find(u => u.username === username && u.password === password && u.active);
    
    if (user) {
        currentUser = user;
        StorageManager.set('currentUser', user);
        
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        
        updateUserInfo();
        loadData();
        updateDashboard();
        
        // Hide users menu for non-admin
        if (user.role !== 'admin') {
            document.getElementById('usersNavItem').style.display = 'none';
        }
    } else {
        showNotification('Usuario o contraseña incorrectos', 'error');
    }
}

function handleLogout() {
    if (confirm('¿Está seguro que desea cerrar sesión?')) {
        currentUser = null;
        StorageManager.remove('currentUser');
        
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        document.getElementById('loginForm').reset();
    }
}

function updateUserInfo() {
    if (currentUser) {
        document.getElementById('currentUserName').textContent = currentUser.fullName;
        document.getElementById('currentUserRole').textContent = 
            currentUser.role === 'admin' ? 'Administrador' : 'Usuario';
        document.getElementById('userInitial').textContent = currentUser.fullName.charAt(0).toUpperCase();
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
}

// ===== Dashboard Functions =====
function updateDashboard() {
    loadData();
    
    // Update statistics
    const totalProducts = allProducts.length;
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    const lowStockProducts = allProducts.filter(p => p.stock <= p.minStock);
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
            <div class="movement-item">
                <div class="item-header">
                    <span class="item-title">${productName}</span>
                    <span class="badge badge-${movement.type}">${movement.type.toUpperCase()}</span>
                </div>
                <p class="item-subtitle">Cantidad: ${movement.quantity} | ${formatDate(movement.date)}</p>
            </div>
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
        <div class="product-item">
            <div class="item-header">
                <span class="item-title">${product.name}</span>
                <span class="badge badge-low-stock">Stock Bajo</span>
            </div>
            <p class="item-subtitle">Stock actual: ${product.stock} | Mínimo: ${product.minStock}</p>
        </div>
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
            p.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    if (filteredProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron productos</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredProducts.map(product => {
        const isLowStock = product.stock <= product.minStock;
        const stockBadge = isLowStock ? '<span class="badge badge-low-stock">Bajo</span>' : '';
        
        return `
            <tr>
                <td>${product.code}</td>
                <td>${product.name}</td>
                <td>${product.category}</td>
                <td>${product.stock} ${stockBadge}</td>
                <td>${formatCurrency(product.price)}</td>
                <td>${product.minStock}</td>
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
            </tr>
        `;
    }).join('');
}

function openAddProductModal() {
    document.getElementById('productModalTitle').textContent = 'Agregar Producto';
    document.getElementById('productForm').reset();
    document.getElementById('productId').value = '';
    openModal('productModal');
}

function editProduct(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('productModalTitle').textContent = 'Editar Producto';
    document.getElementById('productId').value = product.id;
    document.getElementById('productCode').value = product.code;
    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productStock').value = product.stock;
    document.getElementById('productMinStock').value = product.minStock;
    document.getElementById('productDescription').value = product.description || '';
    
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
    const productData = {
        code: document.getElementById('productCode').value,
        name: document.getElementById('productName').value,
        category: document.getElementById('productCategory').value,
        price: parseFloat(document.getElementById('productPrice').value),
        stock: parseInt(document.getElementById('productStock').value),
        minStock: parseInt(document.getElementById('productMinStock').value),
        description: document.getElementById('productDescription').value
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
    closeModal('productModal');
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
    
    tbody.innerHTML = filteredMovements.slice().reverse().map(movement => {
        const product = allProducts.find(p => p.id === movement.productId);
        const productName = product ? `${product.code} - ${product.name}` : 'Producto eliminado';
        
        return `
            <tr>
                <td>${formatDate(movement.date)}</td>
                <td><span class="badge badge-${movement.type}">${movement.type.toUpperCase()}</span></td>
                <td>${productName}</td>
                <td>${movement.quantity}</td>
                <td>${movement.userName}</td>
                <td>${movement.notes || '-'}</td>
            </tr>
        `;
    }).join('');
}

function openAddMovementModal() {
    document.getElementById('movementForm').reset();
    
    // Populate products dropdown
    const select = document.getElementById('movementProduct');
    select.innerHTML = '<option value="">Seleccione un producto...</option>';
    
    allProducts.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.code} - ${product.name} (Stock: ${product.stock})`;
        select.appendChild(option);
    });
    
    openModal('movementModal');
}

function handleMovementSubmit(event) {
    event.preventDefault();
    
    const type = document.getElementById('movementType').value;
    const productId = document.getElementById('movementProduct').value;
    const quantity = parseInt(document.getElementById('movementQuantity').value);
    const notes = document.getElementById('movementNotes').value;
    
    const product = allProducts.find(p => p.id === productId);
    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }
    
    // Validate stock for salida
    if (type === 'salida' && product.stock < quantity) {
        showNotification('Stock insuficiente para realizar esta salida', 'error');
        return;
    }
    
    // Update product stock
    if (type === 'entrada') {
        product.stock += quantity;
    } else {
        product.stock -= quantity;
    }
    
    // Save updated products
    const productIndex = allProducts.findIndex(p => p.id === productId);
    allProducts[productIndex] = product;
    StorageManager.set('products', allProducts);
    
    // Create movement record
    const movement = {
        id: generateId('mov'),
        type,
        productId,
        quantity,
        notes,
        date: new Date().toISOString(),
        userName: currentUser.fullName,
        userId: currentUser.id
    };
    
    allMovements.push(movement);
    StorageManager.set('movements', allMovements);
    
    showNotification('Movimiento registrado exitosamente', 'success');
    closeModal('movementModal');
    renderMovementsTable();
    updateDashboard();
}

// ===== Users Functions =====
function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    
    if (allUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No hay usuarios registrados</td></tr>';
        return;
    }
    
    tbody.innerHTML = allUsers.map(user => `
        <tr>
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
        </tr>
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
    closeModal('userModal');
}

// ===== Reports Functions =====
function generateInventoryReport() {
    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');
    
    const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
    
    let html = `
        <h4 class="mb-2">Reporte de Inventario Completo</h4>
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
        <h4 class="mb-2">Reporte de Movimientos</h4>
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
        <h4 class="mb-2">Reporte de Stock Bajo</h4>
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
        ` : '<p class="empty-state">No hay productos con stock bajo</p>'}
    `;
    
    reportResults.innerHTML = html;
    reportCard.style.display = 'block';
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

function printReport() {
    window.print();
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
    // Login
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Products
    document.getElementById('addProductBtn').addEventListener('click', openAddProductModal);
    document.getElementById('productForm').addEventListener('submit', handleProductSubmit);
    document.getElementById('searchProducts').addEventListener('input', (e) => {
        renderProductsTable(e.target.value);
    });
    
    // Movements
    document.getElementById('addMovementBtn').addEventListener('click', openAddMovementModal);
    document.getElementById('movementForm').addEventListener('submit', handleMovementSubmit);
    document.getElementById('searchMovements').addEventListener('input', (e) => {
        const filterType = document.getElementById('filterMovementType').value;
        renderMovementsTable(e.target.value, filterType);
    });
    document.getElementById('filterMovementType').addEventListener('change', (e) => {
        const searchTerm = document.getElementById('searchMovements').value;
        renderMovementsTable(searchTerm, e.target.value);
    });
    
    // Users
    document.getElementById('addUserBtn').addEventListener('click', openAddUserModal);
    document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    
    // Reports
    document.getElementById('generateInventoryReport').addEventListener('click', generateInventoryReport);
    document.getElementById('generateMovementsReport').addEventListener('click', generateMovementsReport);
    document.getElementById('generateLowStockReport').addEventListener('click', generateLowStockReport);
    document.getElementById('printReport').addEventListener('click', printReport);
    
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
