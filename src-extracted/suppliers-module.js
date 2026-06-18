// ===== MÓDULO DE PROVEEDORES Y UTILIDADES =====
// Este archivo contiene las funcionalidades extendidas para el sistema de inventario
// Incluye: Gestión de Proveedores, Cálculo de Utilidades, Reportes Avanzados

// ===== DATOS DE PROVEEDORES =====
let allSuppliers = [];

// Inicializar datos de proveedores por defecto
function initializeSuppliers() {
    if (!StorageManager.get('suppliers')) {
        const defaultSuppliers = [];
        StorageManager.set('suppliers', defaultSuppliers);
    }
}

// Cargar proveedores
function loadSuppliers() {
    allSuppliers = StorageManager.get('suppliers', []);
}

// ===== RENDERIZAR TABLA DE PROVEEDORES =====
function renderSuppliersTable(searchTerm = '') {
    const tbody = document.getElementById('suppliersTableBody');
    if (!tbody) return;

    let filteredSuppliers = allSuppliers.filter(s => s.active !== false);

    if (searchTerm) {
        filteredSuppliers = filteredSuppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.contact.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (filteredSuppliers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No se encontraron proveedores</td></tr>';
        return;
    }

    // Cargar precios de proveedores
    const supplierPrices = StorageManager.get('supplierPrices', {});

    tbody.innerHTML = filteredSuppliers.map(supplier => {
        // Contar productos con precio asignado para este proveedor
        const pricesForSupplier = supplierPrices[supplier.id] || {};
        const pricesCount = Object.keys(pricesForSupplier).length;

        return `
            <tr class="supplier-row" onclick="openSupplierPricesModal('${supplier.id}')" style="cursor: pointer;">
                <td>${supplier.code}</td>
                <td><strong class="supplier-name">${supplier.name}</strong></td>
                <td>${supplier.contact}</td>
                <td>${supplier.phone}</td>
                <td>${supplier.email}</td>
                <td><span class="badge badge-info">${pricesCount} precios</span></td>
                <td onclick="event.stopPropagation();">
                    <div class="action-btns">
                        <button class="btn-action edit" onclick="editSupplier('${supplier.id}')" title="Editar Proveedor">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                            </svg>
                        </button>
                        ${currentUser && currentUser.role === 'admin' ? `
                        <button class="btn-action delete" onclick="deleteSupplier('${supplier.id}')" title="Eliminar">
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

// ===== MODAL DE PROVEEDORES =====
function openAddSupplierModal() {
    const modal = document.getElementById('supplierModal');
    if (!modal) return;

    document.getElementById('supplierModalTitle').textContent = 'Agregar Proveedor';
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';
    openModal('supplierModal');
}

function editSupplier(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    document.getElementById('supplierModalTitle').textContent = 'Editar Proveedor';
    document.getElementById('supplierId').value = supplier.id;
    document.getElementById('supplierCode').value = supplier.code;
    document.getElementById('supplierName').value = supplier.name;
    document.getElementById('supplierContact').value = supplier.contact;
    document.getElementById('supplierPhone').value = supplier.phone;
    document.getElementById('supplierEmail').value = supplier.email;
    document.getElementById('supplierAddress').value = supplier.address || '';

    openModal('supplierModal');
}

function deleteSupplier(supplierId) {
    if (currentUser.role !== 'admin') {
        showNotification('Solo los administradores pueden eliminar proveedores', 'error');
        return;
    }

    // Verificar si hay productos asociados
    const productsWithSupplier = allProducts.filter(p => p.supplierId === supplierId);
    if (productsWithSupplier.length > 0) {
        showNotification(`No se puede eliminar. Hay ${productsWithSupplier.length} producto(s) asociado(s) a este proveedor`, 'error');
        return;
    }

    if (confirm('¿Está seguro que desea eliminar este proveedor?')) {
        allSuppliers = allSuppliers.filter(s => s.id !== supplierId);
        StorageManager.set('suppliers', allSuppliers);
        renderSuppliersTable();
        showNotification('Proveedor eliminado exitosamente', 'success');
    }
}

function handleSupplierSubmit(event) {
    event.preventDefault();

    const supplierId = document.getElementById('supplierId').value;
    const supplierData = {
        code: document.getElementById('supplierCode').value,
        name: document.getElementById('supplierName').value,
        contact: document.getElementById('supplierContact').value,
        phone: document.getElementById('supplierPhone').value,
        email: document.getElementById('supplierEmail').value,
        address: document.getElementById('supplierAddress').value,
        active: true
    };

    if (supplierId) {
        // Edit existing supplier
        const index = allSuppliers.findIndex(s => s.id === supplierId);
        if (index !== -1) {
            allSuppliers[index] = { ...allSuppliers[index], ...supplierData };
            showNotification('Proveedor actualizado exitosamente', 'success');
        }
    } else {
        // Add new supplier
        const newSupplier = {
            id: generateId('supp'),
            ...supplierData
        };
        allSuppliers.push(newSupplier);
        showNotification('Proveedor agregado exitosamente', 'success');
    }

    StorageManager.set('suppliers', allSuppliers);
    renderSuppliersTable();

    // Resetear el formulario antes de cerrar el modal
    document.getElementById('supplierForm').reset();
    document.getElementById('supplierId').value = '';

    closeModal('supplierModal');
}

// ===== CÁLCULO DE UTILIDAD =====
function calculateProfit(cost, publicPrice) {
    const profit = publicPrice - cost;
    const profitPercent = cost > 0 ? ((profit / cost) * 100) : 0;
    return {
        profit: profit,
        profitPercent: profitPercent
    };
}

function calculateProductUtility(product) {
    if (!product.cost || !product.publicPrice) {
        return { profit: 0, profitPercent: 0, totalProfit: 0 };
    }

    const unitProfit = product.publicPrice - product.cost;
    const profitPercent = product.cost > 0 ? ((unitProfit / product.cost) * 100) : 0;
    const totalProfit = unitProfit * product.stock;

    return {
        profit: unitProfit,
        profitPercent: profitPercent,
        totalProfit: totalProfit
    };
}

// ===== REPORTES DE UTILIDAD =====
function generateProfitReport() {
    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');

    if (!reportResults || !reportCard) return;

    // Calcular utilidades
    const productsWithProfit = allProducts.map(p => {
        const supplier = allSuppliers.find(s => s.id === p.supplierId);
        const utility = calculateProductUtility(p);
        return {
            ...p,
            supplierName: supplier ? supplier.name : 'Sin proveedor',
            ...utility
        };
    });

    const totalInventoryCost = productsWithProfit.reduce((sum, p) => sum + ((p.cost || 0) * p.stock), 0);
    const totalInventoryValue = productsWithProfit.reduce((sum, p) => sum + ((p.publicPrice || 0) * p.stock), 0);
    const totalProfit = totalInventoryValue - totalInventoryCost;
    const overallProfitPercent = totalInventoryCost > 0 ? ((totalProfit / totalInventoryCost) * 100) : 0;

    let html = `
        <h4 class="mb-2">Reporte de Utilidades</h4>
        <p class="mb-3"><strong>Fecha:</strong> ${formatDate(new Date())}</p>
        
        <div class="profit-summary mb-3">
            <div class="profit-stats-grid">
                <div class="profit-stat">
                    <p class="stat-label">Costo Total Inventario</p>
                    <p class="stat-value-cost">${formatCurrency(totalInventoryCost)}</p>
                </div>
                <div class="profit-stat">
                    <p class="stat-label">Valor Total Inventario</p>
                    <p class="stat-value-value">${formatCurrency(totalInventoryValue)}</p>
                </div>
                <div class="profit-stat">
                    <p class="stat-label">Utilidad Total</p>
                    <p class="stat-value-profit">${formatCurrency(totalProfit)}</p>
                </div>
                <div class="profit-stat">
                    <p class="stat-label">Margen de Utilidad</p>
                    <p class="stat-value-percent">${overallProfitPercent.toFixed(2)}%</p>
                </div>
            </div>
        </div>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Código</th>
                        <th>Producto</th>
                        <th>Proveedor</th>
                        <th>Stock</th>
                        <th>Costo Unit.</th>
                        <th>Precio Púb.</th>
                        <th>Utilidad Unit.</th>
                        <th>% Utilidad</th>
                        <th>Utilidad Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${productsWithProfit.map(p => {
        const profitClass = p.profitPercent >= 30 ? 'profit-high' : p.profitPercent >= 15 ? 'profit-medium' : 'profit-low';
        return `
                            <tr>
                                <td>${p.code || '-'}</td>
                                <td>${p.name}</td>
                                <td>${p.supplierName}</td>
                                <td>${p.stock}</td>
                                <td>${formatCurrency(p.cost || 0)}</td>
                                <td>${formatCurrency(p.publicPrice || 0)}</td>
                                <td>${formatCurrency(p.profit)}</td>
                                <td><span class="badge ${profitClass}">${p.profitPercent.toFixed(1)}%</span></td>
                                <td>${formatCurrency(p.totalProfit)}</td>
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

function generateSupplierComparisonReport() {
    const reportResults = document.getElementById('reportResults');
    const reportCard = document.getElementById('reportResultsCard');

    if (!reportResults || !reportCard) return;

    // Agrupar productos por proveedor y calcular estadísticas
    const supplierStats = {};

    allProducts.forEach(product => {
        const supplierId = product.supplierId || 'sin_proveedor';
        const supplier = allSuppliers.find(s => s.id === supplierId);
        const supplierName = supplier ? supplier.name : 'Sin proveedor';

        if (!supplierStats[supplierId]) {
            supplierStats[supplierId] = {
                name: supplierName,
                products: 0,
                totalCost: 0,
                totalValue: 0,
                totalProfit: 0,
                averageProfitPercent: 0,
                productsList: []
            };
        }

        const cost = (product.cost || 0) * product.stock;
        const value = (product.publicPrice || 0) * product.stock;
        const profit = value - cost;
        const profitPercent = cost > 0 ? ((profit / cost) * 100) : 0;

        supplierStats[supplierId].products++;
        supplierStats[supplierId].totalCost += cost;
        supplierStats[supplierId].totalValue += value;
        supplierStats[supplierId].totalProfit += profit;
        supplierStats[supplierId].productsList.push({
            name: product.name,
            profitPercent: profitPercent
        });
    });

    // Calcular promedio de utilidad por proveedor
    Object.keys(supplierStats).forEach(supplierId => {
        const stats = supplierStats[supplierId];
        if (stats.products > 0) {
            const avgProfit = stats.productsList.reduce((sum, p) => sum + p.profitPercent, 0) / stats.products;
            stats.averageProfitPercent = avgProfit;
        }
    });

    // Ordenar por utilidad total (mayor a menor)
    const sortedSuppliers = Object.entries(supplierStats)
        .map(([id, stats]) => ({ id, ...stats }))
        .sort((a, b) => b.totalProfit - a.totalProfit);

    let html = `
        <h4 class="mb-2">Comparativa de Proveedores</h4>
        <p class="mb-3"><strong>Fecha:</strong> ${formatDate(new Date())}</p>
        <p class="mb-3">Análisis comparativo de rentabilidad por proveedor</p>
        
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Proveedor</th>
                        <th>Productos</th>
                        <th>Costo Total</th>
                        <th>Valor Total</th>
                        <th>Utilidad Total</th>
                        <th>% Utilidad Prom.</th>
                        <th>Ranking</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedSuppliers.map((supplier, index) => {
        const profitClass = supplier.averageProfitPercent >= 30 ? 'profit-high' :
            supplier.averageProfitPercent >= 15 ? 'profit-medium' : 'profit-low';
        const rankBadge = index === 0 ? 'badge-success' : index === 1 ? 'badge-entrada' : 'badge-usuario';

        return `
                            <tr>
                                <td><strong>${supplier.name}</strong></td>
                                <td>${supplier.products}</td>
                                <td>${formatCurrency(supplier.totalCost)}</td>
                                <td>${formatCurrency(supplier.totalValue)}</td>
                                <td>${formatCurrency(supplier.totalProfit)}</td>
                                <td><span class="badge ${profitClass}">${supplier.averageProfitPercent.toFixed(1)}%</span></td>
                                <td><span class="badge ${rankBadge}">#${index + 1}</span></td>
                            </tr>
                        `;
    }).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="mt-3">
            <h5>Recomendaciones:</h5>
            <ul class="recommendations-list">
                ${sortedSuppliers[0] ? `<li><strong>Mejor proveedor:</strong> ${sortedSuppliers[0].name} - Mayor utilidad total (${formatCurrency(sortedSuppliers[0].totalProfit)})</li>` : ''}
                ${sortedSuppliers.filter(s => s.averageProfitPercent < 15).map(s =>
        `<li><strong>Atención:</strong> ${s.name} - Margen de utilidad bajo (${s.averageProfitPercent.toFixed(1)}%)</li>`
    ).join('')}
            </ul>
        </div>
    `;

    reportResults.innerHTML = html;
    reportCard.style.display = 'block';
    reportCard.scrollIntoView({ behavior: 'smooth' });
}

// ===== PRECIOS POR PROVEEDOR =====
let currentSupplierId = null;

function openSupplierPricesModal(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) return;

    currentSupplierId = supplierId;

    // Actualizar título del modal
    document.getElementById('supplierPricesModalTitle').textContent = `Precios de: ${supplier.name}`;

    // Limpiar buscador y resultados
    document.getElementById('searchSupplierProducts').value = '';
    document.getElementById('searchResultsTableBody').innerHTML = '<tr><td colspan="6" class="empty-state">Escriba para buscar productos...</td></tr>';

    openModal('supplierPricesModal');

    // Enfocar el buscador
    setTimeout(() => {
        document.getElementById('searchSupplierProducts').focus();
    }, 100);
}

// La función renderAssignedPrices ya no se necesita

function searchProductsForPricing(searchTerm) {
    const tbody = document.getElementById('searchResultsTableBody');

    if (!searchTerm || searchTerm.length < 2) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Escriba para buscar productos...</td></tr>';
        return;
    }

    const products = StorageManager.get('products', []);
    const allSupplierPrices = StorageManager.get('supplierPrices', {});
    const pricesForSupplier = allSupplierPrices[currentSupplierId] || {};

    // Buscar productos que coincidan
    const searchLower = searchTerm.toLowerCase();
    const matchingProducts = products.filter(p =>
        p.code.toLowerCase().includes(searchLower) ||
        (p.partNumber && p.partNumber.toLowerCase().includes(searchLower)) ||
        p.name.toLowerCase().includes(searchLower)
    ).slice(0, 10); // Limitar a 10 resultados

    if (matchingProducts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No se encontraron productos</td></tr>';
        return;
    }

    tbody.innerHTML = matchingProducts.map(product => {
        const publicPrice = product.price || 0;
        const existingPrice = pricesForSupplier[product.id] || '';

        let marginDisplay = '-';
        let marginClass = '';

        // Calcular margen si hay precio existente
        if (existingPrice && publicPrice > 0) {
            const margin = ((publicPrice - existingPrice) / existingPrice * 100);
            marginDisplay = margin.toFixed(1) + '%';
            marginClass = margin >= 30 ? 'profit-high' : margin >= 15 ? 'profit-medium' : 'profit-low';
        }

        return `
            <tr>
                <td><strong>${product.code}</strong></td>
                <td>${product.partNumber || '-'}</td>
                <td>${product.name}</td>
                <td>${formatCurrency(publicPrice)}</td>
                <td>
                    <input type="number" 
                           class="form-input price-input" 
                           id="search_price_${product.id}" 
                           value="${existingPrice}"
                           placeholder="0.00"
                           step="0.01" 
                           min="0"
                           onchange="handlePriceInput('${product.id}', this.value)">
                </td>
                <td>
                    <span class="badge ${marginClass}" id="search_margin_${product.id}">${marginDisplay}</span>
                </td>
            </tr>
        `;
    }).join('');
}

function handlePriceInput(productId, priceValue) {
    const price = parseFloat(priceValue) || 0;

    // Si es válido o 0/vacío (para borrar), llamamos a updateSupplierPrice
    // Pero primero verificamos si realmente cambió
    const allSupplierPrices = StorageManager.get('supplierPrices', {});
    const currentPrice = allSupplierPrices[currentSupplierId]?.[productId] || 0;

    if (price === currentPrice) return;

    updateSupplierPrice(productId, priceValue);

    // Actualizamos el display del margen en la fila actual
    updateMarginDisplayInSearch(productId, price);

    if (price > 0) {
        showNotification('Precio guardado', 'success');
    } else {
        showNotification('Precio eliminado', 'info');
    }
}

function updateMarginDisplayInSearch(productId, cost) {
    const marginSpan = document.getElementById(`search_margin_${productId}`);
    if (!marginSpan) return;

    const products = StorageManager.get('products', []);
    const product = products.find(p => p.id === productId);

    if (!product) return;

    const publicPrice = product.price || 0;

    if (cost > 0 && publicPrice > 0) {
        const margin = ((publicPrice - cost) / cost * 100);
        marginSpan.textContent = margin.toFixed(1) + '%';
        marginSpan.className = 'badge ' + (margin >= 30 ? 'profit-high' : margin >= 15 ? 'profit-medium' : 'profit-low');
    } else {
        marginSpan.textContent = '-';
        marginSpan.className = 'badge';
    }
}

function updateSupplierPrice(productId, priceValue) {
    if (!currentSupplierId) return;

    // Cargar precios existentes
    const allSupplierPrices = StorageManager.get('supplierPrices', {});

    // Inicializar objeto para este proveedor si no existe
    if (!allSupplierPrices[currentSupplierId]) {
        allSupplierPrices[currentSupplierId] = {};
    }

    const price = parseFloat(priceValue) || 0;

    if (price > 0) {
        // Guardar precio
        allSupplierPrices[currentSupplierId][productId] = price;
    } else {
        // Si el precio es 0 o vacío, eliminar la entrada
        delete allSupplierPrices[currentSupplierId][productId];
    }

    // Guardar en localStorage
    StorageManager.set('supplierPrices', allSupplierPrices);

    // Actualizar el margen mostrado
    updateMarginDisplay(productId, price);
}

function updateMarginDisplay(productId, cost) {
    const marginSpan = document.getElementById(`assigned_margin_${productId}`);
    if (!marginSpan) return;

    const products = StorageManager.get('products', []);
    const product = products.find(p => p.id === productId);

    if (!product) return;

    const publicPrice = product.price || 0;

    if (cost > 0 && publicPrice > 0) {
        const margin = ((publicPrice - cost) / cost * 100);
        marginSpan.textContent = margin.toFixed(1) + '%';
        marginSpan.className = 'badge ' + (margin >= 30 ? 'profit-high' : margin >= 15 ? 'profit-medium' : 'profit-low');
    } else {
        marginSpan.textContent = '-';
        marginSpan.className = 'badge';
    }
}

function closeSupplierPricesModal() {
    currentSupplierId = null;
    closeModal('supplierPricesModal');
    renderSuppliersTable(); // Actualizar conteo de precios
}

// Obtener el mejor precio para un producto
function getBestPriceForProduct(productId) {
    const allSupplierPrices = StorageManager.get('supplierPrices', {});
    let bestPrice = null;
    let bestSupplierId = null;

    Object.entries(allSupplierPrices).forEach(([supplierId, prices]) => {
        const price = prices[productId];
        if (price && (bestPrice === null || price < bestPrice)) {
            bestPrice = price;
            bestSupplierId = supplierId;
        }
    });

    if (bestSupplierId) {
        const supplier = allSuppliers.find(s => s.id === bestSupplierId);
        return {
            price: bestPrice,
            supplierId: bestSupplierId,
            supplierName: supplier ? supplier.name : 'Desconocido'
        };
    }

    return null;
}

// Obtener todos los precios de un producto
function getAllPricesForProduct(productId) {
    const allSupplierPrices = StorageManager.get('supplierPrices', {});
    const prices = [];

    Object.entries(allSupplierPrices).forEach(([supplierId, supplierPrices]) => {
        const price = supplierPrices[productId];
        if (price) {
            const supplier = allSuppliers.find(s => s.id === supplierId);
            prices.push({
                supplierId: supplierId,
                supplierName: supplier ? supplier.name : 'Desconocido',
                price: price
            });
        }
    });

    // Ordenar por precio (menor a mayor)
    return prices.sort((a, b) => a.price - b.price);
}

// Exportar funciones globales
window.editSupplier = editSupplier;
window.deleteSupplier = deleteSupplier;
window.renderSuppliersTable = renderSuppliersTable;
window.openAddSupplierModal = openAddSupplierModal;
window.handleSupplierSubmit = handleSupplierSubmit;
window.generateProfitReport = generateProfitReport;
window.generateSupplierComparisonReport = generateSupplierComparisonReport;
window.initializeSuppliers = initializeSuppliers;
window.loadSuppliers = loadSuppliers;
window.openSupplierPricesModal = openSupplierPricesModal;
window.updateSupplierPrice = updateSupplierPrice;
window.closeSupplierPricesModal = closeSupplierPricesModal;
window.getBestPriceForProduct = getBestPriceForProduct;
window.getAllPricesForProduct = getAllPricesForProduct;
window.searchProductsForPricing = searchProductsForPricing;
window.handlePriceInput = handlePriceInput;
