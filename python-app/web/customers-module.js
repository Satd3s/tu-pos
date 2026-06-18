// =============================================================================
// MÓDULO DE CLIENTES Y CRÉDITOS
// =============================================================================

let customersCache = [];
let selectedCustomer = null;

// ===== Inicialización =====
async function initCustomersModule() {
    console.log('Inicializando módulo de clientes...');
    await loadCustomers();
    setupCustomerSearch();
}

// ===== Cargar Clientes =====
async function loadCustomers() {
    try {
        const result = await eel.get_customers()();
        if (result.success) {
            customersCache = result.data;
            renderCustomersGrid();
        }
    } catch (e) {
        console.error('Error cargando clientes:', e);
    }
}

// ===== Renderizar Grid de Clientes =====
function renderCustomersGrid() {
    const grid = document.getElementById('customersGrid');
    if (!grid) return;

    if (customersCache.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 60px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 64px; height: 64px; color: var(--gray-500); margin-bottom: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
                <h3 style="color: var(--gray-300); margin-bottom: 10px;">No hay clientes registrados</h3>
                <p style="color: var(--gray-500);">Agrega tu primer cliente para comenzar</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = customersCache.map(customer => {
        const hasDebt = customer.current_balance > 0;
        const creditEnabled = customer.allow_credit;

        return `
            <div class="customer-card ${hasDebt ? 'has-debt' : ''}" onclick="openCustomerDetail(${customer.id})">
                <div class="customer-card-header">
                    <div class="customer-avatar">
                        ${customer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div class="customer-info">
                        <h4>${customer.name}</h4>
                        <span class="customer-code">${customer.code || ''}</span>
                    </div>
                    ${creditEnabled ? '<span class="badge badge-credit">Crédito</span>' : ''}
                </div>
                <div class="customer-card-body">
                    ${customer.phone ? `<p><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg> ${customer.phone}</p>` : ''}
                    ${customer.email ? `<p><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="14" height="14"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg> ${customer.email}</p>` : ''}
                </div>
                ${hasDebt ? `
                    <div class="customer-card-footer debt">
                        <span>Saldo:</span>
                        <strong>$${customer.current_balance.toFixed(2)}</strong>
                    </div>
                ` : creditEnabled ? `
                    <div class="customer-card-footer available">
                        <span>Disponible:</span>
                        <strong>$${(customer.credit_limit - customer.current_balance).toFixed(2)}</strong>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

// ===== Configurar Búsqueda =====
function setupCustomerSearch() {
    const searchInput = document.getElementById('customerSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (term.length < 2) {
            renderCustomersGrid();
            return;
        }

        const filtered = customersCache.filter(c =>
            c.name.toLowerCase().includes(term) ||
            (c.phone && c.phone.includes(term)) ||
            (c.code && c.code.toLowerCase().includes(term))
        );

        const grid = document.getElementById('customersGrid');
        if (filtered.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--gray-500);">No se encontraron clientes</div>`;
            return;
        }

        customersCache = filtered;
        renderCustomersGrid();
        customersCache = []; // Reset para próxima carga completa
        loadCustomers();
    });
}

// ===== Abrir Modal de Nuevo/Editar Cliente =====
function openCustomerModal(customerId = null) {
    const modal = document.getElementById('customerModal');
    if (!modal) {
        createCustomerModal();
    }

    const form = document.getElementById('customerForm');
    form.reset();
    document.getElementById('customerId').value = '';
    document.getElementById('customerModalTitle').textContent = customerId ? 'Editar Cliente' : 'Nuevo Cliente';

    if (customerId) {
        const customer = customersCache.find(c => c.id === customerId);
        if (customer) {
            document.getElementById('customerId').value = customer.id;
            document.getElementById('customerName').value = customer.name;
            document.getElementById('customerPhone').value = customer.phone || '';
            document.getElementById('customerEmail').value = customer.email || '';
            document.getElementById('customerAddress').value = customer.address || '';
            document.getElementById('customerRfc').value = customer.rfc || '';
            document.getElementById('customerAllowCredit').checked = customer.allow_credit;
            document.getElementById('customerCreditLimit').value = customer.credit_limit || 0;
            document.getElementById('customerNotes').value = customer.notes || '';
        }
    }

    openModal('customerModal');
    document.getElementById('customerName').focus();
}

// ===== Guardar Cliente =====
async function saveCustomer() {
    const customerData = {
        id: document.getElementById('customerId').value || null,
        name: document.getElementById('customerName').value.trim(),
        phone: document.getElementById('customerPhone').value.trim(),
        email: document.getElementById('customerEmail').value.trim(),
        address: document.getElementById('customerAddress').value.trim(),
        rfc: document.getElementById('customerRfc').value.trim().toUpperCase(),
        allow_credit: document.getElementById('customerAllowCredit').checked,
        credit_limit: parseFloat(document.getElementById('customerCreditLimit').value) || 0,
        notes: document.getElementById('customerNotes').value.trim()
    };

    if (!customerData.name) {
        showNotification('El nombre es obligatorio', 'error');
        return;
    }

    try {
        const result = await eel.save_customer(customerData)();
        if (result.success) {
            showNotification(result.message, 'success');
            closeModal('customerModal');
            await loadCustomers();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (e) {
        showNotification('Error al guardar cliente', 'error');
        console.error(e);
    }
}

// ===== Ver Detalle de Cliente =====
async function openCustomerDetail(customerId) {
    try {
        const result = await eel.get_customer(customerId)();
        if (!result.success) {
            showNotification(result.error, 'error');
            return;
        }

        selectedCustomer = result.data;

        // Crear o mostrar modal de detalle
        let modal = document.getElementById('customerDetailModal');
        if (!modal) {
            createCustomerDetailModal();
            modal = document.getElementById('customerDetailModal');
        }

        renderCustomerDetail(selectedCustomer);
        openModal('customerDetailModal');

    } catch (e) {
        console.error('Error cargando cliente:', e);
        showNotification('Error al cargar cliente', 'error');
    }
}

// ===== Renderizar Detalle de Cliente =====
function renderCustomerDetail(customer) {
    const content = document.getElementById('customerDetailContent');
    if (!content) return;

    const creditAvailable = customer.credit_limit - customer.current_balance;

    content.innerHTML = `
        <div class="customer-detail-header">
            <div class="customer-detail-avatar">
                ${customer.name.substring(0, 2).toUpperCase()}
            </div>
            <div class="customer-detail-info">
                <h2>${customer.name}</h2>
                <span class="customer-code">${customer.code || ''}</span>
                ${customer.allow_credit ? '<span class="badge badge-credit">Crédito Habilitado</span>' : ''}
            </div>
            <div class="customer-detail-actions">
                <button class="btn btn-secondary" onclick="openCustomerModal(${customer.id})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                    Editar
                </button>
            </div>
        </div>
        
        <div class="customer-detail-grid">
            <div class="customer-contact">
                <h4>Información de Contacto</h4>
                ${customer.phone ? `<p><strong>Teléfono:</strong> ${customer.phone}</p>` : ''}
                ${customer.email ? `<p><strong>Email:</strong> ${customer.email}</p>` : ''}
                ${customer.address ? `<p><strong>Dirección:</strong> ${customer.address}</p>` : ''}
                ${customer.rfc ? `<p><strong>RFC:</strong> ${customer.rfc}</p>` : ''}
                ${customer.notes ? `<p><strong>Notas:</strong> ${customer.notes}</p>` : ''}
            </div>
            
            ${customer.allow_credit ? `
                <div class="customer-credit-summary">
                    <h4>Estado de Cuenta</h4>
                    <div class="credit-stats">
                        <div class="credit-stat">
                            <span class="credit-stat-label">Límite de Crédito</span>
                            <span class="credit-stat-value">$${customer.credit_limit.toFixed(2)}</span>
                        </div>
                        <div class="credit-stat ${customer.current_balance > 0 ? 'danger' : ''}">
                            <span class="credit-stat-label">Saldo Actual</span>
                            <span class="credit-stat-value">$${customer.current_balance.toFixed(2)}</span>
                        </div>
                        <div class="credit-stat success">
                            <span class="credit-stat-label">Disponible</span>
                            <span class="credit-stat-value">$${creditAvailable.toFixed(2)}</span>
                        </div>
                    </div>
                    
                    
                    <div class="credit-actions">
                        ${customer.current_balance > 0 ? `
                            <button class="btn btn-success" onclick="openCustomerPaymentModal(${customer.id})">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                                Registrar Abono
                            </button>
                        ` : `
                            <span style="color: var(--success-400); font-size: 0.9rem;">
                                ✅ Cuenta al corriente
                            </span>
                        `}
                    </div>
                </div>
            ` : ''}
        </div>
        
        ${customer.credit_history && customer.credit_history.length > 0 ? `
            <div class="customer-history">
                <h4>Historial de Movimientos</h4>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Referencia</th>
                            <th>Monto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${customer.credit_history.map(mov => `
                            <tr onclick="showMovementDetail(${JSON.stringify(mov).replace(/"/g, '&quot;')}, '${customer.name}')" 
                                style="cursor: pointer;" title="Click para ver detalle">
                                <td>${new Date(mov.created_at).toLocaleDateString('es-MX')}</td>
                                <td>
                                    <span class="badge ${mov.type === 'payment' ? 'badge-success' : 'badge-danger'}">
                                        ${mov.type === 'payment' ? 'Abono' : 'Cargo'}
                                    </span>
                                </td>
                                <td>${mov.sale_folio || mov.reference || '-'}</td>
                                <td class="${mov.type === 'payment' ? 'text-success' : 'text-danger'}">
                                    ${mov.type === 'payment' ? '-' : '+'}$${mov.amount.toFixed(2)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <p style="text-align: center; color: var(--gray-500); font-size: 0.8rem; margin-top: 10px;">
                    💡 Haz clic en un movimiento para ver el detalle
                </p>
            </div>
        ` : ''}
    `;
}

// ===== Modal de Registro de Abono =====
function openCustomerPaymentModal(customerId) {
    const customer = customersCache.find(c => c.id === customerId) || selectedCustomer;
    if (!customer) return;

    // Validar que tenga saldo pendiente
    if (customer.current_balance <= 0) {
        showNotification('Este cliente no tiene saldo pendiente', 'info');
        return;
    }


    // Crear modal simple para abono
    let modal = document.getElementById('customerPaymentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customerPaymentModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Registrar Abono</h3>
                <button class="modal-close" onclick="closeModal('customerPaymentModal')">&times;</button>
            </div>
            <div class="modal-body">
                <p style="margin-bottom: 15px;">Cliente: <strong>${customer.name}</strong></p>
                <p style="margin-bottom: 20px; color: var(--danger-400);">Saldo actual: <strong>$${customer.current_balance.toFixed(2)}</strong></p>
                
                <div class="form-group">
                    <label>Monto del Abono *</label>
                    <input type="number" id="paymentAmount" class="form-input" placeholder="0.00" step="0.01" min="0.01" max="${customer.current_balance}" autofocus>
                </div>
                
                <div class="form-group">
                    <label>Referencia (folio, recibo, etc.)</label>
                    <input type="text" id="paymentReference" class="form-input" placeholder="Opcional">
                </div>
                
                <div class="form-group">
                    <label>Notas</label>
                    <textarea id="paymentNotes" class="form-input" rows="2" placeholder="Opcional"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('customerPaymentModal')">Cancelar</button>
                <button class="btn btn-success" onclick="saveCustomerPayment(${customerId})">
                    Registrar Abono
                </button>
            </div>
        </div>
    `;

    openModal('customerPaymentModal');
    document.getElementById('paymentAmount').focus();
}

// ===== Guardar Abono =====
async function saveCustomerPayment(customerId) {
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const reference = document.getElementById('paymentReference').value.trim();
    const notes = document.getElementById('paymentNotes').value.trim();

    if (!amount || amount <= 0) {
        showNotification('Ingresa un monto válido', 'error');
        return;
    }

    try {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const result = await eel.add_customer_payment(customerId, amount, reference, notes, currentUser.username || 'Sistema')();

        if (result.success) {
            showNotification(result.message, 'success');
            closeModal('customerPaymentModal');
            closeModal('customerDetailModal');
            await loadCustomers();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (e) {
        console.error('Error registrando abono:', e);
        showNotification('Error al registrar abono', 'error');
    }
}

// ===== Eliminar Cliente =====
async function deleteCustomer(customerId) {
    if (!confirm('¿Estás seguro de eliminar este cliente?')) return;

    try {
        const result = await eel.delete_customer(customerId)();
        if (result.success) {
            showNotification(result.message, 'success');
            closeModal('customerDetailModal');
            await loadCustomers();
        } else {
            showNotification(result.error, 'error');
        }
    } catch (e) {
        showNotification('Error al eliminar cliente', 'error');
    }
}

// ===== Crear Modal de Cliente =====
function createCustomerModal() {
    const modal = document.createElement('div');
    modal.id = 'customerModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="customerModalTitle">Nuevo Cliente</h3>
                <button class="modal-close" onclick="closeModal('customerModal')">&times;</button>
            </div>
            <form id="customerForm" onsubmit="event.preventDefault(); saveCustomer();">
                <input type="hidden" id="customerId">
                <div class="modal-body">
                    <div class="form-row">
                        <div class="form-group" style="flex: 2;">
                            <label>Nombre *</label>
                            <input type="text" id="customerName" class="form-input" required placeholder="Nombre del cliente">
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="tel" id="customerPhone" class="form-input" placeholder="(999) 999-9999">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="customerEmail" class="form-input" placeholder="correo@ejemplo.com">
                        </div>
                        <div class="form-group">
                            <label>RFC</label>
                            <input type="text" id="customerRfc" class="form-input" placeholder="XAXX010101000" maxlength="13">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Dirección</label>
                        <input type="text" id="customerAddress" class="form-input" placeholder="Calle, número, colonia...">
                    </div>
                    
                    <div class="form-row" style="align-items: center; margin-top: 20px; padding: 15px; background: var(--dark-surface); border-radius: 8px;">
                        <div class="form-group" style="flex: 0; margin-bottom: 0;">
                            <label class="toggle-switch" style="margin: 0;">
                                <input type="checkbox" id="customerAllowCredit" onchange="toggleCreditLimit()">
                                <span class="toggle-slider"></span>
                            </label>
                        </div>
                        <div class="form-group" style="flex: 1; margin-bottom: 0;">
                            <label style="margin: 0; cursor: pointer;" onclick="document.getElementById('customerAllowCredit').click()">
                                <strong>Habilitar Crédito</strong>
                            </label>
                        </div>
                        <div class="form-group" id="creditLimitGroup" style="display: none; margin-bottom: 0;">
                            <label>Límite de Crédito</label>
                            <input type="number" id="customerCreditLimit" class="form-input" placeholder="0.00" min="0" step="100">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Notas</label>
                        <textarea id="customerNotes" class="form-input" rows="2" placeholder="Notas adicionales"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('customerModal')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar Cliente</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
}

// ===== Toggle Límite de Crédito =====
function toggleCreditLimit() {
    const checkbox = document.getElementById('customerAllowCredit');
    const group = document.getElementById('creditLimitGroup');
    group.style.display = checkbox.checked ? 'block' : 'none';
}

// ===== Crear Modal de Detalle =====
function createCustomerDetailModal() {
    const modal = document.createElement('div');
    modal.id = 'customerDetailModal';
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h3>Detalle del Cliente</h3>
                <button class="modal-close" onclick="closeModal('customerDetailModal')">&times;</button>
            </div>
            <div class="modal-body" id="customerDetailContent">
                <!-- Se llena dinámicamente -->
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('customerDetailModal')">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ===== Mostrar Detalle de Movimiento (Ticket/Recibo) =====
async function showMovementDetail(movement, customerName) {
    let modal = document.getElementById('movementDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'movementDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Z-index alto para aparecer encima de otros modales
    modal.style.zIndex = '10000';

    const isPayment = movement.type === 'payment';
    const date = new Date(movement.created_at).toLocaleString('es-MX');

    // Si es un cargo, buscar la venta correspondiente
    let saleItems = [];
    let saleFound = null;
    let loadingItems = false;

    if (!isPayment) {
        // Intentar obtener folio
        const folio = movement.sale_folio || movement.reference?.match(/V\d+/)?.[0];

        if (folio) {
            // 1. Buscar en local primero (rápido)
            const sales = StorageManager.get('sales', []);
            saleFound = sales.find(s => s.folio === folio);

            if (saleFound && saleFound.items && saleFound.items.length > 0) {
                saleItems = saleFound.items;
            } else {
                // 2. Si no está en local o no tiene items, buscar en backend
                loadingItems = true;
            }
        }
    }

    const renderModalContent = (items = []) => {
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 380px; background: white; color: black; padding: 0; position: relative; max-height: 90vh; overflow-y: auto;">
                <button onclick="closeModal('movementDetailModal')" style="position: absolute; top: 10px; right: 15px; background: none; border: none; font-size: 2rem; cursor: pointer; color: #999; z-index: 10; line-height: 1;">&times;</button>
                ${isPayment ? `
                    <!-- Recibo de Abono -->
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 2rem; margin-bottom: 5px;">💵</div>
                        <h3 style="margin: 0; color: black;">RECIBO DE ABONO</h3>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #666;">${date}</p>
                        
                        <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        
                        <p style="margin: 5px 0;"><strong>Cliente:</strong> ${customerName}</p>
                        ${movement.reference ? `<p style="margin: 5px 0; color: #666; font-size: 0.9rem;">${movement.reference}</p>` : ''}
                        
                        <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        
                        <p style="margin: 5px 0; color: #666;">Abono Recibido:</p>
                        <p style="margin: 0; font-size: 2rem; font-weight: bold; color: #22c55e;">$${movement.amount.toFixed(2)}</p>
                        
                        ${movement.notes ? `<p style="margin: 10px 0 0; font-size: 0.85rem; color: #888;">Notas: ${movement.notes}</p>` : ''}
                        
                        <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        <p style="margin: 0; font-size: 0.8rem; color: #999;">¡Gracias por su pago!</p>
                    </div>
                ` : `
                    <!-- Ticket de Venta a Crédito -->
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 2rem; margin-bottom: 5px;">📝</div>
                        <h3 style="margin: 0; color: black;">VENTA A CRÉDITO</h3>
                        <p style="margin: 5px 0; font-size: 0.85rem; color: #666;">${date}</p>
                        
                        <div style="margin-top: 10px; padding: 8px; background: #f0f9ff; border-radius: 6px;">
                            <p style="margin: 0; font-size: 0.9rem; color: #0369a1;">
                                <strong>👤 Cliente:</strong> ${customerName}
                            </p>
                        </div>
                        
                        ${movement.sale_folio || movement.reference ? `
                            <p style="margin: 10px 0 0; font-size: 0.9rem;">
                                <strong>Folio:</strong> ${movement.sale_folio || movement.reference?.match(/V\d+/)?.[0] || '-'}
                            </p>
                        ` : ''}
                        
                        <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        
                        ${items.length > 0 ? `
                            <!-- Productos vendidos -->
                            <div style="text-align: left; margin-bottom: 15px;">
                                <p style="margin: 0 0 10px; font-weight: 600; color: #333;">Productos:</p>
                                ${items.map(item => `
                                    <div style="display: flex; justify-content: space-between; margin: 6px 0; font-size: 0.85rem;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500;">${item.name || item.product_name}</div>
                                            <div style="color: #666; font-size: 0.75rem;">${item.quantity} x $${item.unit_price ? item.unit_price.toFixed(2) : item.price.toFixed(2)}</div>
                                        </div>
                                        <div style="font-weight: 600;">$${((item.quantity * (item.unit_price || item.price))).toFixed(2)}</div>
                                    </div>
                                `).join('')}
                            </div>
                            <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        ` : loadingItems ? `
                             <p style="margin: 10px 0; color: #666; font-size: 0.85rem; font-style: italic;">
                                ⌛ Cargando productos...
                            </p>
                        ` : `
                            <p style="margin: 10px 0; color: #666; font-size: 0.85rem; font-style: italic;">
                                (Detalle de productos no disponible)
                            </p>
                        `}
                        
                        <p style="margin: 5px 0; color: #666;">Total Cargado:</p>
                        <p style="margin: 0; font-size: 1.8rem; font-weight: bold; color: #ef4444;">$${movement.amount.toFixed(2)}</p>
                        
                        <p style="margin: 15px 0 0; padding: 8px; background: #fef2f2; border-radius: 6px; color: #dc2626; font-size: 0.85rem;">
                            ⚠️ Saldo cargado a cuenta del cliente
                        </p>
                        
                        <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                        <p style="margin: 0; font-size: 0.8rem; color: #999;">Gracias por su preferencia</p>
                    </div>
                `}
                <div style="display: flex; gap: 10px; padding: 10px 20px 20px;">
                    <button onclick="closeModal('movementDetailModal')" class="btn btn-ghost" style="flex: 1; color: black; border-color: #ccc;">
                        Cerrar
                    </button>
                    <button onclick="printMovementDetail()" class="btn btn-primary" style="flex: 1;">
                        🖨️ Imprimir
                    </button>
                </div>
            </div>
        `;
    };

    // Renderizar inicialmente
    renderModalContent(saleItems);
    openModal('movementDetailModal');

    // Si necesitamos cargar del backend
    if (loadingItems && !isPayment) {
        const folio = movement.sale_folio || movement.reference?.match(/V\d+/)?.[0];
        if (folio && typeof eel !== 'undefined') {
            try {
                const result = await eel.get_sale_by_folio(folio)();
                if (result.success && result.data && result.data.items) {
                    renderModalContent(result.data.items);
                } else {
                    // Intentar actualizar sin items para quitar el "Cargando..."
                    loadingItems = false;
                    renderModalContent([]);
                }
            } catch (e) {
                console.error('Error cargando venta:', e);
                loadingItems = false;
                renderModalContent([]);
            }
        }
    }
}

// ===== Imprimir Detalle de Movimiento =====
function printMovementDetail() {
    const modal = document.getElementById('movementDetailModal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    printWindow.document.write(`
        <html>
        <head><title>Recibo</title>
        <style>body{font-family:Arial,sans-serif;padding:10px;margin:0;}</style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

// ===== Exponer funciones globalmente =====
window.initCustomersModule = initCustomersModule;
window.openCustomerModal = openCustomerModal;
window.saveCustomer = saveCustomer;
window.openCustomerDetail = openCustomerDetail;
window.openCustomerPaymentModal = openCustomerPaymentModal;
window.saveCustomerPayment = saveCustomerPayment;
window.deleteCustomer = deleteCustomer;
window.toggleCreditLimit = toggleCreditLimit;
window.showMovementDetail = showMovementDetail;
window.printMovementDetail = printMovementDetail;
