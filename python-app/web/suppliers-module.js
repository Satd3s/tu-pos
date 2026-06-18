// ===== MÓDULO DE PROVEEDORES Y UTILIDADES =====
// Este archivo contiene las funcionalidades extendidas para el sistema de inventario
// Incluye: Gestión de Proveedores, Cálculo de Utilidades, Reportes Avanzados

// ===== DATOS DE PROVEEDORES =====
// Usar var para evitar error de redeclaración si el script se carga múltiples veces
var allSuppliers = allSuppliers || [];

// Inicializar datos de proveedores
async function initializeSuppliers() {
    await loadSuppliers();
}

// Cargar proveedores desde el backend
async function loadSuppliers() {
    try {
        const result = await eel.get_suppliers()();
        if (result && result.success) {
            allSuppliers = result.data || [];
            renderSuppliersTable();
        }
    } catch (error) {
        console.error('Error cargando proveedores:', error);
        allSuppliers = [];
    }
}

// Limpiar todos los proveedores (para datos de prueba)
async function clearAllSuppliers() {
    if (!confirm('¿Está seguro que desea eliminar TODOS los proveedores?')) return;

    try {
        const result = await eel.clear_all_suppliers()();
        if (result && result.success) {
            allSuppliers = [];
            renderSuppliersTable();
            showNotification('Todos los proveedores han sido eliminados', 'success');
        } else {
            showNotification(result.error || 'Error al limpiar proveedores', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al limpiar proveedores', 'error');
    }
}

// ===== RENDERIZAR GRID DE PROVEEDORES (Estilo Tarjetas como Clientes) =====
function renderSuppliersTable(searchTerm = '') {
    // Buscar contenedor de grid (nuevo) o tabla (legacy)
    let container = document.getElementById('suppliersGrid');
    if (!container) {
        container = document.getElementById('suppliersTableBody');
    }
    if (!container) return;

    let filteredSuppliers = allSuppliers.filter(s => s.active !== false);

    if (searchTerm) {
        filteredSuppliers = filteredSuppliers.filter(s =>
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (s.contact && s.contact.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }

    // Cargar precios de proveedores
    const supplierPrices = StorageManager.get('supplierPrices', {});

    if (filteredSuppliers.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 64px; height: 64px; color: var(--gray-500); margin-bottom: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
                <h3 style="color: var(--gray-300); margin-bottom: 10px;">No hay proveedores registrados</h3>
                <p style="color: var(--gray-500);">Agrega tu primer proveedor para comenzar</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredSuppliers.map(supplier => {
        const pricesForSupplier = supplierPrices[supplier.id] || {};
        const pricesCount = Object.keys(pricesForSupplier).length;

        return `
            <div class="supplier-card" onclick="openSupplierDetail('${supplier.id}')" style="cursor: pointer;" title="Click para ver detalle">
                <div class="supplier-card-header">
                    <div class="supplier-avatar" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed);">
                        ${supplier.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="supplier-info">
                        <h4>${supplier.name}</h4>
                        <span class="supplier-code">${supplier.code || ''}</span>
                    </div>
                    ${pricesCount > 0 ? `<span class="badge badge-info">${pricesCount} productos</span>` : ''}
                </div>
                <div class="supplier-card-body">
                    ${supplier.contact ? `
                        <p>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                            </svg>
                            ${supplier.contact}
                        </p>
                    ` : ''}
                    ${supplier.phone ? `
                        <p>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            ${supplier.phone}
                        </p>
                    ` : ''}
                    ${supplier.email ? `
                        <p>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            ${supplier.email}
                        </p>
                    ` : ''}
                </div>
                <div class="supplier-card-footer" onclick="event.stopPropagation();">
                    <button class="btn-action edit" onclick="editSupplier('${supplier.id}')" title="Editar Proveedor">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                        </svg>
                    </button>
                    <button class="btn-action primary" onclick="openSupplierPricesModal('${supplier.id}')" title="Gestionar Precios">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </button>
                    <button class="btn-action delete" onclick="deleteSupplier('${supplier.id}')" title="Eliminar">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                    </button>
                </div>
            </div>
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
    document.getElementById('supplierPhone').value = supplier.phone || '';
    document.getElementById('supplierEmail').value = supplier.email || '';
    document.getElementById('supplierAddress').value = supplier.address || '';

    openModal('supplierModal');
}

async function deleteSupplier(supplierId) {
    if (!confirm('¿Está seguro que desea eliminar este proveedor?')) return;

    try {
        const result = await eel.delete_supplier(supplierId)();
        if (result && result.success) {
            await loadSuppliers();
            showNotification('Proveedor eliminado exitosamente', 'success');
        } else {
            showNotification(result.error || 'Error al eliminar proveedor', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al eliminar proveedor', 'error');
    }
}

async function handleSupplierSubmit(event) {
    event.preventDefault();

    const supplierId = document.getElementById('supplierId').value;
    const supplierData = {
        name: document.getElementById('supplierName').value,
        contact: document.getElementById('supplierContact').value || '',
        phone: document.getElementById('supplierPhone').value || '',
        email: document.getElementById('supplierEmail').value || '',
        address: document.getElementById('supplierAddress').value || '',
        notes: document.getElementById('supplierNotes')?.value || ''
    };

    if (supplierId) {
        supplierData.id = parseInt(supplierId);
    }

    try {
        const result = await eel.save_supplier(supplierData)();
        if (result && result.success) {
            closeModal('supplierModal');
            await loadSuppliers();
            showNotification(supplierId ? 'Proveedor actualizado' : 'Proveedor creado', 'success');
        } else {
            showNotification(result.error || 'Error al guardar proveedor', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error al guardar proveedor', 'error');
    }
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

// ===== MODAL DE DETALLE DE PROVEEDOR (Extendido) =====
function openSupplierDetail(supplierId) {
    const supplier = allSuppliers.find(s => s.id === supplierId);
    if (!supplier) {
        showNotification('Proveedor no encontrado', 'error');
        return;
    }

    // Obtener estadísticas
    const supplierPrices = StorageManager.get('supplierPrices', {});
    const pricesForSupplier = supplierPrices[supplierId] || {};
    const pricesCount = Object.keys(pricesForSupplier).length;

    // Calcular valor total de productos con precio asignado
    const products = StorageManager.get('products', []);
    let totalCostValue = 0;
    let totalPublicValue = 0;

    Object.entries(pricesForSupplier).forEach(([productId, cost]) => {
        const product = products.find(p => p.id === productId);
        if (product) {
            totalCostValue += cost * (product.stock || 0);
            totalPublicValue += (product.price || 0) * (product.stock || 0);
        }
    });

    const potentialProfit = totalPublicValue - totalCostValue;
    const avgMargin = totalCostValue > 0 ? ((potentialProfit / totalCostValue) * 100) : 0;

    // Crear o reutilizar modal
    let modal = document.getElementById('supplierDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'supplierDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 750px;">
            <div class="modal-header" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white;">
                <h3>📦 Detalle del Proveedor</h3>
                <button class="modal-close" onclick="closeModal('supplierDetailModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                
                <!-- Cabecera con info principal -->
                <div style="padding: 20px; background: var(--dark-surface); border-bottom: 1px solid var(--dark-border);">
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <div style="width: 70px; height: 70px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: bold; color: white;">
                            ${supplier.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <h2 style="margin: 0; color: var(--gray-100); font-size: 1.4rem;">${supplier.name}</h2>
                            <p style="margin: 5px 0 0; color: var(--gray-400);">
                                <span class="badge badge-info">${supplier.code}</span>
                                ${supplier.active !== false ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Inactivo</span>'}
                            </p>
                        </div>
                        <div>
                            <button class="btn btn-secondary" onclick="editSupplier('${supplier.id}'); closeModal('supplierDetailModal');" style="margin-right: 8px;">
                                ✏️ Editar
                            </button>
                            <button class="btn btn-primary" onclick="openSupplierPricesModal('${supplier.id}'); closeModal('supplierDetailModal');" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); border: none;">
                                💰 Gestionar Precios
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Información de contacto -->
                <div style="padding: 20px; border-bottom: 1px solid var(--dark-border);">
                    <h4 style="color: var(--gray-300); font-size: 0.9rem; margin-bottom: 15px; text-transform: uppercase;">📇 Información de Contacto</h4>
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Persona de Contacto</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.contact || '-'}</p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Teléfono</p>
                            <p style="color: var(--gray-200); font-weight: 500;">
                                ${supplier.phone ? `<a href="tel:${supplier.phone}" style="color: var(--primary-400);">${supplier.phone}</a>` : '-'}
                            </p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Correo Electrónico</p>
                            <p style="color: var(--gray-200); font-weight: 500;">
                                ${supplier.email ? `<a href="mailto:${supplier.email}" style="color: var(--primary-400);">${supplier.email}</a>` : '-'}
                            </p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Dirección</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.address || '-'}</p>
                        </div>
                    </div>
                </div>

                <!-- Información fiscal y comercial -->
                <div style="padding: 20px; border-bottom: 1px solid var(--dark-border); background: var(--dark-surface);">
                    <h4 style="color: var(--gray-300); font-size: 0.9rem; margin-bottom: 15px; text-transform: uppercase;">🏢 Información Comercial</h4>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">RFC</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.rfc || '-'}</p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Días de Crédito</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.creditDays || 0} días</p>
                        </div>
                        <div>
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Cuenta Bancaria</p>
                            <p style="color: var(--gray-200); font-weight: 500;">${supplier.bankAccount || '-'}</p>
                        </div>
                    </div>
                    ${supplier.notes ? `
                        <div style="margin-top: 15px; padding: 10px; background: var(--dark-bg); border-radius: 8px;">
                            <p style="color: var(--gray-500); font-size: 0.8rem; margin-bottom: 3px;">Notas</p>
                            <p style="color: var(--gray-300); font-size: 0.9rem;">${supplier.notes}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- Estadísticas -->
                <div style="padding: 20px;">
                    <h4 style="color: var(--gray-300); font-size: 0.9rem; margin-bottom: 15px; text-transform: uppercase;">📊 Estadísticas</h4>
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center;">
                        <div style="background: var(--dark-surface); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Productos</p>
                            <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-400);">${pricesCount}</p>
                        </div>
                        <div style="background: var(--dark-surface); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Costo Inventario</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--warning-400);">$${totalCostValue.toFixed(2)}</p>
                        </div>
                        <div style="background: var(--dark-surface); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Valor Público</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--info-400);">$${totalPublicValue.toFixed(2)}</p>
                        </div>
                        <div style="background: var(--dark-surface); padding: 15px; border-radius: 10px; border: 1px solid var(--dark-border);">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 5px;">Margen Promedio</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: ${avgMargin >= 30 ? 'var(--success-400)' : avgMargin >= 15 ? 'var(--warning-400)' : 'var(--danger-400)'};">
                                ${avgMargin.toFixed(1)}%
                            </p>
                        </div>
                    </div>
                </div>

            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('supplierDetailModal')">Cerrar</button>
            </div>
        </div>
    `;

    openModal('supplierDetailModal');
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
window.openSupplierDetail = openSupplierDetail;
window.clearAllSuppliers = clearAllSuppliers;
