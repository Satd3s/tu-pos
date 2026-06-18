
import os
import re

# Ruta al archivo
file_path = r'c:\Users\_SATD3S_\Documents\InventorySystem\python-app\web\pos-module.js'

# Código nuevo para la función
new_function = r"""function openPOSOptionsModal() {
    // 1. Obtener usuario y validar rol (Admin/Supervisor)
    const currentUser = StorageManager.get('currentUser', null) || window.currentUser;
    const isSupervisor = currentUser && (
        (currentUser.role && currentUser.role.toLowerCase() === 'admin') || 
        (currentUser.role && currentUser.role.toLowerCase() === 'supervisor') ||
        (currentUser.type && currentUser.type === 'admin')
    );

    console.log("Rol POS detectado:", currentUser?.role, "Es Admin/Sup:", isSupervisor);

    // 2. Calcular Estadísticas
    const sales = StorageManager.get('sales', []);
    const today = new Date().toISOString().split('T')[0];
    const shift = StorageManager.get('posCurrentShift', null);
    
    let filterDate = today;
    if (shift && shift.startTime) {
        // Usar formato ISO completo si está disponible
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

    // 3. Botones HTML (Admin)
    let adminButtonsHTML = '';
    if (isSupervisor) {
        adminButtonsHTML = `
            <div class="pos-options-group" style="margin-top: 15px; border-top: 1px dashed var(--dark-border); padding-top: 15px;">
                <h4 style="color: var(--warning-400); margin-bottom: 10px;">Administración</h4>
                <div class="pos-options-grid">
                    <button class="pos-option-btn danger" onclick="openCashCutModal()">
                        <div class="icon">✂️</div>
                        <span>Corte de Caja</span>
                    </button>
                    <button class="pos-option-btn warning" onclick="cancelLastSale()">
                        <div class="icon">🚫</div>
                        <span>Anular Última</span>
                    </button>
                    <button class="pos-option-btn info" onclick="openSalesReport()">
                        <div class="icon">📊</div>
                        <span>Reporte Día</span>
                    </button>
                    <button class="pos-option-btn secondary" onclick="showPausedSales()">
                         <div class="icon">⏸️</div>
                         <span>Ventas Pausadas</span>
                    </button>
                </div>
            </div>
        `;
    }

    // 4. Construir HTML Final
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3>Opciones de Caja (F4)</h3>
                <button class="modal-close" onclick="closeModal('${modalId}')">&times;</button>
            </div>
            <div class="modal-body">
                
                <!-- SECCIÓN DE ESTADÍSTICAS -->
                <div class="pos-stats-container" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
                    <!-- Ventas Totales -->
                    <div style="background: var(--dark-surface); padding: 10px; border-radius: 8px; border: 1px solid var(--dark-border);">
                        <div style="font-size: 0.8rem; color: var(--gray-400);">Ventas</div>
                        <div style="font-size: 1.4rem; font-weight: bold; color: var(--primary-400);">${totalCount}</div>
                        <div style="font-size: 0.9rem;">$${totalAmount.toFixed(2)}</div>
                    </div>
                    
                    <!-- Efectivo -->
                    <div style="background: rgba(16, 185, 129, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">
                        <div style="font-size: 0.8rem; color: var(--success-400);">Efectivo</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--success-300);">$${(fund + cashTotal).toFixed(2)}</div>
                        <div style="font-size: 0.75rem; opacity: 0.7;">(Inc. Fondo)</div>
                    </div>

                    <!-- Tarjeta -->
                    <div style="background: rgba(59, 130, 246, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.2);">
                        <div style="font-size: 0.8rem; color: var(--primary-400);">Tarjeta</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--primary-300);">$${cardTotal.toFixed(2)}</div>
                    </div>

                    <!-- Transferencia -->
                    <div style="background: rgba(236, 72, 153, 0.1); padding: 10px; border-radius: 8px; border: 1px solid rgba(236, 72, 153, 0.2);">
                        <div style="font-size: 0.8rem; color: var(--pink-400);">Transferencia</div>
                        <div style="font-size: 1.2rem; font-weight: bold; color: var(--pink-300);">$${transferTotal.toFixed(2)}</div>
                    </div>
                </div>

                <!-- SECCIÓN DE OPERACIONES -->
                <div class="pos-options-group">
                    <h4>Operaciones Generales</h4>
                    <div class="pos-options-grid">
                        <button class="pos-option-btn" onclick="reprintLastTicket()">
                            <div class="icon">🖨️</div>
                            <span>Reimprimir</span>
                        </button>
                        <button class="pos-option-btn" onclick="openPOSCustomerModal()">
                            <div class="icon">👥</div>
                            <span>Cliente</span>
                        </button>
                        <button class="pos-option-btn" onclick="startNewSale()">
                             <div class="icon">🆕</div>
                             <span>Nueva Venta</span>
                        </button>
                        <button class="pos-option-btn warning" style="background: rgba(245, 158, 11, 0.1);" onclick="pauseCurrentSale()">
                             <div class="icon">⏳</div>
                             <span>Pausar</span>
                        </button>
                    </div>
                </div>
                
                ${adminButtonsHTML}

                 <!-- Botón Cerrar Turno -->
                 <div class="pos-options-group" style="margin-top: 20px;">
                    <button class="btn btn-block btn-secondary" onclick="closeShift()">
                        🔒 Cerrar Turno
                    </button>
                </div>

            </div>
        </div>
    `;

    document.body.appendChild(modal);
    openModal(modalId);
}"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón para encontrar la función vieja (que puede estar roto)
# Buscamos desde la declaración de la función hasta la siguiente función 'reprintLastTicket'
# Esto es más seguro que balancear llaves si el código está muy roto
pattern = re.compile(r'function openPOSOptionsModal\(\)\s*\{.*?function reprintLastTicket', re.DOTALL)

# Reemplazamos
if pattern.search(content):
    print("Función encontrada, reemplazando...")
    # El reemplazo debe incluir el inicio de la siguiente función que usamos como delimitador
    replacement = new_function + "\n\nfunction reprintLastTicket"
    new_content = pattern.sub(replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Éxito: Archivo pos-module.js reparado.")
else:
    print("Error: No se encontró patrón de la función openPOSOptionsModal.")
    # Intento de rescate fallback: buscar hasta el final del archivo basura conocido
    # Buscamos la cabecera y reemplazamos hasta line 986 aprox
    pass
