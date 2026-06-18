// =============================================================================
// MÓDULO DE DISPOSITIVOS
// Impresoras, Escáneres y Básculas
// =============================================================================

// Estado global de dispositivos
const DevicesManager = {
    scaleConnected: false,
    scalePollingInterval: null,
    printerConfigured: false,

    // Inicializar módulo
    init() {
        console.log('[Devices] Inicializando módulo de dispositivos...');
        this.loadDevicesConfig();
    }
};

// =============================================================================
// PUERTOS SERIALES
// =============================================================================

async function detectSerialPorts() {
    try {
        showNotification('Detectando puertos seriales...', 'info');

        const result = await eel.get_serial_ports()();

        if (result.success && result.data.length > 0) {
            const scalePortSelect = document.getElementById('scalePort');
            if (scalePortSelect) {
                scalePortSelect.innerHTML = '<option value="">-- Seleccionar --</option>';

                result.data.forEach(port => {
                    const option = document.createElement('option');
                    option.value = port.port;
                    option.textContent = `${port.port} - ${port.description}`;
                    scalePortSelect.appendChild(option);
                });
            }

            showNotification(`Se encontraron ${result.data.length} puertos`, 'success');
        } else if (result.data.length === 0) {
            showNotification('No se encontraron puertos seriales', 'warning');
        } else {
            showNotification(result.error || 'Error detectando puertos', 'error');
        }
    } catch (error) {
        console.error('[Devices] Error:', error);
        showNotification('Error al detectar puertos', 'error');
    }
}

// =============================================================================
// BÁSCULA
// =============================================================================

async function connectScale() {
    const port = document.getElementById('scalePort')?.value;
    const baudRate = document.getElementById('scaleBaudRate')?.value || '9600';
    const dataBits = document.getElementById('scaleDataBits')?.value || '8';
    const parity = document.getElementById('scaleParity')?.value || 'N';
    const stopBits = document.getElementById('scaleStopBits')?.value || '1';
    const unit = document.getElementById('scaleUnit')?.value || 'kg';

    if (!port) {
        showNotification('Selecciona un puerto COM', 'warning');
        return;
    }

    try {
        showNotification('Conectando a la báscula...', 'info');

        const config = {
            port: port,
            baud_rate: parseInt(baudRate),
            data_bits: parseInt(dataBits),
            parity: parity,
            stop_bits: parseInt(stopBits),
            unit: unit
        };

        const result = await eel.connect_scale(config)();

        if (result.success) {
            DevicesManager.scaleConnected = true;
            updateScaleUI(true);
            startScalePolling();
            showNotification(result.message || 'Báscula conectada', 'success');
        } else {
            showNotification(result.error || 'Error al conectar', 'error');
        }
    } catch (error) {
        console.error('[Devices] Error conectando báscula:', error);
        showNotification('Error al conectar la báscula', 'error');
    }
}

async function disconnectScale() {
    try {
        stopScalePolling();

        const result = await eel.disconnect_scale()();

        DevicesManager.scaleConnected = false;
        updateScaleUI(false);

        showNotification('Báscula desconectada', 'info');
    } catch (error) {
        console.error('[Devices] Error desconectando:', error);
    }
}

function updateScaleUI(connected) {
    const statusEl = document.getElementById('scaleStatus');
    const iconEl = document.getElementById('scaleDeviceIcon');
    const connectionStatusEl = document.getElementById('scaleConnectionStatus');
    const weightDisplay = document.getElementById('scaleWeightDisplay');

    if (connected) {
        if (statusEl) {
            statusEl.textContent = 'Conectada';
            statusEl.className = 'device-status connected';
        }
        if (iconEl) {
            iconEl.className = 'device-icon connected';
        }
        if (connectionStatusEl) {
            connectionStatusEl.textContent = '🟢 Conectada';
        }
        if (weightDisplay) {
            weightDisplay.classList.add('reading');
        }
    } else {
        if (statusEl) {
            statusEl.textContent = 'Desconectada';
            statusEl.className = 'device-status disconnected';
        }
        if (iconEl) {
            iconEl.className = 'device-icon';
        }
        if (connectionStatusEl) {
            connectionStatusEl.textContent = '⚪ Desconectada';
        }
        if (weightDisplay) {
            weightDisplay.classList.remove('reading');
        }
    }
}

function startScalePolling() {
    // Detener polling anterior si existe
    stopScalePolling();

    // Iniciar nuevo polling cada 200ms
    DevicesManager.scalePollingInterval = setInterval(async () => {
        await readScaleWeight();
    }, 200);
}

function stopScalePolling() {
    if (DevicesManager.scalePollingInterval) {
        clearInterval(DevicesManager.scalePollingInterval);
        DevicesManager.scalePollingInterval = null;
    }
}

async function readScaleWeight() {
    try {
        const result = await eel.read_scale_weight()();

        if (result.success) {
            updateWeightDisplay(result.weight, result.unit, result.timestamp);

            // Guardar peso globalmente para uso en POS
            window.lastScaleWeight = result.weight;
            window.lastScaleUnit = result.unit;
        }
    } catch (error) {
        console.error('[Devices] Error leyendo peso:', error);
    }
}

function updateWeightDisplay(weight, unit, timestamp) {
    const weightDisplay = document.getElementById('scaleWeightDisplay');
    const lastReadEl = document.getElementById('scaleLastRead');
    const scaleUnitSelect = document.getElementById('scaleUnit');

    // Usar la unidad seleccionada si está disponible
    const displayUnit = scaleUnitSelect?.value || unit || 'kg';

    if (weightDisplay) {
        weightDisplay.innerHTML = `${weight.toFixed(3)}<span class="scale-unit">${displayUnit}</span>`;
    }

    if (lastReadEl && timestamp) {
        lastReadEl.textContent = `Última lectura: ${timestamp}`;
    }
}

async function saveScaleConfig() {
    const config = {
        port: document.getElementById('scalePort')?.value || '',
        baud_rate: parseInt(document.getElementById('scaleBaudRate')?.value || '9600'),
        data_bits: parseInt(document.getElementById('scaleDataBits')?.value || '8'),
        parity: document.getElementById('scaleParity')?.value || 'N',
        stop_bits: parseInt(document.getElementById('scaleStopBits')?.value || '1'),
        unit: document.getElementById('scaleUnit')?.value || 'kg'
    };

    try {
        const result = await eel.save_scale_config(config)();

        if (result.success) {
            showNotification('Configuración de báscula guardada', 'success');
        } else {
            showNotification(result.error || 'Error al guardar', 'error');
        }
    } catch (error) {
        console.error('[Devices] Error guardando config:', error);
        showNotification('Error al guardar configuración', 'error');
    }
}

function updateScaleConfig() {
    // Se llama cuando cambia cualquier opción de la báscula
    // Por ahora solo actualiza la unidad en el display
    const unit = document.getElementById('scaleUnit')?.value || 'kg';
    const weightDisplay = document.getElementById('scaleWeightDisplay');

    if (weightDisplay) {
        const currentWeight = window.lastScaleWeight || 0;
        weightDisplay.innerHTML = `${currentWeight.toFixed(3)}<span class="scale-unit">${unit}</span>`;
    }
}

// =============================================================================
// IMPRESORAS
// =============================================================================

async function detectPrinters() {
    try {
        showNotification('Detectando impresoras...', 'info');

        const result = await eel.get_printers()();

        if (result.success && result.data.length > 0) {
            const printerSelect = document.getElementById('printerSelect');
            if (printerSelect) {
                printerSelect.innerHTML = '<option value="">-- Seleccionar impresora --</option>';

                result.data.forEach(printer => {
                    const option = document.createElement('option');
                    option.value = printer.name;
                    option.textContent = printer.name + (printer.is_default ? ' (Predeterminada)' : '');
                    printerSelect.appendChild(option);
                });
            }

            showNotification(`Se encontraron ${result.data.length} impresoras`, 'success');
        } else if (result.data.length === 0) {
            showNotification('No se encontraron impresoras', 'warning');
        } else {
            showNotification(result.error || 'Error detectando impresoras', 'error');
        }
    } catch (error) {
        console.error('[Devices] Error:', error);
        showNotification('Error al detectar impresoras', 'error');
    }
}

async function testPrinter() {
    const printerName = document.getElementById('printerSelect')?.value;

    if (!printerName) {
        showNotification('Selecciona una impresora primero', 'warning');
        return;
    }

    try {
        showNotification('Enviando página de prueba...', 'info');

        const result = await eel.print_test_page(printerName)();

        if (result.success) {
            showNotification(result.message || 'Página de prueba enviada', 'success');
        } else {
            showNotification(result.error || 'Error al imprimir', 'error');
        }
    } catch (error) {
        console.error('[Devices] Error imprimiendo:', error);
        showNotification('Error al enviar página de prueba', 'error');
    }
}

async function savePrinterConfig() {
    const printerName = document.getElementById('printerSelect')?.value;

    const config = {
        name: printerName,
        type: 'thermal',
        width: 80
    };

    try {
        const result = await eel.save_printer_config(config)();

        if (result.success) {
            updatePrinterUI(!!printerName);
            if (printerName) {
                showNotification('Impresora configurada', 'success');
            }
        }
    } catch (error) {
        console.error('[Devices] Error guardando config:', error);
    }
}

function updatePrinterUI(configured) {
    const statusEl = document.getElementById('printerStatus');
    const iconEl = document.getElementById('printerDeviceIcon');
    const printerName = document.getElementById('printerSelect')?.value;

    if (configured && printerName) {
        if (statusEl) {
            statusEl.textContent = printerName;
            statusEl.className = 'device-status connected';
        }
        if (iconEl) {
            iconEl.className = 'device-icon connected';
        }
    } else {
        if (statusEl) {
            statusEl.textContent = 'No configurada';
            statusEl.className = 'device-status disconnected';
        }
        if (iconEl) {
            iconEl.className = 'device-icon';
        }
    }
}

// =============================================================================
// CARGAR CONFIGURACIÓN
// =============================================================================

async function loadDevicesConfig() {
    try {
        const result = await eel.get_devices_config()();

        if (result && result.printer) {
            // Cargar configuración de impresora
            const printerSelect = document.getElementById('printerSelect');
            if (printerSelect && result.printer.name) {
                // Detectar impresoras primero
                await detectPrinters();
                printerSelect.value = result.printer.name;
                updatePrinterUI(true);
            }
        }

        if (result && result.scale) {
            // Cargar configuración de báscula
            const scalePort = document.getElementById('scalePort');
            const scaleBaudRate = document.getElementById('scaleBaudRate');
            const scaleDataBits = document.getElementById('scaleDataBits');
            const scaleParity = document.getElementById('scaleParity');
            const scaleStopBits = document.getElementById('scaleStopBits');
            const scaleUnit = document.getElementById('scaleUnit');

            // Detectar puertos primero
            await detectSerialPorts();

            if (scalePort && result.scale.port) {
                scalePort.value = result.scale.port;
            }
            if (scaleBaudRate) {
                scaleBaudRate.value = result.scale.baud_rate || '9600';
            }
            if (scaleDataBits) {
                scaleDataBits.value = result.scale.data_bits || '8';
            }
            if (scaleParity) {
                scaleParity.value = result.scale.parity || 'N';
            }
            if (scaleStopBits) {
                scaleStopBits.value = result.scale.stop_bits || '1';
            }
            if (scaleUnit) {
                scaleUnit.value = result.scale.unit || 'kg';
            }
        }

    } catch (error) {
        console.error('[Devices] Error cargando configuración:', error);
    }
}

// =============================================================================
// INTEGRACIÓN CON POS
// =============================================================================

/**
 * Obtener peso actual de la báscula (para usar en POS)
 * @returns {Object} { weight: number, unit: string }
 */
function getCurrentScaleWeight() {
    return {
        weight: window.lastScaleWeight || 0,
        unit: window.lastScaleUnit || 'kg',
        available: DevicesManager.scaleConnected
    };
}

/**
 * Verificar si la báscula está conectada
 * @returns {boolean}
 */
function isScaleConnected() {
    return DevicesManager.scaleConnected;
}

// =============================================================================
// EXPORTAR FUNCIONES GLOBALES
// =============================================================================

window.DevicesManager = DevicesManager;
window.detectSerialPorts = detectSerialPorts;
window.connectScale = connectScale;
window.disconnectScale = disconnectScale;
window.readScaleWeight = readScaleWeight;
window.saveScaleConfig = saveScaleConfig;
window.updateScaleConfig = updateScaleConfig;
window.detectPrinters = detectPrinters;
window.testPrinter = testPrinter;
window.savePrinterConfig = savePrinterConfig;
window.loadDevicesConfig = loadDevicesConfig;
window.getCurrentScaleWeight = getCurrentScaleWeight;
window.isScaleConnected = isScaleConnected;

// Inicializar cuando se abra el panel de dispositivos
document.addEventListener('DOMContentLoaded', () => {
    // La inicialización se hace cuando se abre el panel de ajustes
});
