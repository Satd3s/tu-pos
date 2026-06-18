// ===== MÓDULO DE PUNTO DE VENTA (POS) =====
// Sistema de punto de venta con atajos de teclado y control de turno

// Estado del POS
let posCart = [];
let posPaymentMethod = 'cash';
let posTodaySales = [];
let posShiftActive = false;
let posShiftFund = 0;
let posLastSale = null;

// ===== Inicializar Módulo POS =====
function initPOSModule() {
    // Activar modo pantalla completa
    document.body.classList.add('pos-fullscreen-mode');

    // Verificar si hay turno activo
    const shift = StorageManager.get('posCurrentShift', null);
    if (shift && shift.date === new Date().toISOString().split('T')[0]) {
        posShiftActive = true;
        posShiftFund = shift.fund;
    } else {
        posShiftActive = false;
        // Mostrar modal de inicio de turno
        setTimeout(() => {
            openModal('posShiftModal');
            document.getElementById('posShiftFund').focus();
        }, 300);
    }

    // Actualizar display del turno y reloj
    updateShiftDisplay();

    // Limpiar carrito
    posCart = [];
    renderPOSCart();
    updatePOSTotals();
    loadTodaySales();

    // Configurar eventos de teclado
    setupPOSKeyboardEvents();

    // Configurar evento de búsqueda
    const searchInput = document.getElementById('posProductSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handlePOSSearch);
        searchInput.addEventListener('keydown', handleSearchKeydown);
    }
}

// ===== Eventos de Teclado =====
function setupPOSKeyboardEvents() {
    document.addEventListener('keydown', handlePOSKeyboard);
}

function handlePOSKeyboard(e) {
    // Solo si estamos en la vista POS
    const posView = document.getElementById('posView');
    if (!posView || !posView.classList.contains('active-view')) return;

    // Evitar si hay un modal abierto (excepto el de pago)
    const activeModals = document.querySelectorAll('.modal.active');
    const isPaymentModal = document.getElementById('posPaymentModal')?.classList.contains('active');
    if (activeModals.length > 0 && !isPaymentModal) return;

    switch (e.key) {
        case 'F2':
            e.preventDefault();
            document.getElementById('posProductSearch')?.focus();
            break;
        case 'F3':
            e.preventDefault();
            openPOSHistory();
            break;
        case 'F4':
            e.preventDefault();
            openPOSOptionsModal();
            break;
        case 'F8':
            e.preventDefault();
            if (!document.getElementById('posCheckoutBtn').disabled) {
                openPaymentModal();
            }
            break;
        case 'Escape':
            e.preventDefault();
            if (isPaymentModal) {
                closeModal('posPaymentModal');
            } else {
                // Cerrar cualquier modal abierto
                const openModals = document.querySelectorAll('.modal.active');
                if (openModals.length > 0) {
                    openModals.forEach(m => m.classList.remove('active'));
                }
            }
            break;
    }
}

function handleSearchKeydown(e) {
    const resultsContainer = document.getElementById('posSearchResults');
    if (e.key === 'Enter') {
        e.preventDefault();
        const firstResult = resultsContainer.querySelector('.pos-search-item');
        if (firstResult) {
            firstResult.click();
        }
    }
}

// ===== Búsqueda de Productos =====
function handlePOSSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    const resultsContainer = document.getElementById('posSearchResults');

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    const products = StorageManager.get('products', []);
    const filtered = products.filter(p =>
        p.code.toLowerCase().includes(query) ||
        p.name.toLowerCase().includes(query) ||
        (p.partNumber && p.partNumber.toLowerCase().includes(query))
    ).slice(0, 8);

    if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="pos-no-results">No se encontraron productos</div>';
        resultsContainer.style.display = 'block';
        return;
    }

    resultsContainer.innerHTML = filtered.map(p => `
        <div class="pos-search-item" onclick="addToPOSCart('${p.id}')">
            <div class="pos-search-item-info">
                <span class="pos-search-item-code">${p.code}</span>
                <span class="pos-search-item-name">${p.name}</span>
            </div>
            <div class="pos-search-item-details">
                <span class="pos-search-item-stock ${p.stock <= 5 ? 'low' : ''}">Stock: ${p.stock}</span>
                <span class="pos-search-item-price">$${p.publicPrice.toFixed(2)}</span>
            </div>
        </div>
    `).join('');

    resultsContainer.style.display = 'block';
}

// ===== Funciones de Turno =====
function startPOSShift() {
    const fundInput = document.getElementById('posShiftFund');
    const fund = parseFloat(fundInput.value) || 0;

    posShiftFund = fund;
    posShiftActive = true;

    const shift = {
        date: new Date().toISOString().split('T')[0],
        fund: fund,
        startTime: new Date().toISOString()
    };
    StorageManager.set('posCurrentShift', shift);

    updateShiftDisplay();
    closeModal('posShiftModal');

    showNotification('Turno iniciado correctamente', 'success');
    document.getElementById('posProductSearch')?.focus();
}

function cancelPOSShift() {
    closeModal('posShiftModal');
    exitPOS();
}

function exitPOS() {
    // Desactivar modo pantalla completa
    document.body.classList.remove('pos-fullscreen-mode');

    // Detener reloj
    if (window.posClockInterval) {
        clearInterval(window.posClockInterval);
        window.posClockInterval = null;
    }

    // Navegar de vuelta al dashboard
    document.querySelector('.nav-item[data-view="dashboard"]')?.click();
}

function updateShiftDisplay() {
    const badge = document.getElementById('posShiftBadge');

    if (posShiftActive) {
        badge.classList.add('active');
        badge.innerHTML = `
            <span class="pos-shift-dot"></span>
            <span>Turno activo</span>
        `;
    } else {
        badge.classList.remove('active');
        badge.innerHTML = `
            <span class="pos-shift-dot"></span>
            <span>Sin turno</span>
        `;
    }

    // Iniciar reloj
    updatePOSClock();
    if (!window.posClockInterval) {
        window.posClockInterval = setInterval(updatePOSClock, 1000);
    }
}

function updatePOSClock() {
    const dateEl = document.getElementById('posDateTime');
    if (dateEl) {
        const now = new Date();
        const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        dateEl.textContent = `${date} ${time}`;
    }
}

// ===== Modal de Opciones =====
function openPOSOptionsModal() {
    // Actualizar resumen del turno
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date.startsWith(today));

    const totalSold = todaySales.reduce((sum, s) => sum + s.total, 0);
    const cashSales = todaySales.filter(s => s.paymentMethod === 'cash')
        .reduce((sum, s) => sum + s.total, 0);

    document.getElementById('posShiftSalesCount').textContent = todaySales.length;
    document.getElementById('posShiftSalesTotal').textContent = `$${totalSold.toFixed(2)}`;
    document.getElementById('posShiftFundDisplay').textContent = `$${posShiftFund.toFixed(2)}`;
    document.getElementById('posShiftCashTotal').textContent = `$${(posShiftFund + cashSales).toFixed(2)}`;

    openModal('posOptionsModal');
}

function reprintLastTicket() {
    if (!posLastSale) {
        showNotification('No hay ticket para reimprimir', 'warning');
        return;
    }
    closeModal('posOptionsModal');
    showPOSTicket(posLastSale);
}

function startNewSale() {
    posCart = [];
    renderPOSCart();
    updatePOSTotals();
    closeModal('posOptionsModal');
    document.getElementById('posProductSearch')?.focus();
    showNotification('Nueva venta iniciada', 'info');
}

function cancelLastSale() {
    if (!posLastSale) {
        showNotification('No hay venta para anular', 'warning');
        return;
    }

    if (!confirm(`¿Está seguro de anular la venta ${posLastSale.folio}?\n\nEsta acción devolverá los productos al inventario.`)) {
        return;
    }

    // Revertir inventario
    const products = StorageManager.get('products', []);
    posLastSale.items.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            product.stock += item.quantity;
        }
    });
    StorageManager.set('products', products);

    // Marcar venta como anulada
    const sales = StorageManager.get('sales', []);
    const saleIndex = sales.findIndex(s => s.id === posLastSale.id);
    if (saleIndex !== -1) {
        sales[saleIndex].cancelled = true;
        sales[saleIndex].cancelledAt = new Date().toISOString();
        StorageManager.set('sales', sales);
    }

    // Registrar movimiento de entrada (devolución)
    const movements = StorageManager.get('movements', []);
    posLastSale.items.forEach(item => {
        movements.push({
            id: Date.now().toString() + Math.random(),
            productId: item.productId,
            productCode: item.code,
            productName: item.name,
            type: 'entry',
            quantity: item.quantity,
            reason: `Anulación de venta ${posLastSale.folio}`,
            date: new Date().toISOString(),
            user: 'Supervisor'
        });
    });
    StorageManager.set('movements', movements);

    showNotification(`Venta ${posLastSale.folio} anulada correctamente`, 'success');
    posLastSale = null;
    loadTodaySales();
    closeModal('posOptionsModal');
}

function closeShift() {
    if (!confirm('¿Está seguro de cerrar el turno?\n\nNo podrá realizar más ventas hasta iniciar un nuevo turno.')) {
        return;
    }

    // Guardar resumen del turno
    const shiftData = StorageManager.get('posCurrentShift', {});
    shiftData.endTime = new Date().toISOString();
    shiftData.closed = true;

    const closedShifts = StorageManager.get('posClosedShifts', []);
    closedShifts.push(shiftData);
    StorageManager.set('posClosedShifts', closedShifts);

    // Limpiar turno actual
    StorageManager.remove('posCurrentShift');
    posShiftActive = false;
    posShiftFund = 0;

    closeModal('posOptionsModal');
    exitPOS();
    showNotification('Turno cerrado correctamente', 'success');
}


// ===== Agregar al Carrito =====
function addToPOSCart(productId) {
    const products = StorageManager.get('products', []);
    const product = products.find(p => p.id === productId);

    if (!product) {
        showNotification('Producto no encontrado', 'error');
        return;
    }

    if (product.stock <= 0) {
        showNotification('Producto sin stock disponible', 'error');
        return;
    }

    // Verificar si ya está en el carrito
    const existingItem = posCart.find(item => item.productId === productId);

    if (existingItem) {
        if (existingItem.quantity >= product.stock) {
            showNotification('No hay suficiente stock', 'warning');
            return;
        }
        existingItem.quantity++;
    } else {
        posCart.push({
            productId: product.id,
            code: product.code,
            name: product.name,
            price: product.publicPrice,
            quantity: 1,
            maxStock: product.stock
        });
    }

    // Limpiar búsqueda
    document.getElementById('posProductSearch').value = '';
    document.getElementById('posSearchResults').style.display = 'none';

    renderPOSCart();
    updatePOSTotals();
    showNotification(`${product.name} agregado`, 'success');
}

// ===== Renderizar Carrito =====
function renderPOSCart() {
    const tableBody = document.getElementById('posCartTableBody');
    const countEl = document.getElementById('posCartCount');
    const liveCountEl = document.getElementById('posLiveItemCount');

    if (posCart.length === 0) {
        tableBody.innerHTML = `
            <tr class="pos-cart-empty-row">
                <td colspan="6">
                    <div class="pos-cart-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p>Carrito vacío</p>
                        <span>Escanea o busca productos para agregar</span>
                    </div>
                </td>
            </tr>
        `;
        countEl.textContent = '0 productos';
        if (liveCountEl) liveCountEl.textContent = '0';
        document.getElementById('posCheckoutBtn').disabled = true;
        return;
    }

    const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);
    countEl.textContent = `${totalItems} producto${totalItems > 1 ? 's' : ''}`;
    if (liveCountEl) liveCountEl.textContent = totalItems;
    document.getElementById('posCheckoutBtn').disabled = false;

    tableBody.innerHTML = posCart.map((item, index) => `
        <tr data-index="${index}">
            <td><span style="color: var(--primary-400); font-weight: 600;">${item.code}</span></td>
            <td>${item.name}</td>
            <td style="text-align: center;">
                <div class="pos-cart-qty-controls">
                    <button class="pos-qty-btn" onclick="updatePOSCartQty(${index}, -1)">−</button>
                    <span style="font-weight: 600; min-width: 24px;">${item.quantity}</span>
                    <button class="pos-qty-btn" onclick="updatePOSCartQty(${index}, 1)">+</button>
                </div>
            </td>
            <td style="text-align: right;">$${item.price.toFixed(2)}</td>
            <td style="text-align: right; font-weight: 600; color: var(--success-400);">$${(item.price * item.quantity).toFixed(2)}</td>
            <td>
                <button class="pos-cart-remove-btn" onclick="removeFromPOSCart(${index})">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// ===== Actualizar Cantidad en Carrito =====
function updatePOSCartQty(index, delta) {
    const item = posCart[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
        removeFromPOSCart(index);
        return;
    }

    if (newQty > item.maxStock) {
        showNotification('No hay suficiente stock', 'warning');
        return;
    }

    item.quantity = newQty;
    renderPOSCart();
    updatePOSTotals();
}

// ===== Eliminar del Carrito =====
function removeFromPOSCart(index) {
    posCart.splice(index, 1);
    renderPOSCart();
    updatePOSTotals();
}

// ===== Limpiar Carrito =====
function clearPOSCart() {
    if (posCart.length === 0) return;

    posCart = [];
    renderPOSCart();
    updatePOSTotals();
    showNotification('Carrito limpiado', 'info');
}

// ===== Actualizar Totales =====
function updatePOSTotals() {
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    document.getElementById('posSubtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('posIVA').textContent = `$${iva.toFixed(2)}`;
    document.getElementById('posTotal').textContent = `$${total.toFixed(2)}`;

    // Actualizar total en vivo en la barra superior
    const liveTotalEl = document.getElementById('posLiveTotal');
    if (liveTotalEl) {
        liveTotalEl.textContent = `$${total.toFixed(2)}`;
    }
}

// ===== Abrir Modal de Pago =====
function openPaymentModal() {
    if (posCart.length === 0) {
        showNotification('El carrito está vacío', 'error');
        return;
    }

    // Mostrar total en el modal
    const total = document.getElementById('posTotal').textContent;
    document.getElementById('posPaymentTotal').textContent = total;

    // Reset modal state
    posPaymentMethod = 'cash';
    document.querySelectorAll('#posPaymentModal .pos-payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('#posPaymentModal .pos-payment-btn[data-method="cash"]').classList.add('active');
    document.getElementById('posCashSectionModal').style.display = 'block';
    document.getElementById('posCardSectionModal').style.display = 'none';
    document.getElementById('posCashReceivedModal').value = '';
    document.getElementById('posChangeModal').textContent = '$0.00';
    document.getElementById('posChangeModal').classList.remove('negative');

    // Abrir modal
    openModal('posPaymentModal');

    // Focus en campo de pago
    setTimeout(() => {
        document.getElementById('posCashReceivedModal').focus();
    }, 100);
}

// ===== Seleccionar Método de Pago en Modal =====
function selectPaymentMethodModal(method, btnElement) {
    posPaymentMethod = method;

    document.querySelectorAll('#posPaymentModal .pos-payment-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    const cashSection = document.getElementById('posCashSectionModal');
    const cardSection = document.getElementById('posCardSectionModal');

    if (method === 'cash') {
        cashSection.style.display = 'block';
        cardSection.style.display = 'none';
        setTimeout(() => {
            document.getElementById('posCashReceivedModal').focus();
        }, 100);
    } else {
        cashSection.style.display = 'none';
        cardSection.style.display = 'block';
    }
}

// ===== Calcular Cambio en Modal =====
function calculateChangeModal() {
    const totalText = document.getElementById('posPaymentTotal').textContent;
    const total = parseFloat(totalText.replace('$', '').replace(',', '')) || 0;
    const received = parseFloat(document.getElementById('posCashReceivedModal').value) || 0;

    const change = received - total;
    const changeEl = document.getElementById('posChangeModal');

    if (change >= 0 && received > 0) {
        changeEl.textContent = `$${change.toFixed(2)}`;
        changeEl.classList.remove('negative');
    } else if (received > 0) {
        changeEl.textContent = `-$${Math.abs(change).toFixed(2)}`;
        changeEl.classList.add('negative');
    } else {
        changeEl.textContent = '$0.00';
        changeEl.classList.remove('negative');
    }
}

// ===== Confirmar Pago =====
function confirmPOSPayment() {
    const totalText = document.getElementById('posPaymentTotal').textContent;
    const total = parseFloat(totalText.replace('$', '').replace(',', '')) || 0;

    let cashReceived = total;
    let change = 0;

    // Validar pago en efectivo
    if (posPaymentMethod === 'cash') {
        cashReceived = parseFloat(document.getElementById('posCashReceivedModal').value) || 0;
        if (cashReceived < total) {
            showNotification('El pago recibido es insuficiente', 'error');
            document.getElementById('posCashReceivedModal').focus();
            return;
        }
        change = cashReceived - total;
    }

    // Cerrar modal de pago
    closeModal('posPaymentModal');

    // Generar folio de venta
    const salesCount = StorageManager.get('salesCounter', 0) + 1;
    StorageManager.set('salesCounter', salesCount);
    const folio = `V${String(salesCount).padStart(6, '0')}`;

    // Crear registro de venta
    const sale = {
        id: Date.now().toString(),
        folio: folio,
        date: new Date().toISOString(),
        items: posCart.map(item => ({ ...item })),
        subtotal: parseFloat(document.getElementById('posSubtotal').textContent.replace('$', '')),
        discount: 0,
        iva: parseFloat(document.getElementById('posIVA').textContent.replace('$', '')),
        total: total,
        paymentMethod: posPaymentMethod,
        cashReceived: cashReceived,
        change: change
    };

    // Guardar venta
    const sales = StorageManager.get('sales', []);
    sales.push(sale);
    StorageManager.set('sales', sales);

    // Descontar inventario
    const products = StorageManager.get('products', []);
    posCart.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            product.stock -= item.quantity;
        }
    });
    StorageManager.set('products', products);

    // Registrar movimiento de salida
    const movements = StorageManager.get('movements', []);
    posCart.forEach(item => {
        movements.push({
            id: Date.now().toString() + Math.random(),
            productId: item.productId,
            productCode: item.code,
            productName: item.name,
            type: 'exit',
            quantity: item.quantity,
            reason: `Venta ${folio}`,
            date: new Date().toISOString(),
            user: 'POS'
        });
    });
    StorageManager.set('movements', movements);

    // Mostrar ticket
    posLastSale = sale;
    showPOSTicket(sale);

    // Limpiar carrito
    posCart = [];
    renderPOSCart();
    updatePOSTotals();
    loadTodaySales();

    showNotification(`Venta ${folio} completada exitosamente`, 'success');
}

// ===== Mostrar Ticket =====
function showPOSTicket(sale) {
    const settings = StorageManager.get('appSettings', {});
    const companyName = settings.companyName || 'Refaccionaria Smip';
    const companyPhone = settings.companyPhone || '';
    const companyAddress = settings.companyAddress || '';

    const ticketHTML = `
        <div class="pos-ticket">
            <div class="pos-ticket-header">
                <h3>${companyName}</h3>
                ${companyAddress ? `<p>${companyAddress}</p>` : ''}
                ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
            </div>
            <div class="pos-ticket-info">
                <p><strong>Folio:</strong> ${sale.folio}</p>
                <p><strong>Fecha:</strong> ${new Date(sale.date).toLocaleString()}</p>
            </div>
            <div class="pos-ticket-items">
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cant</th>
                            <th>Precio</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>$${item.price.toFixed(2)}</td>
                                <td>$${(item.price * item.quantity).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="pos-ticket-totals">
                <div class="pos-ticket-row">
                    <span>Subtotal:</span>
                    <span>$${sale.subtotal.toFixed(2)}</span>
                </div>
                ${sale.discount > 0 ? `
                <div class="pos-ticket-row">
                    <span>Descuento:</span>
                    <span>-$${sale.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="pos-ticket-row">
                    <span>IVA (16%):</span>
                    <span>$${sale.iva.toFixed(2)}</span>
                </div>
                <div class="pos-ticket-row pos-ticket-total">
                    <span>TOTAL:</span>
                    <span>$${sale.total.toFixed(2)}</span>
                </div>
                ${sale.paymentMethod === 'cash' ? `
                <div class="pos-ticket-row">
                    <span>Recibido:</span>
                    <span>$${sale.cashReceived.toFixed(2)}</span>
                </div>
                <div class="pos-ticket-row">
                    <span>Cambio:</span>
                    <span>$${sale.change.toFixed(2)}</span>
                </div>
                ` : ''}
            </div>
            <div class="pos-ticket-footer">
                <p>¡Gracias por su compra!</p>
            </div>
        </div>
    `;

    // Mostrar en modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'ticketModal';
    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <h3>Ticket de Venta</h3>
                <button class="modal-close" onclick="closeModal('ticketModal')">&times;</button>
            </div>
            <div class="modal-body">
                ${ticketHTML}
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('ticketModal')">Cerrar</button>
                <button class="btn btn-primary" onclick="printPOSTicket()">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Imprimir
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
}

// ===== Imprimir Ticket =====
function printPOSTicket() {
    const ticket = document.querySelector('.pos-ticket');
    if (!ticket) return;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
        <head>
            <title>Ticket de Venta</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
                .pos-ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                .pos-ticket-header h3 { margin: 0 0 5px 0; }
                .pos-ticket-header p { margin: 2px 0; font-size: 12px; }
                .pos-ticket-info { padding: 10px 0; border-bottom: 1px dashed #000; }
                .pos-ticket-info p { margin: 3px 0; font-size: 12px; }
                .pos-ticket-items table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                .pos-ticket-items th, .pos-ticket-items td { text-align: left; padding: 3px 0; font-size: 11px; }
                .pos-ticket-items th:last-child, .pos-ticket-items td:last-child { text-align: right; }
                .pos-ticket-totals { border-top: 1px dashed #000; padding-top: 10px; }
                .pos-ticket-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
                .pos-ticket-total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                .pos-ticket-footer { text-align: center; padding-top: 15px; border-top: 1px dashed #000; margin-top: 10px; }
                .pos-ticket-footer p { font-size: 12px; }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            ${ticket.outerHTML}
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ===== Cargar Ventas del Día =====
function loadTodaySales() {
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];

    posTodaySales = sales.filter(s => s.date.startsWith(today));

    const totalSales = posTodaySales.reduce((sum, s) => sum + s.total, 0);

    document.getElementById('posTodaySalesCount').textContent = `${posTodaySales.length} venta${posTodaySales.length !== 1 ? 's' : ''}`;
    document.getElementById('posTodaySalesTotal').textContent = `$${totalSales.toFixed(2)}`;
}

// ===== Historial de Ventas =====
function openPOSHistory() {
    const sales = StorageManager.get('sales', []).slice(-50).reverse();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'posHistoryModal';
    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3>Historial de Ventas</h3>
                <button class="modal-close" onclick="closeModal('posHistoryModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Folio</th>
                                <th>Fecha</th>
                                <th>Productos</th>
                                <th>Total</th>
                                <th>Método</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sales.length ? sales.map(s => `
                                <tr>
                                    <td><strong>${s.folio}</strong></td>
                                    <td>${new Date(s.date).toLocaleString()}</td>
                                    <td>${s.items.length} producto${s.items.length > 1 ? 's' : ''}</td>
                                    <td>$${s.total.toFixed(2)}</td>
                                    <td>${s.paymentMethod === 'cash' ? 'Efectivo' : s.paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="empty-state">No hay ventas registradas</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.classList.add('active');
}

// Exportar funciones globales
window.initPOSModule = initPOSModule;
window.addToPOSCart = addToPOSCart;
window.updatePOSCartQty = updatePOSCartQty;
window.removeFromPOSCart = removeFromPOSCart;
window.clearPOSCart = clearPOSCart;
window.updatePOSTotals = updatePOSTotals;
window.openPaymentModal = openPaymentModal;
window.selectPaymentMethodModal = selectPaymentMethodModal;
window.calculateChangeModal = calculateChangeModal;
window.confirmPOSPayment = confirmPOSPayment;
window.printPOSTicket = printPOSTicket;
window.openPOSHistory = openPOSHistory;
window.startPOSShift = startPOSShift;
window.cancelPOSShift = cancelPOSShift;
window.exitPOS = exitPOS;
window.openPOSOptionsModal = openPOSOptionsModal;
window.reprintLastTicket = reprintLastTicket;
window.startNewSale = startNewSale;
window.cancelLastSale = cancelLastSale;
window.closeShift = closeShift;
