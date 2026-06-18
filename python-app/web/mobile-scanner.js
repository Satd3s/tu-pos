// =============================================================================
// ESCÁNER MÓVIL - Alta de Productos desde Celular
// Permite usar el celular para agregar productos nuevos al inventario
// =============================================================================

// ===== Abrir Modal del Escáner Móvil =====
async function openMobileScannerModal() {
    // Cerrar otros modales si están abiertos
    if (typeof closeModal === 'function') {
        try { closeModal('posOptionsModal'); } catch (e) { }
    }

    let modal = document.getElementById('mobileScannerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'mobileScannerModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    // Mostrar loading
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 420px; text-align: center;">
            <div class="modal-header" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white;">
                <h3>📦 Alta de Productos</h3>
                <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
            </div>
            <div class="modal-body" style="padding: 40px;">
                <div style="width: 40px; height: 40px; margin: 0 auto 20px; border: 3px solid rgba(255,255,255,0.2); border-top-color: var(--primary-400); border-radius: 50%; animation: mobileScannerSpin 1s linear infinite;"></div>
                <p style="color: var(--gray-400);">Iniciando servidor...</p>
            </div>
        </div>
    `;

    // Agregar animación si no existe
    if (!document.getElementById('mobileScannerStyles')) {
        const style = document.createElement('style');
        style.id = 'mobileScannerStyles';
        style.textContent = '@keyframes mobileScannerSpin { to { transform: rotate(360deg); } }';
        document.head.appendChild(style);
    }

    openModal('mobileScannerModal');

    try {
        const result = await eel.start_mobile_scanner()();

        if (result.success) {
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 420px;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #22c55e, #16a34a); color: white;">
                        <h3>📦 Alta de Productos desde Celular</h3>
                        <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="text-align: center; padding: 25px;">
                        <p style="color: var(--gray-300); margin-bottom: 15px; font-size: 0.95rem;">
                            Escanea el QR con tu celular para agregar productos
                        </p>
                        
                        <div style="background: white; padding: 15px; border-radius: 12px; display: inline-block; margin-bottom: 15px;">
                            <img src="${result.data.qr_code}" alt="QR Code" style="width: 180px; height: 180px;">
                        </div>
                        
                        <div style="background: var(--dark-surface); padding: 10px 15px; border-radius: 8px; margin-bottom: 15px;">
                            <p style="color: var(--gray-500); font-size: 0.7rem; margin-bottom: 3px;">O abre esta URL en tu navegador:</p>
                            <code style="color: var(--success-400); font-size: 0.8rem; word-break: break-all;">
                                ${result.data.url}
                            </code>
                        </div>
                        
                        <div style="padding: 12px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 8px;">
                            <p style="color: #4ade80; font-size: 0.85rem; margin: 0;">
                                ✅ Servidor listo
                            </p>
                            <p style="color: var(--gray-400); font-size: 0.75rem; margin-top: 5px;">
                                Desde tu celular podrás escanear códigos y agregar productos
                            </p>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="closeModal('mobileScannerModal')" style="flex: 1;">
                            Cerrar
                        </button>
                    </div>
                </div>
            `;

            showNotification('📱 Servidor listo. Escanea el QR con tu celular.', 'success');

        } else {
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 380px; text-align: center;">
                    <div class="modal-header" style="background: #dc2626; color: white;">
                        <h3>❌ Error</h3>
                        <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 30px;">
                        <p style="color: var(--danger-400);">${result.error || 'No se pudo iniciar el servidor'}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-ghost" onclick="closeModal('mobileScannerModal')">Cerrar</button>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error:', error);
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 380px; text-align: center;">
                <div class="modal-header" style="background: #dc2626; color: white;">
                    <h3>❌ Error</h3>
                    <button class="modal-close" onclick="closeModal('mobileScannerModal')" style="color: white;">&times;</button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <p style="color: var(--danger-400);">Error al conectar con el servidor</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-ghost" onclick="closeModal('mobileScannerModal')">Cerrar</button>
                </div>
            </div>
        `;
    }
}

// Exportar globalmente
window.openMobileScannerModal = openMobileScannerModal;

console.log('[MobileScanner] Módulo de alta de productos desde móvil cargado');
