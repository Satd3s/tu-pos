// ===== MÓDULO DE PUNTO DE VENTA (POS) =====
// Sistema de punto de venta con atajos de teclado y control de turno

// Estado del POS
let posCart = []; // Se cargará en initPOSModule
let posPaymentMethod = 'cash';
let posTodaySales = [];
let posShiftActive = false;
let posShiftFund = 0;
let posLastSale = null;
let posProductsCache = [];
let posSelectedCustomer = null; // Cliente seleccionado para la venta
let posIsContinuousMode = false; // Modo Venta Continua
let posAutoFocusEnabled = true; // Auto-enfoque en barra de búsqueda para scanner
let posSearchSelectedIndex = -1; // Índice seleccionado en resultados de búsqueda (para navegación con teclado)

// Datos temporales para reporte/impresión de corte
let posCurrentViewedShiftSales = [];
let posCurrentViewedShiftInfo = null;

// ===== Auto-enfoque para Scanner =====
// Mantiene el cursor en la barra de búsqueda para que el scanner funcione sin problemas
function focusPOSSearch(delay = 50) {
    if (!posAutoFocusEnabled) return;

    // Verificar si estamos en la vista POS
    const posView = document.querySelector('.tab-view[data-module="pos"].active');
    if (!posView) return;

    // No hacer focus si hay un modal abierto (excepto los que queremos ignorar)
    const activeModals = document.querySelectorAll('.modal.active');
    if (activeModals.length > 0) return;

    setTimeout(() => {
        const searchInput = document.getElementById('posProductSearch');
        if (searchInput && document.activeElement !== searchInput) {
            // No hacer focus si el usuario está en otro input específico
            const activeEl = document.activeElement;
            const isInCart = activeEl?.closest('.pos-cart-item');
            const isInModal = activeEl?.closest('.modal');

            if (!isInCart && !isInModal) {
                searchInput.focus();
            }
        }
    }, delay);
}

// Configurar auto-enfoque persistente
function setupPOSAutoFocus() {
    const posView = document.querySelector('.tab-view[data-module="pos"]');
    if (!posView) return;

    // Re-enfocar cuando se hace clic en áreas vacías del POS
    posView.addEventListener('click', (e) => {
        // Si el clic fue en un área "vacía" (no en inputs, botones, etc.)
        const tag = e.target.tagName.toLowerCase();
        const isInteractive = ['input', 'button', 'select', 'textarea', 'a'].includes(tag);
        const isCartItem = e.target.closest('.pos-cart-item');
        const isSearchResult = e.target.closest('.pos-search-item');

        if (!isInteractive && !isCartItem && !isSearchResult) {
            focusPOSSearch(100);
        }
    });

    // Re-enfocar cuando se cierra un modal
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            // Clic en overlay del modal (para cerrarlo)
            setTimeout(() => focusPOSSearch(200), 50);
        }
    });

    // Escuchar teclas para mantener enfoque (para scanners que envían caracteres directamente)
    document.addEventListener('keypress', (e) => {
        const posView = document.querySelector('.tab-view[data-module="pos"].active');
        if (!posView) return;

        const activeModals = document.querySelectorAll('.modal.active');
        if (activeModals.length > 0) return;

        const searchInput = document.getElementById('posProductSearch');
        if (searchInput && document.activeElement !== searchInput) {
            // Si el usuario empieza a escribir y no está en un input, redirigir al search
            const activeEl = document.activeElement;
            if (!activeEl?.matches('input, textarea, select')) {
                searchInput.focus();
                // Agregar el caracter presionado
                if (e.key.length === 1) {
                    searchInput.value += e.key;
                    // Disparar evento input para activar búsqueda
                    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        }
    });

    console.log('POS: Auto-enfoque configurado para scanner');
}


// ===== Verificación de Permisos =====
function isUserSupervisor() {
    const currentUser = StorageManager.get('currentUser', null);
    if (!currentUser) return false;
    return currentUser.role === 'admin' || currentUser.role === 'supervisor';
}

function getUserRole() {
    const currentUser = StorageManager.get('currentUser', null);
    return currentUser?.role || 'user';
}

// Función para guardar el carrito automáticamente (usa localStorage directamente)
function saveCart() {
    try {
        localStorage.setItem('posCart', JSON.stringify(posCart));
        console.log('POS: Carrito guardado con', posCart.length, 'productos');
    } catch (e) {
        console.error('Error guardando carrito:', e);
    }
}

// Función para cargar el carrito (usa localStorage directamente)
function loadCart() {
    try {
        const savedCart = localStorage.getItem('posCart');
        if (savedCart) {
            const parsed = JSON.parse(savedCart);
            if (Array.isArray(parsed) && parsed.length > 0) {
                posCart = parsed;
                console.log('POS: Carrito restaurado con', posCart.length, 'productos');
                return;
            }
        }
    } catch (e) {
        console.error('Error cargando carrito:', e);
    }
    posCart = [];
}

// Cargar productos para el POS desde Backend
async function loadPOSProductsCache() {
    console.log("POS: Iniciando carga de productos...");

    // Esperar un momento para asegurar que el DOM esté listo
    await new Promise(resolve => setTimeout(resolve, 200));

    const input = document.getElementById('posProductSearch');
    if (input) {
        input.placeholder = "Cargando catálogo...";
    } else {
        console.warn("POS: Input de búsqueda no encontrado");
    }

    // Verificar si Eel está disponible
    if (typeof eel === 'undefined' || typeof eel.get_products !== 'function') {
        console.error("POS: Eel no está disponible");
        if (input) input.placeholder = "Error: Eel no conectado";
        return;
    }

    try {
        console.log("POS: Llamando a eel.get_products()...");
        const result = await eel.get_products()();
        console.log("POS: Respuesta recibida:", result);

        if (Array.isArray(result)) {
            posProductsCache = result;
        } else if (result && result.data) {
            posProductsCache = result.data;
        } else {
            console.warn("POS: Formato de respuesta inesperado", result);
            posProductsCache = [];
        }

        console.log(`POS: ${posProductsCache.length} productos cargados.`);

        if (input) {
            if (posProductsCache.length > 0) {
                input.placeholder = `Buscar en ${posProductsCache.length} productos... (F2)`;
            } else {
                input.placeholder = "Sin productos - Agrega productos primero";
            }
        }
    } catch (error) {
        console.error("POS Error:", error.message || error);
        if (input) input.placeholder = "Buscar producto... (F2)";

        // Intentar cargar desde StorageManager como fallback
        const localProducts = StorageManager.get('products', []);
        if (localProducts.length > 0) {
            posProductsCache = localProducts;
            console.log(`POS: Fallback - ${localProducts.length} productos desde localStorage`);
            if (input) input.placeholder = `Buscar en ${localProducts.length} productos (local)`;
        }
    }
}

// ===== Inicializar Módulo POS =====
async function initPOSModule() {
    console.log('Inicializando POS...');

    // IMPORTANTE: Cargar carrito guardado primero
    loadCart();

    // Cargar productos desde backend
    await loadPOSProductsCache();
    console.log('POS: Productos cargados, continuando inicialización...');

    // Verificar si hay turno activo en el BACKEND primero
    let shift = StorageManager.get('posCurrentShift', null);
    let backendHasShift = false;

    try {
        if (typeof eel !== 'undefined') {
            const result = await eel.get_current_shift()();
            if (result.success && result.active && result.data) {
                backendHasShift = true;
                console.log('POS: Turno activo encontrado en backend, ID:', result.data.id);

                // Sincronizar localStorage con backend
                if (!shift || shift.closed) {
                    // Intentar recuperar usuario real
                    const user = StorageManager.get('currentUser') || window.currentUser;
                    const userName = user ? (user.fullName || user.username) : 'Cajero';

                    shift = {
                        date: result.data.opened_at?.split('T')[0] || new Date().toISOString().split('T')[0],
                        fund: result.data.initial_fund || 0,
                        cashier: userName, // Usar nombre real si existe
                        startTime: result.data.opened_at || new Date().toISOString(),
                        closed: false,
                        backendId: result.data.id
                    };
                    StorageManager.set('posCurrentShift', shift);
                }
            } else {
                // No hay turno en backend - limpiar localStorage
                console.log('POS: No hay turno activo en backend - limpiando localStorage');
                StorageManager.remove('posCurrentShift');
                shift = null;
            }
        }
    } catch (e) {
        console.error('POS: Error verificando turno en backend:', e);
    }

    // Si hay un turno y NO está cerrado, lo restauramos
    if ((shift && !shift.closed) || backendHasShift) {
        // Turno existente ABIERTO - restaurar estado
        posShiftActive = true;
        posShiftFund = shift?.fund || 0;

        // --- CORRECCIÓN DE NOMBRE DE USUARIO ---
        // Prioridad: Usuario Actual Logueado > Usuario en Turno > 'Cajero'
        const userEl = document.getElementById('posCurrentUserName');

        let activeUser = StorageManager.get('currentUser') || window.currentUser;
        let displayName = 'Cajero';

        if (activeUser && (activeUser.fullName || activeUser.username)) {
            displayName = activeUser.fullName || activeUser.username;
            console.log("POS: Usando usuario activo para header:", displayName);
        } else if (shift && shift.cashier) {
            displayName = shift.cashier;
            console.log("POS: Usando cajero del turno para header:", displayName);
        }

        if (userEl) userEl.textContent = displayName;

        // PARCHE TIMING: Reintentar si es 'Cajero'
        if ((displayName === 'Cajero' || !activeUser) && !backendHasShift) {
            let retries = 0;
            const retryInt = setInterval(() => {
                const u = StorageManager.get('currentUser') || window.currentUser;
                if (u && (u.fullName || u.username)) {
                    console.log("POS: Usuario detectado tardíamente:", u.username);
                    if (userEl) userEl.textContent = u.fullName || u.username;

                    // Fix shift
                    let currShift = StorageManager.get('posCurrentShift');
                    if (currShift) {
                        currShift.cashier = u.fullName || u.username;
                        StorageManager.set('posCurrentShift', currShift);
                    }

                    clearInterval(retryInt);
                }
                if (++retries > 10) clearInterval(retryInt);
            }, 1000);
        }

        // Actualizar el turno con el usuario actual si es diferente (asumiendo relevo simple)
        if (shift && activeUser && shift.cashier !== displayName) {
            shift.cashier = displayName;
            StorageManager.set('posCurrentShift', shift);
        }
        // ----------------------------------------

        console.log('POS: Turno restaurado - Fondo:', posShiftFund);
    } else {
        // No hay turno activo - pedir inicio de turno
        posShiftActive = false;
        posShiftFund = 0;

        // Mostrar modal de inicio de turno con saludo
        setTimeout(() => {
            showShiftModalWithGreeting();
        }, 300);
    }

    // Actualizar display del turno y reloj
    updateShiftDisplay();

    // Renderizar carrito cargado (NO limpiar, ya se cargó con loadCart)
    renderPOSCart();
    updatePOSTotals();
    loadTodaySales();

    // Configurar eventos de teclado
    setupPOSKeyboardEvents();

    // Configurar evento de búsqueda
    const searchInput = document.getElementById('posProductSearch');
    if (searchInput) {
        // Remover listeners anteriores si existen
        searchInput.removeEventListener('input', handlePOSSearch);
        searchInput.removeEventListener('keydown', handleSearchKeydown);

        // Agregar nuevos listeners
        searchInput.addEventListener('input', handlePOSSearch);
        searchInput.addEventListener('keydown', handleSearchKeydown);

        console.log('POS: Event listeners configurados en input de búsqueda');

        // Cerrar lista al hacer clic fuera
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.pos-search-section')) {
                const res = document.getElementById('posSearchResults');
                if (res) res.style.display = 'none';
            }
        });
    } else {
        console.error('POS: Input de búsqueda NO encontrado!');
    }

    // Configurar auto-enfoque para scanner
    setupPOSAutoFocus();

    // Enfoque inicial en la barra de búsqueda (después de que todo esté listo)
    setTimeout(() => focusPOSSearch(100), 500);

    console.log('POS: Inicialización completada. Productos en cache:', posProductsCache.length);
}

// ===== Eventos de Teclado =====
function setupPOSKeyboardEvents() {
    document.addEventListener('keydown', handlePOSKeyboard);
}

function handlePOSKeyboard(e) {
    // Solo si estamos en una vista POS activa
    const posView = document.querySelector('.tab-view[data-module="pos"].active');
    if (!posView) return;

    const isPaymentModal = document.getElementById('posPaymentModal')?.classList.contains('active');
    const activeModals = document.querySelectorAll('.modal.active');

    // Si el modal de pago está abierto, manejar teclado especial
    if (isPaymentModal) {
        handlePaymentModalKeyboard(e);
        return;
    }

    // Si hay otro modal abierto, solo permitir Escape
    if (activeModals.length > 0) {
        if (e.key === 'Escape') {
            e.preventDefault();
            activeModals.forEach(m => m.classList.remove('active'));
        }
        return;
    }

    // Atajos principales del POS
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
            if (posCart.length > 0) {
                openPaymentModal();
            }
            break;
        case 'Escape':
            e.preventDefault();
            const openModals = document.querySelectorAll('.modal.active');
            if (openModals.length > 0) {
                openModals.forEach(m => m.classList.remove('active'));
            }
            break;
    }
}

// ===== Teclado del Modal de Pago =====
const paymentMethods = ['cash', 'card', 'transfer', 'mixed'];
let currentPaymentIndex = 0;

function handlePaymentModalKeyboard(e) {
    const key = e.key;

    // Números 1-4 para seleccionar método directamente
    if (key >= '1' && key <= '4' && !e.target.matches('input')) {
        e.preventDefault();
        const index = parseInt(key) - 1;
        selectPaymentByIndex(index);
        return;
    }

    // Flechas izquierda/derecha para cambiar método
    if (key === 'ArrowLeft' && !e.target.matches('input')) {
        e.preventDefault();
        currentPaymentIndex = (currentPaymentIndex - 1 + 4) % 4;
        selectPaymentByIndex(currentPaymentIndex);
        return;
    }

    if (key === 'ArrowRight' && !e.target.matches('input')) {
        e.preventDefault();
        currentPaymentIndex = (currentPaymentIndex + 1) % 4;
        selectPaymentByIndex(currentPaymentIndex);
        return;
    }

    // Enter para confirmar pago (si no está en un input o si está en el input de efectivo)
    if (key === 'Enter') {
        const activeElement = document.activeElement;
        // Si está en el input de efectivo y tiene valor suficiente, confirmar
        if (activeElement?.id === 'posCashReceivedModal' ||
            activeElement?.id === 'posMixedCash' ||
            activeElement?.id === 'posMixedCard' ||
            !activeElement?.matches('input')) {
            e.preventDefault();
            confirmPOSPayment();
        }
        return;
    }

    // Escape para cerrar
    if (key === 'Escape') {
        e.preventDefault();
        closeModal('posPaymentModal');
        return;
    }

    // Flechas arriba/abajo para ajustar monto (solo en input de efectivo)
    if (e.target?.id === 'posCashReceivedModal') {
        if (key === 'ArrowUp') {
            e.preventDefault();
            addCashAmount(50);
        } else if (key === 'ArrowDown') {
            e.preventDefault();
            const input = document.getElementById('posCashReceivedModal');
            const current = parseFloat(input.value) || 0;
            input.value = Math.max(0, current - 50).toFixed(2);
            calculateChangeModal();
        }
    }
}

function selectPaymentByIndex(index) {
    currentPaymentIndex = index;
    const method = paymentMethods[index];
    const btn = document.querySelector(`#posPaymentModal .pos-payment-btn[data-method="${method}"]`);
    if (btn) {
        selectPaymentMethodModal(method, btn);
    }
}

function handleSearchKeydown(e) {
    const resultsContainer = document.getElementById('posSearchResults');
    const items = resultsContainer?.querySelectorAll('.pos-search-item') || [];
    const itemCount = items.length;

    // ===== Navegación con flechas =====
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (itemCount === 0) return;

        // Mover selección hacia abajo
        posSearchSelectedIndex = (posSearchSelectedIndex + 1) % itemCount;
        updateSearchSelection(items, posSearchSelectedIndex);
        return;
    }

    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (itemCount === 0) return;

        // Mover selección hacia arriba
        posSearchSelectedIndex = posSearchSelectedIndex <= 0 ? itemCount - 1 : posSearchSelectedIndex - 1;
        updateSearchSelection(items, posSearchSelectedIndex);
        return;
    }

    if (e.key === 'Escape') {
        e.preventDefault();
        resultsContainer.style.display = 'none';
        posSearchSelectedIndex = -1;
        return;
    }

    // ===== Enter para seleccionar =====
    if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (!query) return;

        // 1. Si hay un elemento seleccionado con las flechas, usarlo
        if (posSearchSelectedIndex >= 0 && posSearchSelectedIndex < itemCount) {
            items[posSearchSelectedIndex].click();
            posSearchSelectedIndex = -1;
            return;
        }

        // 2. Intentar coincidencia EXACTA primero (prioridad para lector de códigos)
        const products = posProductsCache.length > 0 ? posProductsCache : StorageManager.get('products', []);
        const exactMatch = products.find(p => (p.code || '').toLowerCase() === query.toLowerCase());

        if (exactMatch) {
            addToPOSCart(exactMatch.id);
            e.target.value = '';
            resultsContainer.style.display = 'none';
            posSearchSelectedIndex = -1;
            return;
        }

        // 3. Si hay resultados visuales, seleccionar el primero
        const firstResult = resultsContainer.querySelector('.pos-search-item');
        if (firstResult) {
            firstResult.click();
            posSearchSelectedIndex = -1;
        } else {
            // Mostrar modal de producto no encontrado
            showProductNotFoundModal(query);
            e.target.value = '';
            resultsContainer.style.display = 'none';
            posSearchSelectedIndex = -1;
        }
    }
}

// ===== Actualizar selección visual en resultados de búsqueda =====
function updateSearchSelection(items, selectedIndex) {
    items.forEach((item, index) => {
        if (index === selectedIndex) {
            item.classList.add('selected');
            // Asegurar que el elemento sea visible (scroll)
            item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        } else {
            item.classList.remove('selected');
        }
    });
}

// ===== Modal: Producto No Encontrado =====
function showProductNotFoundModal(code) {
    // Remover modal anterior si existe
    const existingModal = document.getElementById('posNotFoundModal');
    if (existingModal) existingModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'posNotFoundModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>⚠️ Producto No Encontrado</h3>
                <button class="modal-close" onclick="closeModal('posNotFoundModal')">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center; padding: 30px;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📦</div>
                <p style="font-size: 1.1rem; margin-bottom: 10px;">No se encontró el producto con código:</p>
                <p style="font-size: 1.5rem; font-weight: bold; color: var(--primary-400); font-family: monospace; background: rgba(59,130,246,0.1); padding: 10px; border-radius: 8px;">${code}</p>
                <p style="color: var(--gray-400); margin-top: 15px;">¿Deseas agregarlo al catálogo?</p>
            </div>
            <div class="modal-footer" style="justify-content: center; gap: 15px;">
                <button class="btn btn-ghost" onclick="closeModal('posNotFoundModal')">Cancelar</button>
                <button class="btn btn-primary" onclick="openNewProductFromPOS('${code}')">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" width="18" height="18">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
                    </svg>
                    Agregar Producto
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Focus en el botón de agregar
    setTimeout(() => modal.querySelector('.btn-primary')?.focus(), 100);
}

// ===== Abrir formulario de nuevo producto desde POS =====
function openNewProductFromPOS(code) {
    closeModal('posNotFoundModal');

    // Abrir pestaña de productos
    if (typeof TabsManager !== 'undefined') {
        TabsManager.openTab('products');

        // Esperar a que cargue y abrir el modal de producto
        setTimeout(() => {
            if (typeof openProductModal === 'function') {
                openProductModal();
                // Pre-llenar el código
                setTimeout(() => {
                    const codeInput = document.getElementById('productCode');
                    if (codeInput) {
                        codeInput.value = code;
                        codeInput.focus();
                    }
                }, 200);
            }
        }, 300);
    }
}

// ===== Búsqueda de Productos =====
// ===== Búsqueda de Productos =====
async function handlePOSSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('posSearchResults');

    // Resetear selección al buscar
    posSearchSelectedIndex = -1;

    if (!resultsContainer) {
        console.error("POS: Container de resultados no encontrado");
        return;
    }

    if (query.length < 2) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        return;
    }

    // Mostrar indicador de carga
    resultsContainer.innerHTML = '<div class="pos-no-results">Buscando...</div>';
    resultsContainer.style.display = 'block';

    try {
        // Llamar directamente al backend
        console.log("POS: Buscando en backend:", query);
        const result = await eel.search_products(query)();
        console.log("POS: Resultado de búsqueda:", result);

        let products = [];
        if (Array.isArray(result)) {
            products = result;
        } else if (result && result.data) {
            products = result.data;
        } else if (result && result.success === false) {
            resultsContainer.innerHTML = '<div class="pos-no-results">Error: ' + (result.error || 'desconocido') + '</div>';
            return;
        }

        if (products.length === 0) {
            resultsContainer.innerHTML = '<div class="pos-no-results">No se encontraron productos con "' + query + '"</div>';
            return;
        }

        // También actualizar la cache local
        if (products.length > 0) {
            // Agregar a cache si no están
            products.forEach(p => {
                if (!posProductsCache.find(c => c.id === p.id)) {
                    posProductsCache.push(p);
                }
            });
        }

        resultsContainer.innerHTML = products.slice(0, 8).map(p => `
            <div class="pos-search-item" onclick="addToPOSCart(${p.id})">
                <div class="pos-search-item-info">
                    <span class="pos-search-item-code">${p.code || 'SIN CÓDIGO'}</span>
                    <span class="pos-search-item-name">${p.name || 'Sin nombre'}</span>
                </div>
                <div class="pos-search-item-details">
                    <span class="pos-search-item-stock ${(p.stock || 0) <= 5 ? 'low' : ''}">Stock: ${p.stock || 0}</span>
                    <span class="pos-search-item-price">$${(p.public_price || p.publicPrice || 0).toFixed(2)}</span>
                </div>
            </div>
        `).join('');

        resultsContainer.style.display = 'block';

    } catch (error) {
        console.error("POS: Error en búsqueda:", error);
        resultsContainer.innerHTML = '<div class="pos-no-results">Error de conexión</div>';
    }
}

// ===== Funciones de Turno =====
async function startPOSShift() {
    const fundInput = document.getElementById('posShiftFund');
    const fund = parseFloat(fundInput.value) || 0;

    // Obtener nombre del usuario logueado de cualquier fuente posible
    let currentUser = window.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    const cashierName = currentUser?.fullName || currentUser?.username || 'Cajero';
    const userId = currentUser?.id || null;
    const username = currentUser?.username || cashierName;

    try {
        // Llamar al backend para iniciar el turno en la base de datos
        if (typeof eel !== 'undefined') {
            const result = await eel.start_shift(fund, userId, username)();
            if (!result.success) {
                showNotification(result.error || 'Error al iniciar turno', 'error');
                return;
            }
            console.log('POS: Turno iniciado en backend, ID:', result.id);
        }

        posShiftFund = fund;
        posShiftActive = true;

        const shift = {
            date: new Date().toISOString().split('T')[0],
            fund: fund,
            cashier: cashierName,
            startTime: new Date().toISOString(),
            closed: false
        };
        StorageManager.set('posCurrentShift', shift);

        // Actualizar nombre del cajero inmediatamente
        const userEl = document.getElementById('posCurrentUserName');
        if (userEl) {
            userEl.textContent = cashierName;
        }

        updateShiftDisplay();
        loadTodaySales(); // Forzar recarga de ventas para este nuevo turno
        closeModal('posShiftModal');

        showNotification(`¡Bienvenido ${cashierName}! Turno iniciado`, 'success');
        document.getElementById('posProductSearch')?.focus();
    } catch (e) {
        console.error('Error iniciando turno:', e);
        showNotification('Error al iniciar turno', 'error');
    }
}

// Mostrar saludo con nombre del usuario al abrir modal de turno
function showShiftModalWithGreeting() {
    let currentUser = window.currentUser;
    if (!currentUser) {
        try {
            currentUser = JSON.parse(localStorage.getItem('currentUser'));
        } catch (e) { }
    }

    const cashierName = currentUser?.fullName || currentUser?.username || 'Cajero';
    console.log('POS: Saludo turno para:', cashierName);

    const greetingEl = document.getElementById('posCashierGreeting');
    if (greetingEl) {
        greetingEl.textContent = cashierName;
        // Cambiar color si es admin para destacar
        if (currentUser?.role === 'admin') {
            greetingEl.style.color = 'var(--warning-400)';
        }
    }

    openModal('posShiftModal');

    // Focus en fondo
    setTimeout(() => document.getElementById('posShiftFund')?.focus(), 100);
}

function cancelPOSShift() {
    closeModal('posShiftModal');
    exitPOS();
}

function exitPOS() {
    // Desactivar modo pantalla completa
    document.body.classList.remove('pos-fullscreen-mode');
    document.body.classList.remove('tab-fullscreen-mode');

    // Detener reloj
    if (window.posClockInterval) {
        clearInterval(window.posClockInterval);
        window.posClockInterval = null;
    }

    // Navegar de vuelta al dashboard usando TabsManager
    if (typeof TabsManager !== 'undefined') {
        TabsManager.openTab('dashboard');
    }
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
    const now = new Date();

    // Elementos antiguos (si existen)
    const oldDateEl = document.getElementById('posDateTime');
    if (oldDateEl) {
        const time = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        const date = now.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
        oldDateEl.textContent = `${date} ${time}`;
    }

    // Elementos nuevos
    const timeEl = document.getElementById('posTimeDisplay');
    const dateEl = document.getElementById('posDateDisplay');

    if (timeEl) {
        timeEl.textContent = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    }
    if (dateEl) {
        const dateStr = now.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'long' });
        dateEl.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    }

    // Mostrar nombre del usuario actual
    const userEl = document.getElementById('posCurrentUserName');
    if (userEl) {
        const currentUser = StorageManager.get('currentUser', null);
        if (currentUser && currentUser.fullName) {
            userEl.textContent = currentUser.fullName;
        } else if (currentUser && currentUser.username) {
            userEl.textContent = currentUser.username;
        } else {
            // Intentar obtener del turno actual
            const shift = StorageManager.get('posCurrentShift', null);
            if (shift && shift.cashier) {
                userEl.textContent = shift.cashier;
            }
        }
    }
}

// ===== Modal de Opciones (Diseño Original Restaurado) =====
function openPOSOptionsModal() {
    // 1. Obtener usuario y validar rol (Admin/Supervisor)
    const currentUser = StorageManager.get('currentUser', null) || window.currentUser;
    const isSupervisor = currentUser && (
        (currentUser.role && currentUser.role.toLowerCase() === 'admin') ||
        (currentUser.role && currentUser.role.toLowerCase() === 'supervisor') ||
        (currentUser.type && currentUser.type === 'admin')
    );

    // 2. Calcular Estadísticas
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];
    const shift = StorageManager.get('posCurrentShift', null);

    let filterDate = today;
    if (shift && shift.startTime) {
        filterDate = shift.startTime;
    }

    // Filtramos ventas desde el inicio del turno
    const relevantSales = sales.filter(s => s.date && s.date >= filterDate);

    const totalCount = relevantSales.length;
    const totalAmount = relevantSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashTotal = relevantSales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.total || 0), 0);
    const cardTotal = relevantSales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + (s.total || 0), 0);
    const transferTotal = relevantSales.filter(s => s.paymentMethod === 'transfer').reduce((sum, s) => sum + (s.total || 0), 0);

    // El fondo inicial
    const fund = (typeof posShiftFund !== 'undefined') ? posShiftFund : 0;

    const modalId = 'posOptionsModal';
    let modal = document.getElementById(modalId);
    if (modal) modal.remove();

    modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'modal';

    // SVGs (Iconos Premium)
    const icons = {
        printer: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
        user: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
        plus: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
        clock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',
        scissors: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><line x1="20" y1="4" x2="8.12" y2="15.88"></line><line x1="14.47" y1="14.48" x2="20" y2="20"></line><line x1="8.12" y1="8.12" x2="12" y2="12"></line></svg>',
        ban: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>',
        chart: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>',
        pause: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="10" y1="15" x2="10" y2="9"></line><line x1="14" y1="15" x2="14" y2="9"></line></svg>',
        lock: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>',
        x: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',
        zap: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>'
    };

    // 3. Botones HTML (Admin)
    let adminButtonsHTML = '';
    if (isSupervisor) {
        adminButtonsHTML = `
            <div class="pos-options-section supervisor" style="margin-top: 20px;">
                <h4>Administración</h4>
                <div class="pos-options-grid">
                    <button class="pos-option-btn danger" onclick="openCashCutModal()">
                        ${icons.scissors}
                        <span>Corte de Caja</span>
                    </button>
                    <button class="pos-option-btn warning" onclick="cancelLastSale()">
                        ${icons.ban}
                        <span>Anular Última</span>
                    </button>
                    <button class="pos-option-btn info" onclick="openSalesReport()">
                        ${icons.chart}
                        <span>Reporte Día</span>
                    </button>
                    <button class="pos-option-btn info" onclick="openShiftHistoryModal()">
                        ${icons.clock}
                        <span>Historial Cortes</span>
                    </button>
                    <button class="pos-option-btn secondary" onclick="showPausedSales()">
                         ${icons.pause}
                         <span>Ventas Pausadas</span>
                    </button>
                    <button class="pos-option-btn warning" onclick="toggleContinuousMode()">
                         ${icons.zap}
                         <span id="posContinuousBtnText">${typeof posIsContinuousMode !== 'undefined' && posIsContinuousMode ? 'Desactivar Cont.' : 'Modo Continuo'}</span>
                    </button>
                </div>
            </div>
        `;
    }

    // 4. Construir HTML Final
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
                <h3>Opciones de Caja F4</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">${icons.x}</button>
            </div>
            <div class="modal-body">
                
                <!-- SECCIÓN DE ESTADÍSTICAS -->
                <div class="pos-stats-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
                    <!-- Ventas Totales -->
                    <div style="background: var(--dark-surface); padding: 12px; border-radius: 8px; border: 1px solid var(--dark-border);">
                        <div style="font-size: 0.75rem; color: var(--gray-400); text-transform: uppercase; margin-bottom: 4px;">Ventas</div>
                        <div style="font-size: 1.5rem; font-weight: 700; color: var(--primary-400); line-height: 1;">${totalCount}</div>
                        <div style="font-size: 0.85rem; color: var(--gray-300); margin-top: 4px;">$${totalAmount.toFixed(2)}</div>
                    </div>
                    
                    <!-- Efectivo -->
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <div style="font-size: 0.75rem; color: var(--success-400); text-transform: uppercase; margin-bottom: 4px;">Efectivo</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--success-300); line-height: 1;">$${(fund + cashTotal).toFixed(2)}</div>
                        <div style="font-size: 0.7rem; opacity: 0.7; margin-top: 4px;">Inc. Fondo</div>
                    </div>

                    <!-- Tarjeta -->
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="font-size: 0.75rem; color: var(--primary-400); text-transform: uppercase; margin-bottom: 4px;">Tarjeta</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary-300); line-height: 1;">$${cardTotal.toFixed(2)}</div>
                    </div>

                    <!-- Transferencia -->
                    <div style="background: rgba(236, 72, 153, 0.1); padding: 12px; border-radius: 8px; border: 1px solid rgba(236, 72, 153, 0.2);">
                        <div style="font-size: 0.75rem; color: var(--pink-400); text-transform: uppercase; margin-bottom: 4px;">Transf.</div>
                        <div style="font-size: 1.25rem; font-weight: 700; color: var(--pink-300); line-height: 1;">$${transferTotal.toFixed(2)}</div>
                    </div>
                </div>

                <!-- SECCIÓN DE OPERACIONES -->
                <div class="pos-options-section">
                    <h4>Operaciones Generales</h4>
                    <div class="pos-options-grid">
                        <button class="pos-option-btn" onclick="reprintLastTicket()">
                            ${icons.printer}
                            <span>Reimprimir</span>
                        </button>
                        <button class="pos-option-btn" onclick="openPOSCustomerModal()">
                            ${icons.user}
                            <span>Cliente</span>
                        </button>
                        <button class="pos-option-btn" onclick="startNewSale()">
                             ${icons.plus}
                             <span>Nueva Venta</span>
                        </button>
                        <button class="pos-option-btn" onclick="openMobileScannerModal()">
                             ${icons.qr || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/></svg>'}
                             <span>Scanner Móvil</span>
                        </button>
                        <button class="pos-option-btn warning" style="background: rgba(245, 158, 11, 0.1);" onclick="pauseCurrentSale()">
                             ${icons.clock}
                             <span>Pausar</span>
                        </button>
                    </div>
                </div>
                
                ${adminButtonsHTML}

                 <!-- Botón Cerrar Turno -->
                 <div class="pos-options-section" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--dark-border);">
                    <button class="btn btn-block btn-secondary" onclick="closeShift()" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                        ${icons.lock} Cerrar Turno y Salir
                    </button>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    openModal(modalId);
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
    // Si hay productos en el carrito, pedir confirmación
    if (posCart.length > 0) {
        showConfirmNewSaleModal();
        return;
    }

    // Si el carrito está vacío, simplemente cerrar menú
    closeModal('posOptionsModal');
    document.getElementById('posProductSearch')?.focus();
    showNotification('Listo para nueva venta', 'info');
}

// Modal de confirmación para nueva venta
function showConfirmNewSaleModal() {
    closeModal('posOptionsModal');

    const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'confirmNewSaleModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 420px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--warning-500), var(--danger-500)); color: white;">
                <h3>⚠️ Carrito con productos</h3>
            </div>
            <div class="modal-body" style="padding: 20px; text-align: center;">
                <div style="font-size: 3rem; margin-bottom: 15px;">🛒</div>
                <p style="color: var(--gray-200); font-size: 1.1rem; margin-bottom: 10px;">
                    Tienes <strong style="color: var(--primary-400);">${totalItems} producto${totalItems > 1 ? 's' : ''}</strong> en el carrito
                </p>
                <p style="color: var(--success-400); font-size: 1.3rem; font-weight: bold; margin-bottom: 20px;">
                    Total: $${totalAmount.toFixed(2)}
                </p>
                <p style="color: var(--gray-400); font-size: 0.9rem;">
                    ¿Qué deseas hacer?
                </p>
            </div>
            <div class="modal-footer" style="display: flex; flex-direction: column; gap: 8px; padding: 15px;">
                <button class="btn btn-primary" onclick="pauseCurrentSale()" style="width: 100%; padding: 12px;">
                    ⏸️ Pausar Venta (Guardar para después)
                </button>
                <button class="btn btn-danger" onclick="confirmClearCart()" style="width: 100%; padding: 12px;">
                    🗑️ Descartar y Nueva Venta
                </button>
                <button class="btn btn-ghost" onclick="closeModal('confirmNewSaleModal'); openPOSOptionsModal();" style="width: 100%; padding: 10px;">
                    ← Volver al Menú
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Listener de teclado
    const keyHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal('confirmNewSaleModal');
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);
}

// Confirmar descarte del carrito
function confirmClearCart() {
    closeModal('confirmNewSaleModal');
    posCart = [];
    saveCart();
    renderPOSCart();
    updatePOSTotals();
    document.getElementById('posProductSearch')?.focus();
    showNotification('Carrito limpiado. Nueva venta lista.', 'info');
}

// ===== Sistema de Ventas en Pausa =====

// Pausar venta actual
function pauseCurrentSale() {
    if (posCart.length === 0) {
        showNotification('No hay nada que pausar', 'warning');
        return;
    }

    closeModal('confirmNewSaleModal');

    const currentUser = StorageManager.get('currentUser', null);
    const pausedSales = StorageManager.get('posPausedSales', []);

    const pausedSale = {
        id: Date.now().toString(),
        items: [...posCart],
        total: posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        pausedAt: new Date().toISOString(),
        pausedBy: currentUser?.fullName || 'Cajero'
    };

    pausedSales.push(pausedSale);
    StorageManager.set('posPausedSales', pausedSales);

    // Limpiar carrito actual
    posCart = [];
    saveCart();
    renderPOSCart();
    updatePOSTotals();

    showNotification(`Venta pausada. Tienes ${pausedSales.length} venta(s) en espera.`, 'success');
    document.getElementById('posProductSearch')?.focus();
}

// Ver ventas pausadas
function showPausedSales() {
    closeModal('posOptionsModal');

    const pausedSales = StorageManager.get('posPausedSales', []);

    const oldModal = document.getElementById('pausedSalesModal');
    if (oldModal) oldModal.remove();

    const salesList = pausedSales.length > 0 ? pausedSales.map((sale, index) => {
        const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
        const time = new Date(sale.pausedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--dark-bg); border-radius: 8px; margin-bottom: 8px;">
                <div>
                    <p style="font-weight: bold; color: var(--gray-200);">${itemCount} producto${itemCount > 1 ? 's' : ''}</p>
                    <p style="font-size: 0.85rem; color: var(--gray-500);">Pausada a las ${time} por ${sale.pausedBy}</p>
                </div>
                <div style="text-align: right;">
                    <p style="font-size: 1.2rem; font-weight: bold; color: var(--success-400);">$${sale.total.toFixed(2)}</p>
                    <div style="display: flex; gap: 5px; margin-top: 5px;">
                        <button class="btn btn-sm btn-primary" onclick="resumePausedSale(${index})" style="padding: 5px 10px;">▶️ Retomar</button>
                        <button class="btn btn-sm btn-ghost" onclick="deletePausedSale(${index})" style="padding: 5px 10px;">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('') : '<div style="text-align: center; padding: 30px; color: var(--gray-500);">No hay ventas pausadas</div>';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'pausedSalesModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-500), var(--primary-600)); color: white;">
                <h3>⏸️ Ventas en Espera (${pausedSales.length})</h3>
                <button class="modal-close" onclick="closeModal('pausedSalesModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 15px; max-height: 400px; overflow-y: auto;">
                ${salesList}
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('pausedSalesModal')">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Retomar venta pausada
function resumePausedSale(index) {
    const pausedSales = StorageManager.get('posPausedSales', []);

    if (index < 0 || index >= pausedSales.length) {
        showNotification('Venta no encontrada', 'error');
        return;
    }

    // Si hay carrito actual, preguntar qué hacer
    if (posCart.length > 0) {
        if (!confirm('Ya tienes productos en el carrito actual.\n¿Deseas combinarlos con la venta pausada?')) {
            // No combinar, solo agregar la pausada
            if (!confirm('¿Descartar el carrito actual y cargar la venta pausada?')) {
                return;
            }
            posCart = [];
        }
    }

    const saleToResume = pausedSales[index];

    // Agregar items al carrito actual
    saleToResume.items.forEach(item => {
        const existing = posCart.find(i => i.productId === item.productId);
        if (existing) {
            existing.quantity += item.quantity;
        } else {
            posCart.push({ ...item });
        }
    });

    // Eliminar de pausadas
    pausedSales.splice(index, 1);
    StorageManager.set('posPausedSales', pausedSales);

    saveCart();
    renderPOSCart();
    updatePOSTotals();

    closeModal('pausedSalesModal');
    showNotification('Venta retomada', 'success');
    document.getElementById('posProductSearch')?.focus();
}

// Eliminar venta pausada
function deletePausedSale(index) {
    if (!confirm('¿Eliminar esta venta pausada?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    const pausedSales = StorageManager.get('posPausedSales', []);
    pausedSales.splice(index, 1);
    StorageManager.set('posPausedSales', pausedSales);

    showNotification('Venta eliminada', 'info');
    showPausedSales(); // Refrescar lista
}

// Exportar funciones
window.showConfirmNewSaleModal = showConfirmNewSaleModal;
window.confirmClearCart = confirmClearCart;
window.pauseCurrentSale = pauseCurrentSale;
window.showPausedSales = showPausedSales;
window.resumePausedSale = resumePausedSale;
window.deletePausedSale = deletePausedSale;

async function cancelLastSale() {
    if (!posLastSale) {
        showNotification('No hay venta para anular', 'warning');
        return;
    }

    if (!confirm(`¿Está seguro de anular la venta ${posLastSale.folio}?\n\nEsta acción devolverá los productos al inventario.`)) {
        return;
    }

    // Intentar anular en backend si existe ID
    if (posLastSale.backendId && typeof eel !== 'undefined') {
        try {
            const result = await eel.cancel_sale(posLastSale.backendId)();
            if (!result.success) {
                // Si falla en backend (ej. ya cancelada o error BD), avisar y preguntar si continuar localmente
                if (!confirm(`Error al anular en servidor: ${result.error}\n\n¿Deseas forzar la anulación LOCALMENTE? (Esto podría causar desincronización)`)) {
                    return;
                }
            } else {
                console.log('POS: Venta anulada en backend correctamente');
            }
        } catch (e) {
            if (!confirm(`Error de conexión al anular: ${e}\n\n¿Deseas forzar la anulación LOCALMENTE?`)) {
                return;
            }
        }
    }

    // Revertir inventario localmente (para mantener sync inmediata)
    const products = posProductsCache.length > 0 ? posProductsCache : StorageManager.get('products', []);
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

async function closeShift() {
    if (!confirm('¿Está seguro de cerrar el turno?\n\nNo podrá realizar más ventas hasta iniciar un nuevo turno.')) {
        return;
    }

    try {
        // Llamar al backend para cerrar el turno en la base de datos
        let backendSummary = null;
        if (typeof eel !== 'undefined') {
            const result = await eel.end_shift()();
            if (result.success) {
                backendSummary = result.summary;
                console.log('POS: Turno cerrado en backend', result.summary);
            } else {
                console.warn('POS: Backend reportó error al cerrar turno:', result.error);
            }
        }

        // Guardar resumen del turno en historial local
        const shiftData = StorageManager.get('posCurrentShift', {});
        shiftData.endTime = new Date().toISOString();
        shiftData.closed = true;
        if (backendSummary) {
            shiftData.cashCut = backendSummary;
        }

        const closedShifts = StorageManager.get('posClosedShifts', []);
        closedShifts.push(shiftData);
        StorageManager.set('posClosedShifts', closedShifts);

        // Limpiar turno actual
        StorageManager.remove('posCurrentShift');
        posShiftActive = false;
        posShiftFund = 0;

        closeModal('posOptionsModal');
        exitPOS();
        loadTodaySales(); // Forzar reinicio de contadores en UI
        showNotification('Turno cerrado correctamente', 'success');
    } catch (e) {
        console.error('Error cerrando turno:', e);
        showNotification('Error al cerrar turno', 'error');
    }
}


// ===== Agregar al Carrito =====
function addToPOSCart(productId, forceAdd = false, customQuantity = null) {
    console.log("addToPOSCart llamado con:", productId, "force:", forceAdd, "qty:", customQuantity);

    // Validar que hay turno activo
    if (!posShiftActive) {
        showNotification('⚠️ Debe iniciar turno antes de agregar productos', 'warning');
        showShiftModalWithGreeting();
        return;
    }

    const products = posProductsCache.length > 0 ? posProductsCache : StorageManager.get('products', []);

    // Comparación flexible (string o número)
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
        showNotification('Producto no encontrado (ID: ' + productId + ')', 'error');
        return;
    }

    // Detectar si es producto por peso
    const unit = product.unit || 'pieza';
    const isPesable = unit === 'peso' || ['kg', 'g', 'lt', 'ml'].includes(unit);

    // Si es pesable y no tiene cantidad customizada, pedir el peso
    if (isPesable && customQuantity === null) {
        showWeightInputModal(product);
        return;
    }

    const quantityToAdd = customQuantity !== null ? customQuantity : 1;
    const currentStock = product.stock || 0;
    const existingItem = posCart.find(item => String(item.productId) === String(productId));
    const currentQtyInCart = existingItem ? existingItem.quantity : 0;
    const totalNeeded = currentQtyInCart + quantityToAdd;

    // Verificar stock (solo para productos por pieza, no para pesables)
    // LEER CONFIGURACIÓN: Si skipStockCheck está activo, no verificar stock
    const appSettings = StorageManager.get('appSettings') || {};
    const skipStockCheck = appSettings.skipStockCheck || false;

    if (!forceAdd && !isPesable && !skipStockCheck && totalNeeded > currentStock) {
        // Mostrar modal de confirmación
        showNoStockConfirmModal(product, currentStock, totalNeeded);
        return;
    }

    // Agregar o incrementar
    if (existingItem && !isPesable) {
        existingItem.quantity += quantityToAdd;
    } else {
        const price = product.public_price || product.publicPrice || 0;
        posCart.push({
            productId: product.id,
            code: product.code || '',
            name: product.name || 'Sin nombre',
            price: price,
            quantity: quantityToAdd,
            maxStock: currentStock,
            unit: unit,
            isPesable: isPesable
        });
    }

    // Limpiar búsqueda
    const searchInput = document.getElementById('posProductSearch');
    const resultsContainer = document.getElementById('posSearchResults');
    if (searchInput) searchInput.value = '';
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
        posSearchSelectedIndex = -1;
    }
    if (searchInput) searchInput.focus();

    renderPOSCart();
    updatePOSTotals();
    saveCart(); // Persistir carrito

    const unitLabel = isPesable ? getUnitLabel(unit) : '';
    if (forceAdd) {
        showNotification(`${product.name} agregado (sin stock)`, 'warning');
    } else if (isPesable) {
        showNotification(`${product.name} - ${quantityToAdd} ${unitLabel} agregado`, 'success');
    } else {
        showNotification(`${product.name} agregado`, 'success');
    }
}

// ===== Modal para ingresar peso =====
function showWeightInputModal(product) {
    const unit = product.unit || 'kg';
    const unitLabel = getUnitLabel(unit);
    const price = product.public_price || product.publicPrice || 0;

    let modal = document.getElementById('weightInputModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'weightInputModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>⚖️ Ingresar Peso</h3>
                <button class="modal-close" onclick="closeModal('weightInputModal')">&times;</button>
            </div>
            <div class="modal-body" style="text-align: center;">
                <p style="margin-bottom: 10px; color: var(--gray-300);">${product.name}</p>
                <p style="margin-bottom: 20px; font-size: 0.9rem; color: var(--gray-400);">
                    Precio: <strong>$${price.toFixed(2)} / Kg</strong>
                </p>
                
                <div class="weight-input-container" style="margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <input type="number" id="weightInputValue" class="form-input" 
                        step="0.001" min="0.001" placeholder="0.000"
                        style="font-size: 2rem; text-align: center; padding: 15px; width: 150px;" autofocus>
                    <span style="font-size: 1.5rem; color: var(--gray-300);">Kg</span>
                </div>
                
                <div id="weightPreview" style="font-size: 1.3rem; color: var(--success-500); margin-bottom: 15px;">
                    Total: $0.00
                </div>
                
                <p style="font-size: 0.8rem; color: var(--gray-500); margin-bottom: 10px;">Accesos rápidos:</p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-bottom: 15px;">
                    <button class="btn btn-ghost" onclick="setWeight(0.100)">100g</button>
                    <button class="btn btn-ghost" onclick="setWeight(0.250)">250g</button>
                    <button class="btn btn-ghost" onclick="setWeight(0.500)">500g</button>
                    <button class="btn btn-ghost" onclick="setWeight(1)">1 Kg</button>
                    <button class="btn btn-ghost" onclick="setWeight(2)">2 Kg</button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('weightInputModal')">Cancelar</button>
                <button class="btn btn-primary" onclick="confirmWeight(${product.id}, ${price})">
                    ✓ Agregar
                </button>
            </div>
        </div>
    `;

    openModal('weightInputModal');

    // Configurar preview en tiempo real
    setTimeout(() => {
        const input = document.getElementById('weightInputValue');
        if (input) {
            input.focus();
            input.addEventListener('input', () => updateWeightPreview(price));

            // Enter para confirmar
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    confirmWeight(product.id, price);
                }
            });
        }
    }, 100);
}

function updateWeightPreview(pricePerUnit) {
    const weight = parseFloat(document.getElementById('weightInputValue')?.value) || 0;
    const total = weight * pricePerUnit;
    const preview = document.getElementById('weightPreview');
    if (preview) {
        preview.textContent = `Total: $${total.toFixed(2)}`;
    }
}

function setWeight(value) {
    const input = document.getElementById('weightInputValue');
    if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input'));
    }
}

function confirmWeight(productId, price) {
    const weight = parseFloat(document.getElementById('weightInputValue')?.value) || 0;

    if (weight <= 0) {
        showNotification('Ingresa un peso válido', 'error');
        return;
    }

    closeModal('weightInputModal');

    // Agregar al carrito con la cantidad personalizada
    addToPOSCart(productId, false, weight);
}

function getUnitLabel(unit) {
    const labels = {
        'pieza': 'pza',
        'kg': 'Kg',
        'g': 'g',
        'lt': 'L',
        'ml': 'ml'
    };
    return labels[unit] || unit;
}

// ===== Modal: Confirmar Venta Sin Stock =====
function showNoStockConfirmModal(product, currentStock, needed) {
    const existingModal = document.getElementById('posNoStockModal');
    if (existingModal) existingModal.remove();

    const deficit = needed - currentStock;
    const stockText = currentStock <= 0
        ? '<span style="color: var(--danger-500);">Sin stock</span>'
        : `<span style="color: var(--warning-500);">${currentStock} unidades</span>`;

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'posNoStockModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--warning-500), var(--danger-500)); color: white;">
                <h3>⚠️ Stock Insuficiente</h3>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <div style="background: var(--dark-surface); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
                    <p style="font-weight: bold; margin-bottom: 3px;">${product.name}</p>
                    <p style="color: var(--gray-400); font-size: 0.9rem; font-family: monospace;">${product.code || 'Sin código'}</p>
                </div>
                <div style="display: flex; justify-content: space-around; text-align: center; margin: 15px 0;">
                    <div>
                        <p style="color: var(--gray-400); font-size: 0.85rem;">Stock</p>
                        <p style="font-size: 1.3rem; font-weight: bold;">${stockText}</p>
                    </div>
                    <div>
                        <p style="color: var(--gray-400); font-size: 0.85rem;">Necesita</p>
                        <p style="font-size: 1.3rem; font-weight: bold; color: var(--primary-400);">${needed}</p>
                    </div>
                </div>
                <p style="text-align: center; color: var(--gray-500); font-size: 0.85rem;">
                    Stock quedará en: <strong style="color: var(--danger-400);">-${deficit}</strong>
                </p>
            </div>
            <div class="modal-footer" style="justify-content: center; gap: 10px; padding: 15px;">
                <button class="btn btn-ghost" onclick="closeModal('posNoStockModal')" style="padding: 10px 20px;">Esc</button>
                <button id="btnConfirmNoStock" class="btn btn-warning" onclick="confirmAddWithoutStock(${product.id})" style="padding: 10px 20px;">
                    ✅ Vender (Enter)
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Agregar listener de teclado temporal
    const keyHandler = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmAddWithoutStock(product.id);
            document.removeEventListener('keydown', keyHandler);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModal('posNoStockModal');
            document.removeEventListener('keydown', keyHandler);
        }
    };
    document.addEventListener('keydown', keyHandler);

    // Focus en botón de confirmar
    setTimeout(() => document.getElementById('btnConfirmNoStock')?.focus(), 100);
}

// ===== Confirmar agregar sin stock =====
function confirmAddWithoutStock(productId) {
    closeModal('posNoStockModal');
    addToPOSCart(productId, true); // forceAdd = true
}

// ===== Renderizar Carrito =====
function renderPOSCart() {
    const tableBody = document.getElementById('posCartBody');
    if (!tableBody) {
        console.warn('posCartBody no encontrado');
        return;
    }
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
        if (countEl) countEl.textContent = '0 productos';
        if (liveCountEl) liveCountEl.textContent = '0';
        const checkoutBtn = document.getElementById('posCheckoutBtn');
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    const totalItems = posCart.reduce((sum, item) => sum + item.quantity, 0);
    if (countEl) countEl.textContent = `${totalItems} producto${totalItems > 1 ? 's' : ''}`;
    if (liveCountEl) liveCountEl.textContent = totalItems;
    const checkoutBtn = document.getElementById('posCheckoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = false;

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
    const settings = StorageManager.get('appSettings', {});
    const allowNegative = settings.allowNegativeStock === true;

    if (newQty <= 0) {
        removeFromPOSCart(index);
        return;
    }

    if (!allowNegative && newQty > item.maxStock) {
        showNotification('No hay suficiente stock', 'warning');
        return;
    }

    item.quantity = newQty;
    renderPOSCart();
    updatePOSTotals();
    saveCart();
}

// ===== Eliminar del Carrito =====
function removeFromPOSCart(index) {
    posCart.splice(index, 1);
    renderPOSCart();
    updatePOSTotals();
    saveCart();
}

// ===== Limpiar Carrito =====
function clearPOSCart() {
    if (posCart.length === 0) return;

    posCart = [];
    renderPOSCart();
    updatePOSTotals();
    saveCart();
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

    // Actualizar vista previa del ticket (Panel Izquierdo)
    updateLiveTicketPreview();

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

    // ====== MODO VENTA CONTINUA (Ticket Infinito) ======
    // En modo continuo SIEMPRE se cobra en efectivo (sin crédito)
    if (typeof posIsContinuousMode !== 'undefined' && posIsContinuousMode) {
        const totalText = document.getElementById('posTotal').textContent;
        const totalValue = parseFloat(totalText.replace(/[$,]/g, '')) || 0;

        // Preparar inputs simulados para confirmPOSPayment
        const totalLabel = document.getElementById('posPaymentTotal');
        const cashInput = document.getElementById('posCashReceivedModal');

        if (totalLabel) totalLabel.textContent = totalText;
        if (cashInput) cashInput.value = totalValue.toFixed(2);

        posPaymentMethod = 'cash';
        posOriginalTotal = 0;
        posAppliedDiscount = 0;

        // Ejecutar cobro inmediato
        confirmPOSPayment();
        showNotification('⚡ Venta registrada', 'success');
        return;
    }
    // ====================================================

    // Mostrar total en el modal
    const total = document.getElementById('posTotal').textContent;
    document.getElementById('posPaymentTotal').textContent = total;

    // Reset descuento
    posOriginalTotal = 0;
    posAppliedDiscount = 0;
    const discountInput = document.getElementById('posDiscountInput');
    if (discountInput) discountInput.value = '';
    const discountInfo = document.getElementById('posDiscountInfo');
    if (discountInfo) discountInfo.textContent = '';

    // Mostrar sección de descuento solo si es admin
    const currentUser = StorageManager.get('currentUser', {});
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'supervisor';
    const discountSection = document.getElementById('posDiscountSection');
    if (discountSection) {
        discountSection.style.display = isAdmin ? 'block' : 'none';
    }

    // Reset modal state
    posPaymentMethod = 'cash';
    document.querySelectorAll('#posPaymentModal .pos-payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('#posPaymentModal .pos-payment-btn[data-method="cash"]')?.classList.add('active');

    // Ocultar todas las secciones y mostrar solo efectivo
    ['posCashSectionModal', 'posCardSectionModal', 'posTransferSectionModal', 'posMixedSectionModal'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === 'posCashSectionModal' ? 'block' : 'none';
    });

    // Reset campos
    const cashReceived = document.getElementById('posCashReceivedModal');
    if (cashReceived) cashReceived.value = '';
    const changeModal = document.getElementById('posChangeModal');
    if (changeModal) {
        changeModal.textContent = '$0.00';
        changeModal.classList.remove('negative');
    }

    // Reset pago dividido
    const mixedCash = document.getElementById('posMixedCash');
    const mixedCard = document.getElementById('posMixedCard');
    if (mixedCash) mixedCash.value = '';
    if (mixedCard) mixedCard.value = '';

    // Abrir modal
    openModal('posPaymentModal');

    // Focus en campo de pago
    setTimeout(() => {
        document.getElementById('posCashReceivedModal')?.focus();
    }, 100);
}

// ===== Seleccionar Método de Pago en Modal =====
function selectPaymentMethodModal(method, btnElement) {
    posPaymentMethod = method;

    document.querySelectorAll('#posPaymentModal .pos-payment-btn').forEach(btn => btn.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Ocultar todas las secciones
    const sections = ['posCashSectionModal', 'posCardSectionModal', 'posTransferSectionModal', 'posMixedSectionModal', 'posCreditSectionModal'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    // Mostrar la sección correspondiente
    if (method === 'cash') {
        document.getElementById('posCashSectionModal').style.display = 'block';
        setTimeout(() => document.getElementById('posCashReceivedModal')?.focus(), 100);
    } else if (method === 'card') {
        document.getElementById('posCardSectionModal').style.display = 'block';
    } else if (method === 'transfer') {
        document.getElementById('posTransferSectionModal').style.display = 'block';
    } else if (method === 'mixed') {
        document.getElementById('posMixedSectionModal').style.display = 'block';
        // Pre-llenar con la mitad del total en cada uno
        const totalText = document.getElementById('posPaymentTotal').textContent;
        const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;
        document.getElementById('posMixedCash').value = '';
        document.getElementById('posMixedCard').value = '';
        calculateMixedPayment();
        setTimeout(() => document.getElementById('posMixedCash')?.focus(), 100);
    } else if (method === 'credit') {
        document.getElementById('posCreditSectionModal').style.display = 'block';

        // Verificar si hay cliente seleccionado con crédito
        const totalText = document.getElementById('posPaymentTotal').textContent;
        const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;

        const creditInfo = document.getElementById('posCreditInfo');
        const creditClientInfo = document.getElementById('posCreditClientInfo');

        if (posSelectedCustomer && posSelectedCustomer.allow_credit) {
            creditInfo.style.display = 'none';
            creditClientInfo.style.display = 'block';
            document.getElementById('posCreditClientName').textContent = posSelectedCustomer.name;
            document.getElementById('posCreditAvailable').textContent =
                `Crédito disponible: $${posSelectedCustomer.credit_available.toFixed(2)}`;

            // Validar si tiene suficiente crédito
            if (total > posSelectedCustomer.credit_available) {
                document.getElementById('posCreditAvailable').textContent =
                    `⚠️ Crédito insuficiente. Disponible: $${posSelectedCustomer.credit_available.toFixed(2)}`;
                document.getElementById('posCreditAvailable').style.color = 'var(--danger-400)';
            } else {
                document.getElementById('posCreditAvailable').style.color = 'var(--success-400)';
            }
        } else {
            creditInfo.style.display = 'block';
            creditClientInfo.style.display = 'none';
        }
    }
}

// ===== Calcular Pago Dividido =====
function calculateMixedPayment() {
    const totalText = document.getElementById('posPaymentTotal').textContent;
    const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;

    const cashAmount = parseFloat(document.getElementById('posMixedCash').value) || 0;
    const cardAmount = parseFloat(document.getElementById('posMixedCard').value) || 0;
    const totalPaid = cashAmount + cardAmount;
    const remaining = total - totalPaid;

    const statusEl = document.getElementById('posMixedStatus');

    if (remaining > 0.01) {
        statusEl.innerHTML = `<span style="color: var(--warning-400);">⚠️ Falta: $${remaining.toFixed(2)}</span>`;
    } else if (remaining < -0.01) {
        statusEl.innerHTML = `<span style="color: var(--danger-400);">⚠️ Excedente: $${Math.abs(remaining).toFixed(2)}</span>`;
    } else {
        statusEl.innerHTML = `<span style="color: var(--success-400);">✅ Monto completo</span>`;
    }
}

// ===== Aplicar Descuento (Solo Admin) =====
let posOriginalTotal = 0;
let posAppliedDiscount = 0;

function applyDiscount() {
    const discountInput = document.getElementById('posDiscountInput');
    const discountPercent = parseFloat(discountInput.value) || 0;

    if (discountPercent < 0 || discountPercent > 100) {
        showNotification('El descuento debe estar entre 0 y 100%', 'error');
        return;
    }

    if (posOriginalTotal === 0) {
        // Guardar el total original
        const totalText = document.getElementById('posPaymentTotal').textContent;
        posOriginalTotal = parseFloat(totalText.replace(/[$,]/g, '')) || 0;
    }

    const discountAmount = posOriginalTotal * (discountPercent / 100);
    const newTotal = posOriginalTotal - discountAmount;
    posAppliedDiscount = discountPercent;

    document.getElementById('posPaymentTotal').textContent = `$${newTotal.toFixed(2)}`;
    document.getElementById('posDiscountInfo').textContent =
        `Descuento ${discountPercent}%: -$${discountAmount.toFixed(2)} (Original: $${posOriginalTotal.toFixed(2)})`;

    showNotification(`Descuento del ${discountPercent}% aplicado`, 'success');
}

// ===== Funciones de Pago Rápido =====
window.addCashAmount = function (amount) {
    const input = document.getElementById('posCashReceivedModal');
    const current = parseFloat(input.value) || 0;
    input.value = (current + amount).toFixed(2);
    calculateChangeModal();
    input.focus();
}

window.setExactAmount = function () {
    const totalText = document.getElementById('posPaymentTotal').textContent;
    const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;
    const input = document.getElementById('posCashReceivedModal');
    input.value = total.toFixed(2);
    calculateChangeModal();
    input.focus();
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
async function confirmPOSPayment() {
    // Validar que hay turno activo (variable local)
    if (!posShiftActive) {
        showNotification('⚠️ No hay turno activo. Debe iniciar turno para cobrar.', 'error');
        closeModal('posPaymentModal');
        showShiftModalWithGreeting();
        return;
    }

    // Validación adicional: verificar con el backend que el turno sigue abierto
    try {
        if (typeof eel !== 'undefined') {
            const shiftResult = await eel.get_current_shift()();
            if (!shiftResult.active || !shiftResult.data) {
                // El turno fue cerrado en backend pero localStorage no se actualizó
                console.warn('POS: Turno cerrado en backend - sincronizando estado local');
                posShiftActive = false;
                StorageManager.remove('posCurrentShift');
                showNotification('⚠️ El turno fue cerrado. Inicie un nuevo turno.', 'error');
                closeModal('posPaymentModal');
                showShiftModalWithGreeting();
                return;
            }
        }
    } catch (e) {
        console.error('POS: Error verificando turno con backend:', e);
        // Continuar si falla la verificación (modo offline)
    }

    const totalText = document.getElementById('posPaymentTotal').textContent;
    const total = parseFloat(totalText.replace(/[$,]/g, '')) || 0;

    let cashReceived = total;
    let cardReceived = 0;
    let change = 0;

    // Validar según método de pago
    if (posPaymentMethod === 'cash') {
        cashReceived = parseFloat(document.getElementById('posCashReceivedModal').value) || 0;
        if (cashReceived < total) {
            showNotification('El pago recibido es insuficiente', 'error');
            document.getElementById('posCashReceivedModal')?.focus();
            return;
        }
        change = cashReceived - total;
    } else if (posPaymentMethod === 'mixed') {
        // Pago dividido
        cashReceived = parseFloat(document.getElementById('posMixedCash').value) || 0;
        cardReceived = parseFloat(document.getElementById('posMixedCard').value) || 0;
        const totalPaid = cashReceived + cardReceived;

        if (totalPaid < total - 0.01) {
            showNotification(`Falta $${(total - totalPaid).toFixed(2)} para completar el pago`, 'error');
            return;
        }

        if (totalPaid > total + 0.01) {
            change = totalPaid - total;
        }
    } else if (posPaymentMethod === 'card' || posPaymentMethod === 'transfer') {
        // Tarjeta o transferencia - monto exacto
        cashReceived = 0;
        cardReceived = total;
    } else if (posPaymentMethod === 'credit') {
        // Pago a crédito
        if (!posSelectedCustomer) {
            showNotification('Selecciona un cliente para venta a crédito', 'error');
            return;
        }
        if (!posSelectedCustomer.allow_credit) {
            showNotification('Este cliente no tiene crédito habilitado', 'error');
            return;
        }
        if (total > posSelectedCustomer.credit_available) {
            showNotification(`Crédito insuficiente. Disponible: $${posSelectedCustomer.credit_available.toFixed(2)}`, 'error');
            return;
        }
        cashReceived = 0;
        cardReceived = 0;
    }

    // Cerrar modal de pago
    closeModal('posPaymentModal');

    // Enviar venta al Backend
    let folio = `LOC-${Date.now().toString().slice(-6)}`;

    const backendSale = {
        items: posCart.map(item => ({
            product_id: item.productId,
            product_code: item.code,
            product_name: item.name,
            quantity: item.quantity,
            unit_price: item.price
        })),
        payment_method: posPaymentMethod,
        cash_received: cashReceived,
        card_received: cardReceived,
        change_given: change,
        discount: posAppliedDiscount,
        original_total: posOriginalTotal > 0 ? posOriginalTotal : total,
        customer_id: posSelectedCustomer ? posSelectedCustomer.id : null,
        customer_name: posSelectedCustomer ? posSelectedCustomer.name : null
    };

    try {
        const result = await eel.save_sale(backendSale)();

        if (result && result.success) {
            folio = result.folio;

            // Si es venta a crédito, registrar el cargo en la cuenta del cliente
            if (posPaymentMethod === 'credit' && posSelectedCustomer) {
                try {
                    // Parámetros: customer_id, amount, sale_id (null), reference, notes, user
                    const chargeResult = await eel.add_customer_charge(
                        posSelectedCustomer.id,
                        total,
                        null,  // sale_id will be set by backend if needed
                        `Venta ${folio}`,
                        '',
                        'POS'
                    )();
                    console.log('POS: Cargo a crédito:', chargeResult);

                    if (chargeResult && chargeResult.success) {
                        showNotification(`✅ Cargo a crédito registrado: $${total.toFixed(2)} a ${posSelectedCustomer.name}`, 'success');
                    } else {
                        console.error('Error en cargo a crédito:', chargeResult);
                        showNotification(`⚠️ Error al registrar cargo: ${chargeResult?.error || 'Desconocido'}`, 'error');
                    }
                } catch (creditError) {
                    console.error('Error registrando cargo a crédito:', creditError);
                    showNotification('⚠️ Error al registrar cargo a crédito', 'error');
                }
            }
        } else {
            console.error("Error backend:", result);
        }
    } catch (e) {
        console.error("Error calling save_sale:", e);
    }

    // Limpiar cliente seleccionado después de la venta
    // *** FIX: En modo continuo, mantener el cliente seleccionado ***
    const customerForTicket = posSelectedCustomer ? { ...posSelectedCustomer } : null;

    // Limpiar cliente seleccionado después de la venta (siempre)
    posSelectedCustomer = null;
    updatePOSCustomerDisplay();

    // Crear registro de venta local para UI
    const sale = {
        id: Date.now().toString(),
        backendId: (typeof result !== 'undefined' && result && result.success) ? result.id : null,
        folio: folio,
        date: new Date().toISOString(),
        items: posCart.map(item => ({ ...item })),
        subtotal: parseFloat(document.getElementById('posSubtotal').textContent.replace('$', '')),
        discount: 0,
        iva: parseFloat(document.getElementById('posIVA').textContent.replace('$', '')),
        total: total,
        paymentMethod: posPaymentMethod,
        cashReceived: cashReceived,
        change: change,
        customerName: customerForTicket ? customerForTicket.name : null,
        customerId: customerForTicket ? customerForTicket.id : null
    };

    // Guardar venta en historial local
    const sales = StorageManager.get('sales', []);
    sales.push(sale);
    const saveResult = StorageManager.set('sales', sales);
    console.log('POS: Venta guardada:', sale.folio, '- Total ventas:', sales.length, '- Guardado:', saveResult);

    // Descontar inventario
    const products = posProductsCache.length > 0 ? posProductsCache : StorageManager.get('products', []);
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

    // Guardar como última venta (para reimprimir si es necesario)
    posLastSale = sale;

    // Mostrar ticket visual (el usuario puede imprimir manualmente si lo desea)
    showPOSTicket(sale);

    // Limpiar carrito Y guardarlo vacío
    posCart = [];
    saveCart(); // Persistir carrito vacío
    renderPOSCart();
    updatePOSTotals();
    loadTodaySales();

    showNotification(`Venta ${folio} completada exitosamente`, 'success');
}

// ===== Actualizar Vista Previa de Ticket (Panel Izquierdo) =====
function updateLiveTicketPreview() {
    const container = document.getElementById('posLiveTicketContent');
    if (!container) return;

    if (posCart.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #999; padding: 40px 20px;">
                <svg style="width: 48px; height: 48px; margin-bottom: 10px; opacity: 0.3;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <p>El ticket aparecerá aquí en tiempo real</p>
            </div>
        `;
        return;
    }

    // Calcular totales
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const previewData = {
        folio: 'EN CURSO',
        date: new Date().toISOString(),
        items: posCart,
        subtotal: subtotal,
        discount: 0,
        iva: iva,
        total: total,
        paymentMethod: 'cash'
    };

    container.innerHTML = generateTicketHTML(previewData);
}

// ===== Generar HTML del Ticket (Reutilizable) =====
function generateTicketHTML(data) {
    const settings = StorageManager.get('appSettings', {});
    const companyName = settings.companyName || 'Refaccionaria Smip';
    const companyPhone = settings.companyPhone || '';
    const companyAddress = settings.companyAddress || '';

    return `
        <div class="pos-ticket">
            <div class="pos-ticket-header">
                <h3>${companyName}</h3>
                ${companyAddress ? `<p>${companyAddress}</p>` : ''}
                ${companyPhone ? `<p>Tel: ${companyPhone}</p>` : ''}
            </div>
            <div class="pos-ticket-info">
                <p><strong>Folio:</strong> ${data.folio}</p>
                <p><strong>Fecha:</strong> ${new Date(data.date).toLocaleString()}</p>
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
                        ${data.items.map(item => `
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
                    <span>$${data.subtotal.toFixed(2)}</span>
                </div>
                ${data.discount > 0 ? `
                <div class="pos-ticket-row">
                    <span>Descuento:</span>
                    <span>-$${data.discount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="pos-ticket-row">
                    <span>IVA (16%):</span>
                    <span>$${data.iva.toFixed(2)}</span>
                </div>
                <div class="pos-ticket-row pos-ticket-total">
                    <span>TOTAL:</span>
                    <span>$${data.total.toFixed(2)}</span>
                </div>
                ${data.paymentMethod === 'cash' ? `
                <div class="pos-ticket-row">
                    <span>Recibido:</span>
                    <span>$${(data.cashReceived || data.total).toFixed(2)}</span>
                </div>
                <div class="pos-ticket-row">
                    <span>Cambio:</span>
                    <span>$${(data.change || 0).toFixed(2)}</span>
                </div>
                ` : data.paymentMethod === 'credit' ? `
                <div class="pos-ticket-row">
                    <span>Pago:</span>
                    <span>CRÉDITO</span>
                </div>
                ${data.customerName ? `
                <div class="pos-ticket-row">
                    <span>Cliente:</span>
                    <span>${data.customerName}</span>
                </div>
                ` : ''}
                ` : ''}
            </div>
            <div class="pos-ticket-footer">
                <p>¡Gracias por su compra!</p>
            </div>
        </div>
    `;
}

// ===== Imprimir Ticket (Mostrar, imprimir y cerrar automático) =====
function printTicketDirect(sale) {
    const ticketHTML = generateTicketHTML(sale);

    // Crear modal para mostrar ticket
    const oldModal = document.getElementById('ticketModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'ticketModal';
    modal.innerHTML = `
        <div class="modal-content modal-sm" style="max-width: 350px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--success-500), var(--success-600)); color: white;">
                <h3>✅ ${sale.folio}</h3>
            </div>
            <div class="modal-body" style="padding: 10px; background: white; color: #000; max-height: 400px; overflow-y: auto;">
                ${ticketHTML}
            </div>
            <div class="modal-footer" style="justify-content: center; padding: 10px;">
                <p style="color: var(--gray-400); font-size: 0.85rem; margin: 0;">⏳ Imprimiendo... cierra en 3s</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Imprimir después de mostrar el modal
    setTimeout(() => {
        const printWindow = window.open('', '_blank', 'width=300,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Ticket ${sale.folio}</title>
                    <style>
                        body { font-family: 'Courier New', monospace; padding: 10px; max-width: 280px; margin: 0 auto; font-size: 12px; }
                        .pos-ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; }
                        .pos-ticket-header h3 { margin: 0 0 5px 0; font-size: 14px; }
                        .pos-ticket-header p { margin: 2px 0; font-size: 11px; }
                        .pos-ticket-info { border-bottom: 1px dashed #000; padding: 8px 0; }
                        .pos-ticket-info p { margin: 2px 0; font-size: 11px; }
                        .pos-ticket-items { border-bottom: 1px dashed #000; padding: 8px 0; }
                        .pos-ticket-item { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
                        .pos-ticket-summary { padding: 8px 0; }
                        .pos-ticket-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
                        .pos-ticket-total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
                        .pos-ticket-footer { text-align: center; padding-top: 10px; border-top: 1px dashed #000; margin-top: 10px; }
                        .pos-ticket-footer p { font-size: 11px; }
                    </style>
                </head>
                <body onload="window.print(); setTimeout(function(){window.close();}, 300);">
                    ${ticketHTML}
                </body>
                </html>
            `);
            printWindow.document.close();
        }

        // Cerrar modal después de 3 segundos
        setTimeout(() => {
            const m = document.getElementById('ticketModal');
            if (m) m.remove();
            document.getElementById('posProductSearch')?.focus();
        }, 2500);
    }, 500);

    showNotification(`Venta ${sale.folio} completada`, 'success');
}

// ===== Vista Previa de Ticket Actual =====
function previewCurrentTicket() {
    if (posCart.length === 0) {
        showNotification('El carrito está vacío', 'warning');
        return;
    }

    closeModal('posOptionsModal');

    // Calcular totales actuales
    const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const previewData = {
        folio: 'PREV-000',
        date: new Date().toISOString(),
        items: posCart,
        subtotal: subtotal,
        discount: 0,
        iva: iva,
        total: total,
        paymentMethod: 'cash' // Por defecto para vista previa
    };

    const ticketHTML = generateTicketHTML(previewData);

    // Reutilizar el modal de ticket pero con título diferente
    const oldModal = document.getElementById('ticketModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'ticketModal';
    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <h3>Vista Previa</h3>
                <button class="modal-close" onclick="closeModal('ticketModal')">&times;</button>
            </div>
            <div class="modal-body" style="background: white; color: #000; padding: 0;">
                ${ticketHTML}
            </div>
            <div class="modal-footer">
                <button class="btn btn-primary" onclick="closeModal('ticketModal')">Volver al POS</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Pequeño delay
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

// ===== Mostrar Ticket Final =====
function showPOSTicket(sale) {
    const ticketHTML = generateTicketHTML(sale);

    // Eliminar modal anterior si existe
    const oldModal = document.getElementById('ticketModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'ticketModal';
    modal.innerHTML = `
        <div class="modal-content modal-sm">
            <div class="modal-header">
                <h3>✅ Venta Completada</h3>
                <button class="modal-close" onclick="closeModal('ticketModal')">&times;</button>
            </div>
            <div class="modal-body" style="background: white; color: #000; padding: 0;">
                ${ticketHTML}
            </div>
            <div class="modal-footer" style="flex-direction: column; gap: 8px;">
                <div style="display: flex; gap: 10px; width: 100%;">
                    <button class="btn btn-ghost" onclick="closeModal('ticketModal')" style="flex: 1;">Cerrar</button>
                    <button class="btn btn-primary" onclick="printPOSTicket()" style="flex: 1;">
                        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Imprimir
                    </button>
                </div>
                <p id="ticketCountdown" style="color: var(--gray-400); font-size: 0.8rem; margin: 0;">⏳ Se cerrará en 3 segundos...</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
        modal.classList.add('active');
    }, 10);

    // Cierre automático después de 3 segundos con cuenta regresiva
    let countdown = 3;
    const countdownEl = modal.querySelector('#ticketCountdown');

    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdownEl && countdown > 0) {
            countdownEl.textContent = `⏳ Se cerrará en ${countdown} segundo${countdown > 1 ? 's' : ''}...`;
        }
    }, 1000);

    setTimeout(() => {
        clearInterval(countdownInterval);
        const ticketModal = document.getElementById('ticketModal');
        if (ticketModal) {
            ticketModal.remove();
            // Regresar foco al campo de búsqueda
            document.getElementById('posProductSearch')?.focus();
        }
    }, 3000);
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
// ===== Cargar Ventas del Día =====
function loadTodaySales() {
    try {
        const sales = StorageManager.get('sales', []);
        const shift = StorageManager.get('posCurrentShift', null);
        const today = new Date().toISOString().split('T')[0];

        // Si hay un turno abierto, mostrar solo lo de ese turno
        // Si no hay turno abierto, mostrar 0 (para el efecto de reinicio)
        if (shift && !shift.closed) {
            let shiftStartTime = shift.startTime || today + 'T00:00:00';
            posTodaySales = sales.filter(s => s.date && s.date >= shiftStartTime);
        } else {
            posTodaySales = [];
        }

        const totalSales = posTodaySales.reduce((sum, s) => sum + (s.total || 0), 0);

        const countEl = document.getElementById('posTodaySalesCount');
        const totalEl = document.getElementById('posTodaySalesTotal');

        if (countEl) {
            countEl.textContent = `${posTodaySales.length} venta${posTodaySales.length !== 1 ? 's' : ''}`;
        }
        if (totalEl) {
            totalEl.textContent = `$${totalSales.toFixed(2)}`;
        }

        // Actualizar Monitor Continuo si está activo
        if (typeof updateContinuousMonitor === 'function') {
            updateContinuousMonitor();
        }

    } catch (error) {
        console.warn('loadTodaySales error:', error);
    }
}






// ===== Historial de Ventas =====
function openPOSHistory() {
    // Remover modal previo si existe
    const existingModal = document.getElementById('posHistoryModal');
    if (existingModal) existingModal.remove();

    const sales = StorageManager.get('sales', []).slice(-50).reverse();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'posHistoryModal';

    // Cerrar al hacer clic en el fondo
    modal.onclick = (e) => {
        if (e.target === modal) closePOSHistory();
    };

    const getPaymentMethodName = (method) => {
        const methods = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia',
            'mixed': 'Mixto',
            'credit': 'Crédito'
        };
        return methods[method] || method;
    };

    modal.innerHTML = `
        <div class="modal-content modal-lg">
            <div class="modal-header">
                <h3>Historial de Ventas</h3>
                <button class="modal-close" onclick="closePOSHistory()">&times;</button>
            </div>
            <div class="modal-body">
                <p style="color: var(--gray-500); font-size: 0.85rem; margin-bottom: 15px;">
                    💡 Haz clic en una venta para ver el ticket completo
                </p>
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
                            ${sales.length ? sales.map((s, index) => `
                                <tr onclick="showSaleTicket(${index})" style="cursor: pointer;" title="Click para ver ticket">
                                    <td><strong>${s.folio}</strong></td>
                                    <td>${new Date(s.date).toLocaleString()}</td>
                                    <td>${s.items.length} producto${s.items.length > 1 ? 's' : ''}</td>
                                    <td>$${s.total.toFixed(2)}</td>
                                    <td>${getPaymentMethodName(s.paymentMethod)}</td>
                                </tr>
                            `).join('') : '<tr><td colspan="5" class="empty-state">No hay ventas registradas</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ===== Cerrar Historial de Ventas =====
function closePOSHistory() {
    const modal = document.getElementById('posHistoryModal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => modal.remove(), 200);
    }
}

// ===== Mostrar Ticket de Venta desde Historial =====
async function showSaleTicket(saleIndex) {
    const sales = StorageManager.get('sales', []).slice(-50).reverse();
    let sale = sales[saleIndex];

    if (!sale) {
        showNotification('Venta no encontrada', 'error');
        return;
    }

    // Verificar si tiene items, si no, intentar cargar del backend
    if ((!sale.items || sale.items.length === 0) && typeof eel !== 'undefined') {
        try {
            const result = await eel.get_sale_by_folio(sale.folio)();
            if (result.success && result.data) {
                // Fusionar datos del backend con los locales
                sale = { ...sale, ...result.data };
                // Asegurar formato de items
                if (result.data.items) {
                    sale.items = result.data.items.map(item => ({
                        name: item.product_name,
                        quantity: item.quantity,
                        price: item.unit_price,
                        subtotal: item.subtotal
                    }));
                }
            }
        } catch (e) {
            console.error('Error recuperando detalles de venta:', e);
        }
    }

    let modal = document.getElementById('saleTicketModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'saleTicketModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Z-index alto para aparecer encima de otros modales
    modal.style.zIndex = '10000';

    const getPaymentMethodName = (method) => {
        const methods = {
            'cash': 'Efectivo',
            'card': 'Tarjeta',
            'transfer': 'Transferencia',
            'mixed': 'Mixto',
            'credit': 'Crédito'
        };
        return methods[method] || method;
    };

    const isCredit = sale.paymentMethod === 'credit' || sale.payment_method === 'credit';
    const customerName = sale.customerName || sale.customer_name || null;
    const saleDate = sale.date ? new Date(sale.date) : new Date(sale.created_at);

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 350px; background: white; color: black; padding: 0;">
            <div style="text-align: center; padding: 20px;">
                <h3 style="margin: 0; color: black;">${isCredit ? '📝 VENTA A CRÉDITO' : '🧾 TICKET DE VENTA'}</h3>
                <p style="margin: 5px 0; font-size: 1.1rem;"><strong>${sale.folio}</strong></p>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">${saleDate.toLocaleString('es-MX')}</p>
                
                ${customerName ? `
                    <div style="margin-top: 10px; padding: 8px; background: #f0f9ff; border-radius: 6px;">
                        <p style="margin: 0; font-size: 0.85rem; color: #0369a1;">
                            <strong>👤 Cliente:</strong> ${customerName}
                        </p>
                    </div>
                ` : ''}
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <!-- Productos -->
                <div style="text-align: left;">
                    ${sale.items && sale.items.length > 0 ? sale.items.map(item => `
                        <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 0.9rem;">
                            <div style="flex: 1;">
                                <div style="font-weight: 500;">${item.name}</div>
                                <div style="color: #666; font-size: 0.8rem;">${item.quantity} x $${(item.price || item.unit_price || 0).toFixed(2)}</div>
                            </div>
                            <div style="font-weight: 600;">$${((item.quantity * (item.price || item.unit_price || 0))).toFixed(2)}</div>
                        </div>
                    `).join('') : '<p style="text-align: center; color: #999; font-style: italic;">Detalles de productos no disponibles</p>'}
                </div>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <!-- Totales -->
                <div style="text-align: left;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #666;">
                        <span>Subtotal:</span>
                        <span>$${(sale.subtotal || (sale.total || 0) / 1.16).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 5px 0; color: #666;">
                        <span>IVA (16%):</span>
                        <span>$${(sale.tax || sale.iva || (sale.total || 0) * 0.16 / 1.16).toFixed(2)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin: 10px 0; font-size: 1.3rem; font-weight: bold;">
                        <span>TOTAL:</span>
                        <span style="color: ${isCredit ? '#ef4444' : '#22c55e'};">$${(sale.total || 0).toFixed(2)}</span>
                    </div>
                </div>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <!-- Método de pago -->
                <div style="text-align: left; font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <strong>Método de Pago:</strong>
                        <span style="padding: 2px 8px; background: ${isCredit ? '#fef2f2' : '#f0fdf4'}; border-radius: 4px; color: ${isCredit ? '#dc2626' : '#16a34a'};">
                            ${getPaymentMethodName(sale.paymentMethod)}
                        </span>
                    </div>
                    ${sale.paymentMethod === 'cash' && sale.cashReceived ? `
                        <p style="margin: 5px 0;"><strong>Recibido:</strong> $${sale.cashReceived.toFixed(2)}</p>
                        <p style="margin: 5px 0;"><strong>Cambio:</strong> $${(sale.change || 0).toFixed(2)}</p>
                    ` : ''}
                    ${isCredit && customerName ? `
                        <p style="margin: 10px 0; padding: 8px; background: #fef2f2; border-radius: 6px; color: #dc2626; font-size: 0.85rem;">
                            ⚠️ Saldo cargado a cuenta de <strong>${customerName}</strong>
                        </p>
                    ` : ''}
                </div>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                <p style="margin: 0; font-size: 0.8rem; color: #999;">¡Gracias por su compra!</p>
            </div>
            <div style="display: flex; gap: 10px; padding: 10px 20px 20px;">
                <button onclick="closeModal('saleTicketModal')" class="btn btn-ghost" style="flex: 1; color: black; border-color: #ccc;">
                    Cerrar
                </button>
                <button onclick="printSaleTicket()" class="btn btn-primary" style="flex: 1;">
                    🖨️ Imprimir
                </button>
            </div>
        </div>
    `;

    openModal('saleTicketModal');
}

// ===== Imprimir Ticket de Venta =====
function printSaleTicket() {
    const modal = document.getElementById('saleTicketModal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    const printWindow = window.open('', '_blank', 'width=350,height=600');
    printWindow.document.write(`
        <html>
        <head><title>Ticket de Venta</title>
        <style>body{font-family:Arial,sans-serif;padding:10px;margin:0;}</style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
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
window.showSaleTicket = showSaleTicket;
window.printSaleTicket = printSaleTicket;
window.closePOSHistory = closePOSHistory;
window.startPOSShift = startPOSShift;
window.cancelPOSShift = cancelPOSShift;
window.exitPOS = exitPOS;
window.openPOSOptionsModal = openPOSOptionsModal;
window.reprintLastTicket = reprintLastTicket;
window.startNewSale = startNewSale;
window.cancelLastSale = cancelLastSale;
window.closeShift = closeShift;
window.previewCurrentTicket = previewCurrentTicket;
// Nuevas funciones de modales
window.showProductNotFoundModal = showProductNotFoundModal;
window.openNewProductFromPOS = openNewProductFromPOS;
window.showNoStockConfirmModal = showNoStockConfirmModal;
window.confirmAddWithoutStock = confirmAddWithoutStock;
// Funciones de pago mejoradas
window.calculateMixedPayment = calculateMixedPayment;
window.applyDiscount = applyDiscount;
window.selectPaymentByIndex = selectPaymentByIndex;
window.handlePaymentModalKeyboard = handlePaymentModalKeyboard;
window.printTicketDirect = printTicketDirect;
window.saveCart = saveCart;
// Nuevas funciones de supervisor
window.openSalesReport = openSalesReport;
window.searchTicketByFolio = searchTicketByFolio;
window.openCashDrawer = openCashDrawer;

// ===== Nuevas Funciones de Supervisor =====

// Ver reporte de ventas del día
function openSalesReport() {
    closeModal('posOptionsModal');

    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date && s.date.startsWith(today));

    const oldModal = document.getElementById('salesReportModal');
    if (oldModal) oldModal.remove();

    const totalSold = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    const cashTotal = todaySales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + (s.total || 0), 0);
    const cardTotal = todaySales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + (s.total || 0), 0);

    const salesRows = todaySales.length > 0 ? todaySales.slice(-15).reverse().map(s => `
        <tr style="border-bottom: 1px solid var(--dark-border);">
            <td style="padding: 8px;">${s.folio}</td>
            <td style="padding: 8px;">${new Date(s.date).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</td>
            <td style="padding: 8px;">${s.items?.length || 0} items</td>
            <td style="padding: 8px; text-align: right; font-weight: bold; color: var(--success-400);">$${(s.total || 0).toFixed(2)}</td>
            <td style="padding: 8px;">
                <button class="btn btn-sm" onclick="reprintSaleTicket('${s.id}')" style="padding: 4px 8px;">🖨️</button>
            </td>
        </tr>
    `).join('') : '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--gray-500);">No hay ventas hoy</td></tr>';

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'salesReportModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 650px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-500), var(--primary-600)); color: white;">
                <h3>📊 Ventas del Día</h3>
                <button class="modal-close" onclick="closeModal('salesReportModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; padding: 15px; background: var(--dark-surface);">
                    <div style="text-align: center; background: var(--dark-bg); padding: 12px; border-radius: 8px;">
                        <p style="color: var(--gray-500); font-size: 0.8rem;">Total Vendido</p>
                        <p style="font-size: 1.3rem; font-weight: bold; color: var(--success-400);">$${totalSold.toFixed(2)}</p>
                    </div>
                    <div style="text-align: center; background: var(--dark-bg); padding: 12px; border-radius: 8px;">
                        <p style="color: var(--gray-500); font-size: 0.8rem;">💵 Efectivo</p>
                        <p style="font-size: 1.3rem; font-weight: bold; color: var(--gray-200);">$${cashTotal.toFixed(2)}</p>
                    </div>
                    <div style="text-align: center; background: var(--dark-bg); padding: 12px; border-radius: 8px;">
                        <p style="color: var(--gray-500); font-size: 0.8rem;">💳 Tarjeta</p>
                        <p style="font-size: 1.3rem; font-weight: bold; color: var(--primary-400);">$${cardTotal.toFixed(2)}</p>
                    </div>
                </div>
                <div style="padding: 15px; max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%; font-size: 0.9rem;">
                        <thead>
                            <tr style="color: var(--gray-400); font-size: 0.8rem;">
                                <th style="padding: 8px; text-align: left;">Folio</th>
                                <th style="padding: 8px; text-align: left;">Hora</th>
                                <th style="padding: 8px; text-align: left;">Items</th>
                                <th style="padding: 8px; text-align: right;">Total</th>
                                <th style="padding: 8px;"></th>
                            </tr>
                        </thead>
                        <tbody>${salesRows}</tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('salesReportModal')">Cerrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Reimprimir ticket por ID
function reprintSaleTicket(saleId) {
    const sales = StorageManager.get('sales', []);
    const sale = sales.find(s => s.id === saleId);
    if (sale) {
        printTicketDirect(sale);
    } else {
        showNotification('Venta no encontrada', 'error');
    }
}
window.reprintSaleTicket = reprintSaleTicket;

// Buscar ticket por folio
function searchTicketByFolio() {
    closeModal('posOptionsModal');

    const folio = prompt('Ingrese el folio del ticket a buscar:');
    if (!folio) return;

    const sales = StorageManager.get('sales', []);
    const sale = sales.find(s => s.folio && s.folio.toLowerCase().includes(folio.toLowerCase()));

    if (sale) {
        printTicketDirect(sale);
    } else {
        showNotification(`No se encontró ticket con folio "${folio}"`, 'warning');
    }
}

// Abrir cajón de dinero (simula comando)
function openCashDrawer() {
    // En un sistema real, aquí se enviaría un comando a la impresora/cajón
    // Por ahora solo mostramos notificación
    showNotification('Cajón abierto', 'success');

    // Si hay impresora de tickets conectada, algunos modelos abren el cajón con este código:
    // Código ESC/POS para abrir cajón: ESC p 0 25 250
    console.log('Comando para abrir cajón enviado');
}

// ===== CORTE DE CAJA =====
function openCashCutModal() {
    closeModal('posOptionsModal');

    const shift = StorageManager.get('posCurrentShift', null);
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];

    // Obtener ventas del turno actual (desde que inició el turno)
    let shiftStartTime = shift?.startTime || today + 'T00:00:00';
    const shiftSales = sales.filter(s => s.date && s.date >= shiftStartTime);

    // Guardar para impresión
    posCurrentViewedShiftSales = shiftSales;
    posCurrentViewedShiftInfo = shift;

    renderShiftCut(shift, shiftSales, false);
}

function renderShiftCut(shift, shiftSales, isHistorical = false) {
    // Calcular totales por método de pago
    const cashSales = shiftSales.filter(s => s.paymentMethod === 'cash');
    const cardSales = shiftSales.filter(s => s.paymentMethod === 'card');
    const transferSales = shiftSales.filter(s => s.paymentMethod === 'transfer');
    const mixedSales = shiftSales.filter(s => s.paymentMethod === 'mixed');
    const creditSales = shiftSales.filter(s => s.paymentMethod === 'credit' || s.payment_method === 'credit');

    // Cálculos precisos:
    let totalCash = cashSales.reduce((sum, s) => sum + (s.total || 0), 0);
    mixedSales.forEach(s => {
        const cashPart = s.cashReceived || s.cash_received || 0;
        const change = s.change || s.change_given || 0;
        totalCash += (cashPart - change);
    });

    let totalCard = cardSales.reduce((sum, s) => sum + (s.total || 0), 0);
    mixedSales.forEach(s => {
        totalCard += (s.cardReceived || s.card_received || 0);
    });

    const totalTransfer = transferSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCredit = creditSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const grandTotal = totalCash + totalCard + totalTransfer + totalCredit;

    const initialFund = shift?.fund || shift?.initial_fund || 0;
    const expectedCash = initialFund + totalCash;
    const cashierName = shift?.cashier || shift?.user || 'Sistema';

    let shiftStart = 'N/A';
    if (shift?.startTime) shiftStart = new Date(shift.startTime).toLocaleString();
    else if (shift?.opened_at) shiftStart = new Date(shift.opened_at).toLocaleString();

    let shiftEnd = isHistorical ? (shift?.endTime || shift?.closed_at || 'N/A') : 'En curso...';
    if (shiftEnd !== 'En curso...' && shiftEnd !== 'N/A') shiftEnd = new Date(shiftEnd).toLocaleString();

    const oldModal = document.getElementById('cashCutModal');
    if (oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'cashCutModal';
    modal.style.zIndex = "1100"; // Asegurar que esté por encima del historial

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 550px;">
            <div class="modal-header" style="background: ${isHistorical ? 'linear-gradient(135deg, var(--gray-600), var(--gray-700))' : 'linear-gradient(135deg, var(--success-500), var(--primary-500))'}; color: white;">
                <h3>${isHistorical ? '📜 Detalle de Corte Histórico' : '💵 Corte de Caja Activo'}</h3>
                <button class="modal-close" onclick="closeModal('cashCutModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <div style="padding: 15px; background: var(--dark-surface); border-bottom: 1px solid var(--dark-border);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--gray-400);">👤 Usuario:</span>
                        <span style="color: white; font-weight: bold;">${cashierName}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--gray-400);">🕐 Apertura:</span>
                        <span style="color: white;">${shiftStart}</span>
                    </div>
                    ${isHistorical ? `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span style="color: var(--gray-400);">🏁 Cierre:</span>
                        <span style="color: white;">${shiftEnd}</span>
                    </div>
                    ` : ''}
                </div>
                
                <div style="padding: 15px;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
                        <div style="background: var(--dark-bg); padding: 12px; border-radius: 8px; border-left: 3px solid var(--success-500);">
                            <p style="color: var(--gray-500); font-size: 0.8rem;">💵 Efectivo</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--success-400);">$${totalCash.toFixed(2)}</p>
                        </div>
                        <div style="background: var(--dark-bg); padding: 12px; border-radius: 8px; border-left: 3px solid var(--primary-500);">
                            <p style="color: var(--gray-500); font-size: 0.8rem;">💳 Tarjeta</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--primary-400);">$${totalCard.toFixed(2)}</p>
                        </div>
                        <div style="background: var(--dark-bg); padding: 12px; border-radius: 8px; border-left: 3px solid var(--info-500);">
                            <p style="color: var(--gray-500); font-size: 0.8rem;">📱 Transferencia</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--info-400);">$${totalTransfer.toFixed(2)}</p>
                        </div>
                        <div style="background: var(--dark-bg); padding: 12px; border-radius: 8px; border-left: 3px solid var(--danger-500);">
                            <p style="color: var(--gray-500); font-size: 0.8rem;">📝 Crédito</p>
                            <p style="font-size: 1.2rem; font-weight: bold; color: var(--danger-400);">$${totalCredit.toFixed(2)}</p>
                        </div>
                    </div>
                    
                    <div style="background: var(--dark-bg); padding: 15px; border-radius: 8px; border: 1px solid var(--dark-border);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span style="color: var(--gray-400);">Ventas totales:</span>
                            <span style="color: white;">${shiftSales.length}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: var(--gray-400);">Gran Total:</span>
                            <span style="color: var(--success-400); font-weight: bold;">$${grandTotal.toFixed(2)}</span>
                        </div>
                        <div style="border-top: 1px dashed var(--dark-border); padding-top: 10px; margin-top: 5px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: var(--gray-400);">Fondo Inicial:</span>
                                <span style="color: white;">$${initialFund.toFixed(2)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding-top: 5px;">
                                <span style="color: white; font-weight: bold;">EFECTIVO EN CAJA:</span>
                                <span style="color: var(--success-400); font-weight: bold; font-size: 1.2rem;">$${expectedCash.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; gap: 10px; padding: 15px;">
                <button class="btn btn-ghost" onclick="closeModal('cashCutModal')">Cerrar</button>
                <button class="btn btn-primary" onclick="printCashCutReport()">🖨️ Imprimir</button>
                ${!isHistorical ? `
                <button class="btn btn-success" onclick="closeShiftWithCut()" style="flex: 1; font-weight: bold;">✅ Finalizar Corte</button>
                ` : ''}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Imprimir reporte de corte
function printCashCutReport(shift = null, sales = null) {
    // Si no se pasan datos, usar los globales guardados al abrir el modal
    if (!shift) shift = posCurrentViewedShiftInfo;
    if (!sales) sales = posCurrentViewedShiftSales;

    if (!shift || !sales) {
        showNotification('No hay datos para imprimir', 'error');
        return;
    }

    const shiftSales = sales;

    const cashSales = shiftSales.filter(s => s.paymentMethod === 'cash');
    const cardSales = shiftSales.filter(s => s.paymentMethod === 'card');
    const transferSales = shiftSales.filter(s => s.paymentMethod === 'transfer');
    const creditSales = shiftSales.filter(s => s.paymentMethod === 'credit');
    const mixedSales = shiftSales.filter(s => s.paymentMethod === 'mixed');

    let totalCash = cashSales.reduce((sum, s) => sum + (s.total || 0), 0);
    mixedSales.forEach(s => {
        totalCash += ((s.cashReceived || s.cash_received || 0) - (s.change || s.change_given || 0));
    });

    let totalCard = cardSales.reduce((sum, s) => sum + (s.total || 0), 0);
    mixedSales.forEach(s => {
        totalCard += (s.cardReceived || s.card_received || 0);
    });

    const totalTransfer = transferSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalCredit = creditSales.reduce((sum, s) => sum + (s.total || 0), 0);
    const grandTotal = totalCash + totalCard + totalTransfer + totalCredit;

    const initialFund = shift?.fund || shift?.initial_fund || 0;
    const expectedCash = initialFund + totalCash;

    const settings = StorageManager.get('appSettings', {});
    const companyName = settings.companyName || 'Refaccionaria Smip';

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(`
        <html>
        <head>
            <title>Corte de Caja</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; font-size: 12px; }
                h2 { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; }
                .row { display: flex; justify-content: space-between; margin: 5px 0; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .total { font-weight: bold; font-size: 14px; }
                .footer { text-align: center; margin-top: 20px; font-size: 10px; }
            </style>
        </head>
        <body onload="window.print(); setTimeout(function(){window.close();}, 500);">
            <h2>${companyName}<br>CORTE DE CAJA</h2>
            <div class="row"><span>Fecha:</span><span>${new Date().toLocaleDateString('es-MX')}</span></div>
            <div class="row"><span>Hora:</span><span>${new Date().toLocaleTimeString('es-MX')}</span></div>
            <div class="row"><span>Cajero:</span><span>${shift?.cashier || 'N/A'}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Total Ventas:</span><span>${shiftSales.length}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Efectivo:</span><span>$${totalCash.toFixed(2)}</span></div>
            <div class="row"><span>Tarjeta:</span><span>$${totalCard.toFixed(2)}</span></div>
            <div class="row"><span>Transfer:</span><span>$${totalTransfer.toFixed(2)}</span></div>
            <div class="row"><span>Crédito:</span><span>$${totalCredit.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="row total"><span>TOTAL VENDIDO:</span><span>$${grandTotal.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="row"><span>Fondo Inicial:</span><span>$${initialFund.toFixed(2)}</span></div>
            <div class="row"><span>+ Efectivo:</span><span>$${totalCash.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="row total"><span>EFECTIVO EN CAJA:</span><span>$${expectedCash.toFixed(2)}</span></div>
            <div class="footer">
                <p>----------------------------</p>
                <p>Firma del Cajero</p>
                <p>&nbsp;</p>
                <p>----------------------------</p>
                <p>Firma del Supervisor</p>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();

    showNotification('Imprimiendo corte de caja...', 'info');
}

// Cerrar turno con corte
async function closeShiftWithCut() {
    if (!confirm('¿Está seguro de cerrar el turno?\n\nEsto generará el corte final y no podrá realizar más ventas.')) {
        return;
    }

    try {
        // Llamar al backend para cerrar el turno en la base de datos
        if (typeof eel !== 'undefined') {
            const result = await eel.end_shift()();
            if (!result.success) {
                showNotification(result.error || 'Error al cerrar turno', 'error');
                return;
            }
            console.log('POS: Turno cerrado en backend', result.summary);
        }

        // Guardar datos del corte para historial local
        const shift = StorageManager.get('posCurrentShift', {});
        const sales = StorageManager.get('sales', []);

        let shiftStartTime = shift?.startTime || new Date().toISOString().split('T')[0] + 'T00:00:00';
        const shiftSales = sales.filter(s => s.date && s.date >= shiftStartTime);

        // Recalcular totales para el registro histórico del corte
        const cashSales = shiftSales.filter(s => s.paymentMethod === 'cash');
        const cardSales = shiftSales.filter(s => s.paymentMethod === 'card');
        const transferSales = shiftSales.filter(s => s.paymentMethod === 'transfer');
        const mixedSales = shiftSales.filter(s => s.paymentMethod === 'mixed');
        const creditSales = shiftSales.filter(s => s.paymentMethod === 'credit' || s.payment_method === 'credit');

        let totalCash = cashSales.reduce((sum, s) => sum + (s.total || 0), 0);
        mixedSales.forEach(s => {
            totalCash += ((s.cashReceived || s.cash_received || 0) - (s.change || s.change_given || 0));
        });

        let totalCard = cardSales.reduce((sum, s) => sum + (s.total || 0), 0);
        mixedSales.forEach(s => {
            totalCard += (s.cardReceived || s.card_received || 0);
        });

        const totalTransfer = transferSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const totalCredit = creditSales.reduce((sum, s) => sum + (s.total || 0), 0);
        const grandTotal = totalCash + totalCard + totalTransfer + totalCredit;

        shift.endTime = new Date().toISOString();
        shift.closed = true;
        shift.cashCut = {
            salesCount: shiftSales.length,
            cashTotal: totalCash,
            cardTotal: totalCard,
            transferTotal: totalTransfer,
            creditTotal: totalCredit,
            grandTotal: grandTotal,
            expectedCash: (shift.fund || 0) + totalCash
        };

        // Guardar en historial de turnos cerrados
        const closedShifts = StorageManager.get('posClosedShifts', []);
        closedShifts.push(shift);
        StorageManager.set('posClosedShifts', closedShifts);

        // Limpiar turno actual
        StorageManager.remove('posCurrentShift');
        posShiftActive = false;
        posShiftFund = 0;

        closeModal('cashCutModal');
        exitPOS();
        // Recargar las ventas del día para que se muestren en 0
        loadTodaySales();
        showNotification('Turno cerrado correctamente. ¡Hasta pronto!', 'success');
    } catch (e) {
        console.error('Error cerrando turno:', e);
        showNotification('Error al cerrar turno', 'error');
    }
}

// Exportar funciones de corte
window.openCashCutModal = openCashCutModal;
window.printCashCutReport = printCashCutReport;
window.closeShiftWithCut = closeShiftWithCut;

// ===== HISTORIAL DE CORTES DE CAJA =====
async function openShiftHistoryModal() {
    closeModal('posOptionsModal');

    let modal = document.getElementById('shiftHistoryModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'shiftHistoryModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-600), var(--primary-700)); color: white;">
                <h3>📜 Historial de Cortes de Caja</h3>
                <button class="modal-close" onclick="closeModal('shiftHistoryModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <div id="shiftHistoryContent" style="min-height: 300px; max-height: 500px; overflow-y: auto;">
                    <div style="display: flex; justify-content: center; align-items: center; padding: 50px;">
                        <div class="win-loading-ring"></div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('shiftHistoryModal')">Cerrar</button>
            </div>
        </div>
    `;

    openModal('shiftHistoryModal');

    try {
        const result = await eel.get_shift_history()();
        if (result.success) {
            renderShiftHistory(result.data);
        } else {
            document.getElementById('shiftHistoryContent').innerHTML = `
                <div style="padding: 40px; text-align: center; color: var(--danger-400);">
                    ${result.error || 'Error al cargar el historial'}
                </div>
            `;
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

function renderShiftHistory(shifts) {
    const container = document.getElementById('shiftHistoryContent');
    if (!shifts || shifts.length === 0) {
        container.innerHTML = `
            <div style="padding: 60px; text-align: center; color: var(--gray-500);">
                <div style="font-size: 3rem; margin-bottom: 10px;">📅</div>
                <p>No hay cortes de caja registrados en el historial.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="inventory-table" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="position: sticky; top: 0; background: var(--dark-surface); z-index: 10;">
                    <th style="padding: 12px; text-align: left;">Fecha Cierre</th>
                    <th style="padding: 12px; text-align: center;">Ventas</th>
                    <th style="padding: 12px; text-align: right;">Total</th>
                    <th style="padding: 12px; text-align: right;">Efectivo</th>
                    <th style="padding: 12px; text-align: center;">Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    shifts.forEach(shift => {
        const date = new Date(shift.closed_at).toLocaleString('es-MX', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        // El total es la suma de los campos de venta
        const total = (shift.total_cash || 0) + (shift.total_card || 0) + (shift.total_transfer || 0) + (shift.total_credit || 0);

        html += `
            <tr style="border-bottom: 1px solid var(--dark-border);">
                <td style="padding: 12px;">
                    <div style="font-weight: bold; color: white;">${date}</div>
                    <div style="font-size: 0.75rem; color: var(--gray-500);">ID: #${shift.id}</div>
                </td>
                <td style="padding: 12px; text-align: center; color: var(--primary-400); font-weight: bold;">
                    ${shift.sales_count || 0}
                </td>
                <td style="padding: 12px; text-align: right; color: var(--success-400); font-weight: bold;">
                    $${total.toFixed(2)}
                </td>
                <td style="padding: 12px; text-align: right; color: var(--gray-300);">
                    $${(shift.total_cash || 0).toFixed(2)}
                </td>
                <td style="padding: 12px; text-align: center;">
                    <button class="btn-icon" title="Ver Reporte" onclick="viewHistoricalShiftDetail(${shift.id})" 
                            style="background: rgba(59, 130, 246, 0.1); color: var(--primary-400); border-radius: 4px; padding: 6px;">
                        👁️
                    </button>
                </td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function viewHistoricalShiftDetail(shiftId) {
    try {
        const result = await eel.get_shift_summary(shiftId)();
        if (result.success) {
            // Guardar para impresión
            posCurrentViewedShiftSales = result.sales;
            posCurrentViewedShiftInfo = result.shift;

            renderShiftCut(result.shift, result.sales, true);
        } else {
            showNotification(result.error || 'Error al obtener detalle', 'error');
        }
    } catch (e) {
        console.error(e);
    }
}

window.openShiftHistoryModal = openShiftHistoryModal;
window.viewHistoricalShiftDetail = viewHistoricalShiftDetail;

// =============================================================================
// INTEGRACIÓN DE CLIENTES EN POS
// =============================================================================

// ===== Abrir Modal para Seleccionar Cliente =====
function openPOSCustomerModal() {
    let modal = document.getElementById('posCustomerSelectModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'posCustomerSelectModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3>Seleccionar Cliente</h3>
                <button class="modal-close" onclick="closeModal('posCustomerSelectModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="position: relative; margin-bottom: 15px;">
                    <input type="text" id="posCustomerSearchInput" 
                        placeholder="Buscar por nombre o teléfono..." 
                        oninput="searchPOSCustomers(this.value)" 
                        autofocus
                        style="width: 100%; padding: 12px 12px 12px 12px; background: var(--dark-bg); border: 1px solid var(--dark-border); border-radius: 8px; color: var(--gray-100); font-size: 1rem; outline: none;">
                </div>
                <div id="posCustomerSearchResults" style="max-height: 300px; overflow-y: auto;">
                    <div style="text-align: center; color: var(--gray-500); padding: 20px;">
                        Escribe para buscar clientes...
                    </div>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid var(--dark-border); text-align: center;">
                    <button class="btn btn-ghost" onclick="closeModal('posCustomerSelectModal'); openCustomerModal();">
                        + Crear Nuevo Cliente
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('posCustomerSelectModal');
    document.getElementById('posCustomerSearchInput')?.focus();
}

// ===== Buscar Clientes para POS =====
async function searchPOSCustomers(query) {
    const container = document.getElementById('posCustomerSearchResults');
    if (!container) return;

    if (query.length < 2) {
        container.innerHTML = `<div style="text-align: center; color: var(--gray-500); padding: 20px;">Escribe al menos 2 caracteres...</div>`;
        return;
    }

    try {
        const result = await eel.search_customers(query)();
        if (result.success && result.data.length > 0) {
            container.innerHTML = result.data.map(c => `
                <div class="customer-search-item" onclick="selectPOSCustomer(${c.id}, '${c.name.replace(/'/g, "\\'")}', ${c.allow_credit}, ${c.credit_limit}, ${c.current_balance})" 
                     style="padding: 12px; border-bottom: 1px solid var(--dark-border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="color: white;">${c.name}</strong>
                        <span style="color: var(--gray-500); font-size: 0.85rem; margin-left: 10px;">${c.phone || ''}</span>
                    </div>
                    ${c.allow_credit ? `
                        <span style="font-size: 0.8rem; color: ${c.current_balance > 0 ? 'var(--warning-400)' : 'var(--success-400)'};">
                            ${c.current_balance > 0 ? `Adeuda: $${c.current_balance.toFixed(2)}` : `Crédito: $${c.credit_limit.toFixed(2)}`}
                        </span>
                    ` : ''}
                </div>
            `).join('');
        } else {
            container.innerHTML = `<div style="text-align: center; color: var(--gray-500); padding: 20px;">No se encontraron clientes</div>`;
        }
    } catch (e) {
        console.error('Error buscando clientes:', e);
        container.innerHTML = `<div style="text-align: center; color: var(--danger-400); padding: 20px;">Error al buscar</div>`;
    }
}

// ===== Seleccionar Cliente para la Venta =====
function selectPOSCustomer(id, name, allowCredit, creditLimit, currentBalance) {
    posSelectedCustomer = {
        id: id,
        name: name,
        allow_credit: allowCredit,
        credit_limit: creditLimit,
        current_balance: currentBalance,
        credit_available: creditLimit - currentBalance
    };

    closeModal('posCustomerSelectModal');
    updatePOSCustomerDisplay();
    showNotification(`Cliente: ${name}`, 'success');
}

// ===== Limpiar Cliente Seleccionado =====
function clearPOSCustomer() {
    posSelectedCustomer = null;
    updatePOSCustomerDisplay();
}

// ===== Actualizar Display del Cliente en POS =====
function updatePOSCustomerDisplay() {
    const container = document.getElementById('posCustomerDisplay');
    const customerBtn = document.getElementById('posCustomerBtn');
    if (!container) return;

    if (posSelectedCustomer) {
        const hasDebt = posSelectedCustomer.current_balance > 0;
        container.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <span style="font-weight: 600; color: white;">👤 ${posSelectedCustomer.name}</span>
                ${posSelectedCustomer.allow_credit ?
                `<span style="font-size: 0.75rem; color: var(--success-400);">Crédito: $${posSelectedCustomer.credit_available.toFixed(2)}</span>`
                : ''}
                ${hasDebt ?
                `<span style="font-size: 0.75rem; color: var(--warning-400);">Adeuda: $${posSelectedCustomer.current_balance.toFixed(2)}</span>
                     <button onclick="openPOSAbonoModal()" class="btn btn-success" style="padding: 3px 10px; font-size: 0.75rem;">💵 Cobrar</button>`
                : ''}
                <button onclick="clearPOSCustomer()" style="background: none; border: none; color: var(--gray-400); cursor: pointer; margin-left: auto;" title="Quitar">✕</button>
            </div>
        `;
        container.style.display = 'block';
        // Cambiar estilo del botón para indicar cliente seleccionado
        if (customerBtn) customerBtn.style.color = 'var(--success-400)';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
        // Restaurar estilo del botón
        if (customerBtn) customerBtn.style.color = '';
    }
}

// ===== Modal para Cobrar Abono desde POS =====
function openPOSAbonoModal() {
    if (!posSelectedCustomer) {
        showNotification('Selecciona un cliente primero', 'error');
        return;
    }

    // Validar que tenga saldo pendiente
    if (posSelectedCustomer.current_balance <= 0) {
        showNotification('Este cliente no tiene saldo pendiente', 'info');
        return;
    }

    let modal = document.getElementById('posAbonoModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'posAbonoModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h3>Cobrar Abono</h3>
                <button class="modal-close" onclick="closeModal('posAbonoModal')">&times;</button>
            </div>
            <div class="modal-body">
                <div style="text-align: center; margin-bottom: 20px; padding: 15px; background: var(--dark-surface); border-radius: 8px;">
                    <p style="color: var(--gray-400); margin: 0;">Cliente</p>
                    <p style="font-size: 1.2rem; font-weight: 600; color: white; margin: 5px 0;">${posSelectedCustomer.name}</p>
                    <p style="color: var(--warning-400); font-size: 1.1rem; margin: 0;">Adeuda: <strong>$${posSelectedCustomer.current_balance.toFixed(2)}</strong></p>
                </div>
                
                <div class="form-group">
                    <label>Monto del Abono *</label>
                    <input type="number" id="posAbonoAmount" class="form-input" placeholder="0.00" step="0.01" min="0.01" 
                           max="${posSelectedCustomer.current_balance}" style="font-size: 1.2rem; text-align: center;" autofocus>
                </div>
                
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <button class="btn btn-ghost" onclick="document.getElementById('posAbonoAmount').value = ${(posSelectedCustomer.current_balance / 2).toFixed(2)}" style="flex: 1;">
                        50%
                    </button>
                    <button class="btn btn-ghost" onclick="document.getElementById('posAbonoAmount').value = ${posSelectedCustomer.current_balance.toFixed(2)}" style="flex: 1;">
                        100%
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-ghost" onclick="closeModal('posAbonoModal')">Cancelar</button>
                <button class="btn btn-success" onclick="confirmPOSAbono()">
                    ✅ Registrar Abono
                </button>
            </div>
        </div>
    `;

    openModal('posAbonoModal');
    setTimeout(() => document.getElementById('posAbonoAmount')?.focus(), 100);
}

// ===== Confirmar Abono desde POS =====
async function confirmPOSAbono() {
    const amountInput = document.getElementById('posAbonoAmount');
    const amount = parseFloat(amountInput?.value) || 0;

    if (amount <= 0) {
        showNotification('Ingresa un monto válido', 'error');
        amountInput?.focus();
        return;
    }

    if (amount > posSelectedCustomer.current_balance) {
        showNotification('El abono no puede ser mayor a la deuda', 'error');
        return;
    }

    try {
        const result = await eel.add_customer_payment(
            posSelectedCustomer.id,
            amount,
            `Abono POS ${new Date().toLocaleTimeString()}`,
            '',
            'POS'
        )();

        if (result.success) {
            closeModal('posAbonoModal');

            // Mostrar recibo de abono
            showAbonoReceipt({
                customer: posSelectedCustomer.name,
                amount: amount,
                previousBalance: posSelectedCustomer.current_balance,
                newBalance: result.new_balance,
                date: new Date().toLocaleString()
            });

            // Actualizar datos del cliente
            posSelectedCustomer.current_balance = result.new_balance;
            posSelectedCustomer.credit_available = posSelectedCustomer.credit_limit - result.new_balance;
            updatePOSCustomerDisplay();

            showNotification(`Abono de $${amount.toFixed(2)} registrado`, 'success');
        } else {
            showNotification(result.error || 'Error al registrar abono', 'error');
        }
    } catch (e) {
        console.error('Error registrando abono:', e);
        showNotification('Error al registrar abono', 'error');
    }
}

// ===== Mostrar Recibo de Abono =====
function showAbonoReceipt(data) {
    let modal = document.getElementById('abonoReceiptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'abonoReceiptModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 320px; background: white; color: black;">
            <div style="text-align: center; padding: 20px;">
                <h3 style="margin: 0 0 5px; color: black;">RECIBO DE ABONO</h3>
                <p style="margin: 0; font-size: 0.85rem; color: #666;">${data.date}</p>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <p style="margin: 5px 0; color: black;"><strong>Cliente:</strong> ${data.customer}</p>
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <p style="margin: 5px 0; color: #666;">Saldo Anterior:</p>
                <p style="margin: 0; font-size: 1.1rem; color: black;">$${data.previousBalance.toFixed(2)}</p>
                
                <p style="margin: 15px 0 5px; color: #666;">Abono Recibido:</p>
                <p style="margin: 0; font-size: 1.5rem; font-weight: bold; color: #22c55e;">$${data.amount.toFixed(2)}</p>
                
                <p style="margin: 15px 0 5px; color: #666;">Nuevo Saldo:</p>
                <p style="margin: 0; font-size: 1.2rem; font-weight: bold; color: ${data.newBalance > 0 ? '#ef4444' : '#22c55e'};">
                    $${data.newBalance.toFixed(2)}
                </p>
                
                ${data.newBalance <= 0 ? '<p style="margin-top: 15px; color: #22c55e; font-weight: bold;">✅ CUENTA SALDADA</p>' : ''}
                
                <hr style="margin: 15px 0; border: none; border-top: 1px dashed #ccc;">
                
                <p style="margin: 0; font-size: 0.8rem; color: #999;">¡Gracias por su pago!</p>
            </div>
            <div style="display: flex; gap: 10px; padding: 10px 20px 20px;">
                <button onclick="closeModal('abonoReceiptModal')" class="btn btn-ghost" style="flex: 1; color: black; border-color: #ccc;">
                    Cerrar
                </button>
                <button onclick="printAbonoReceipt()" class="btn btn-primary" style="flex: 1;">
                    🖨️ Imprimir
                </button>
            </div>
        </div>
    `;

    openModal('abonoReceiptModal');

    // Auto-cerrar después de 10 segundos
    setTimeout(() => {
        if (document.getElementById('abonoReceiptModal')?.classList.contains('active')) {
            closeModal('abonoReceiptModal');
        }
    }, 10000);
}

// ===== Imprimir Recibo de Abono =====
function printAbonoReceipt() {
    const modal = document.getElementById('abonoReceiptModal');
    if (!modal) return;

    const content = modal.querySelector('.modal-content');
    const printWindow = window.open('', '_blank', 'width=350,height=500');
    printWindow.document.write(`
        <html>
        <head><title>Recibo de Abono</title>
        <style>body{font-family:Arial,sans-serif;padding:10px;}</style>
        </head>
        <body>${content.innerHTML}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
}

// ===== Verificar si puede pagar a crédito =====
function canPayWithCredit(total) {
    if (!posSelectedCustomer) return { allowed: false, reason: 'Selecciona un cliente primero' };
    if (!posSelectedCustomer.allow_credit) return { allowed: false, reason: 'Este cliente no tiene crédito habilitado' };
    if (total > posSelectedCustomer.credit_available) {
        return { allowed: false, reason: `Crédito insuficiente. Disponible: $${posSelectedCustomer.credit_available.toFixed(2)}` };
    }
    return { allowed: true };
}

// Exponer funciones globalmente
window.openPOSCustomerModal = openPOSCustomerModal;
window.searchPOSCustomers = searchPOSCustomers;
window.selectPOSCustomer = selectPOSCustomer;
window.clearPOSCustomer = clearPOSCustomer;
window.updatePOSCustomerDisplay = updatePOSCustomerDisplay;
window.canPayWithCredit = canPayWithCredit;
window.openPOSAbonoModal = openPOSAbonoModal;
window.confirmPOSAbono = confirmPOSAbono;
window.showAbonoReceipt = showAbonoReceipt;
window.printAbonoReceipt = printAbonoReceipt;

// Funciones de productos por peso
window.showWeightInputModal = showWeightInputModal;
window.updateWeightPreview = updateWeightPreview;
window.setWeight = setWeight;
window.confirmWeight = confirmWeight;
window.getUnitLabel = getUnitLabel;

// ===== MODO VENTA CONTINUA (Ticket Infinito) =====
function toggleContinuousMode() {
    if (!isUserSupervisor()) {
        showNotification('Acceso Denegado: Se requieren permisos de administrador', 'error');
        return;
    }

    posIsContinuousMode = !posIsContinuousMode;
    const widget = document.getElementById('posContinuousWidget');
    const btnText = document.getElementById('posContinuousBtnText');

    if (posIsContinuousMode) {
        if (widget) widget.style.display = 'block';
        if (btnText) btnText.textContent = "Desactivar Venta Continua";
        showNotification('⚡ MODO CONTINUO: Activado', 'warning');
        loadTodaySales(); // Carga datos iniciales y actualiza el monitor
    } else {
        if (widget) widget.style.display = 'none';
        if (btnText) btnText.textContent = "Activar Venta Continua";
        showNotification('Modo normal restaurado', 'info');
    }
}

function updateContinuousMonitor() {
    if (!posIsContinuousMode) return;

    // Obtener ventas del día
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];
    const todaySales = sales.filter(s => s.date && s.date.startsWith(today));

    // Ordenar cronológicamente (antiguas arriba, nuevas abajo)
    todaySales.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calcular Total
    const total = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
    const totalEl = document.getElementById('posMonitorTotal');
    if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

    // Construir Ticket "Flow"
    const ticketBody = document.getElementById('posMonitorTicketBody');
    if (ticketBody) {
        if (todaySales.length === 0) {
            ticketBody.innerHTML = '<div class="ticket-placeholder">Esperando ventas...</div>';
            return;
        }

        let html = '<div class="ticket-row" style="text-align:center;font-weight:bold;margin-bottom:15px;border:none;">--- INICIO DE TURNO ---</div>';

        todaySales.forEach((sale) => {
            const time = new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

            if (sale.items && Array.isArray(sale.items)) {
                sale.items.forEach(item => {
                    const price = item.price || item.unit_price || 0;
                    const qty = item.quantity || 1;
                    const lineTotal = price * qty;

                    // Renderizado estilo "Bitácora" plana
                    html += `<div class="ticket-row" style="border:none; margin-bottom: 2px; padding-bottom: 2px; font-size: 0.85rem; display: flex; justify-content: space-between;">
                        <span style="color: #666; font-size: 0.75rem; min-width: 60px;">${time}</span>
                        <span style="flex:1; margin-left:8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${qty} x ${item.name || item.product_name}
                        </span>
                        <span style="font-weight:bold; color: #ddd;">$${lineTotal.toFixed(2)}</span>
                    </div>`;
                });
            }
        });

        // Corte Parcial
        html += `<div class="ticket-row" style="text-align:right; font-weight:bold; margin-top:20px; border-top: 1px dashed #666; padding-top: 10px; font-size: 1.1rem; color: var(--success-400);">
            TOTAL ACUMULADO: $${total.toFixed(2)}
        </div>`;

        ticketBody.innerHTML = html;
        // Auto-scroll al final
        setTimeout(() => {
            ticketBody.scrollTop = ticketBody.scrollHeight;
        }, 100);
    }
}

window.toggleContinuousMode = toggleContinuousMode;

// Módulo de Corte de Caja centralizado arriba.

// =============================================================================
// ESCÁNER MÓVIL - PDA Virtual
// Permite usar el celular como escáner de códigos de barras
// =============================================================================

let mobileScannerActive = false;
let mobileScannerPolling = null;
let lastScannedCount = 0;

// ===== Abrir Modal del Escáner Móvil =====
async function openMobileScannerModal() {
    closeModal('posOptionsModal');

    let modal = document.getElementById('mobileScannerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mobileScannerModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Mostrar loading inicial
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px; text-align: center;">
            <div class="modal-header" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white;">
                <h3>📱 Escáner Móvil</h3>
                <button class="modal-close" onclick="closeMobileScannerModal()" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 40px;">
                <div class="win-loading-ring" style="width: 40px; height: 40px; margin: 0 auto 20px;"></div>
                <p style="color: var(--gray-400);">Iniciando servidor...</p>
            </div>
        </div>
    `;

    openModal('mobileScannerModal');

    try {
        // Iniciar servidor de escáner móvil
        const result = await eel.start_mobile_scanner()();

        if (result.success) {
            // Mostrar QR
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 450px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #0ea5e9, #0284c7); color: white;">
                        <h3>📱 Escáner Móvil</h3>
                        <button class="modal-close" onclick="closeMobileScannerModal()" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 25px;">
                        <div style="background: white; padding: 20px; border-radius: 16px; display: inline-block; margin-bottom: 20px;">
                            <img src="${result.data.qr_code}" alt="QR Code" style="width: 200px; height: 200px;">
                        </div>
                        
                        <p style="font-size: 1.1rem; font-weight: 600; color: white; margin-bottom: 5px;">
                            Escanea este código QR
                        </p>
                        <p style="color: var(--gray-400); font-size: 0.9rem; margin-bottom: 15px;">
                            con la cámara de tu celular
                        </p>
                        
                        <div style="background: var(--dark-surface); padding: 12px 15px; border-radius: 10px; margin-bottom: 20px;">
                            <p style="color: var(--gray-500); font-size: 0.75rem; margin-bottom: 3px;">URL directa:</p>
                            <code style="color: var(--info-400); font-size: 0.85rem; word-break: break-all;">
                                ${result.data.url}
                            </code>
                        </div>
                        
                        <div id="mobileScannerStatus" style="padding: 15px; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 10px;">
                            <p style="color: #4ade80; font-size: 0.9rem; margin: 0;">
                                🟢 Esperando escaneos...
                            </p>
                            <p style="color: var(--gray-400); font-size: 0.8rem; margin-top: 5px;">
                                Productos escaneados: <strong id="scannedProductsCount">0</strong>
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer" style="display: flex; gap: 10px;">
                        <button class="btn btn-ghost" onclick="closeMobileScannerModal()" style="flex: 1;">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;

            // Iniciar polling para detectar productos escaneados
            mobileScannerActive = true;
            lastScannedCount = 0;
            startMobileScannerPolling();

        } else {
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px; text-align: center;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #dc2626, #b91c1c); color: white;">
                        <h3>❌ Error</h3>
                        <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 30px;">
                        <p style="color: var(--danger-400); font-size: 1rem;">
                            ${result.error || 'Error al iniciar el escáner móvil'}
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="closeModal('mobileScannerModal')">Cerrar</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error iniciando escáner móvil:', error);
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px; text-align: center;">
                <div class="modal-header" style="background: var(--danger-600); color: white;">
                    <h3>❌ Error</h3>
                    <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <p style="color: var(--danger-400);">Error de conexión al iniciar el escáner</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="closeModal('mobileScannerModal')">Cerrar</button>
                </div>
            </div>
        `;
    }
}

// ===== Polling para detectar productos escaneados =====
function startMobileScannerPolling() {
    if (mobileScannerPolling) {
        clearInterval(mobileScannerPolling);
    }

    mobileScannerPolling = setInterval(async () => {
        if (!mobileScannerActive) {
            clearInterval(mobileScannerPolling);
            return;
        }

        try {
            const result = await eel.get_scanned_products()();

            if (result.success && result.data.length > lastScannedCount) {
                // Hay nuevos productos escaneados
                const newProducts = result.data.slice(lastScannedCount);

                for (const scan of newProducts) {
                    // Agregar al carrito
                    if (scan.product && scan.product.id) {
                        await addToPOSCart(scan.product.id, true);
                        showNotification(`📱 ${scan.product.name} agregado desde móvil`, 'success');
                    }
                }

                lastScannedCount = result.data.length;

                // Actualizar contador en el modal
                const countEl = document.getElementById('scannedProductsCount');
                if (countEl) {
                    countEl.textContent = lastScannedCount;
                }
            }
        } catch (error) {
            console.error('Error polling escáner móvil:', error);
        }
    }, 1000); // Cada segundo
}

// ===== Cerrar Modal del Escáner Móvil =====
async function closeMobileScannerModal() {
    mobileScannerActive = false;

    if (mobileScannerPolling) {
        clearInterval(mobileScannerPolling);
        mobileScannerPolling = null;
    }

    // Limpiar productos escaneados
    try {
        await eel.clear_scanned_products()();
    } catch (e) { }

    // Detener servidor (opcional, se puede dejar corriendo)
    // try {
    //     await eel.stop_mobile_scanner()();
    // } catch (e) {}

    closeModal('mobileScannerModal');
}

// Exportar funciones del escáner móvil
window.openMobileScannerModal = openMobileScannerModal;
window.closeMobileScannerModal = closeMobileScannerModal;
