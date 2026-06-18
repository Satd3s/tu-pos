
import os
import re

file_path = r'c:\Users\_SATD3S_\Documents\InventorySystem\python-app\web\pos-module.js'

# Versión Premium de la función con SVGs
new_function = r"""function openPOSOptionsModal() {
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
}"""

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Patrón para encontrar la función vieja
pattern = re.compile(r'function openPOSOptionsModal\(\)\s*\{.*?function reprintLastTicket', re.DOTALL)

if pattern.search(content):
    print("Función encontrada, actualizando diseño con SVGs e incluyendo Modo Continuo...")
    replacement = new_function + "\n\nfunction reprintLastTicket"
    new_content = pattern.sub(replacement, content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Diseño actualizado.")
else:
    print("Error: No se encontró la función.")
