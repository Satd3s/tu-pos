# =============================================================================
# SISTEMA DE INVENTARIO - REFACCIONARIA
# Aplicación de escritorio con Python + Eel + SQLite
# =============================================================================

import eel
import os
import sys
import shutil
import json
import atexit
import signal
from datetime import datetime
from database import init_database, get_db_connection
from api import products, sales, movements, settings, reports, purchases, suppliers, users, customers
from core.config_manager import config, ConfigManager
from core import api_proxy
from core import mobile_scanner

# Variable global para evitar múltiples respaldos
_backup_done = False

def perform_backup_on_exit():
    """Realizar respaldo al cerrar la aplicación"""
    global _backup_done
    if _backup_done:
        return
    _backup_done = True
    
    print("\n" + "="*50)
    print("Cerrando aplicacion...")
    print("="*50)
    
    # Crear respaldo automático
    print("Creando respaldo automatico de la base de datos...")
    try:
        from database import backup_db, BACKUP_FOLDER
        result = backup_db()
        if result.get('success'):
            print(f"[OK] Respaldo creado exitosamente:")
            print(f"     Ubicacion: {result.get('path')}")
            
            # Contar respaldos existentes
            if os.path.exists(BACKUP_FOLDER):
                backups = [f for f in os.listdir(BACKUP_FOLDER) if f.endswith('.db')]
                print(f"     Total de respaldos guardados: {len(backups)}")
        else:
            print(f"[WARN] Error en respaldo: {result.get('error')}")
    except Exception as e:
        print(f"[ERROR] Error al crear respaldo automatico: {e}")
    
    print("="*50)
    print("Hasta pronto!")
    print("="*50 + "\n")

# Registrar función de respaldo para que se ejecute al salir
atexit.register(perform_backup_on_exit)

# Manejar señales de cierre (Ctrl+C, cierre de ventana, etc.)
def signal_handler(signum, frame):
    """Manejar señales de cierre del sistema"""
    perform_backup_on_exit()
    sys.exit(0)

# Registrar manejadores de señales (solo en sistemas que las soporten)
try:
    signal.signal(signal.SIGINT, signal_handler)   # Ctrl+C
    signal.signal(signal.SIGTERM, signal_handler)  # Terminación
    if hasattr(signal, 'SIGBREAK'):
        signal.signal(signal.SIGBREAK, signal_handler)  # Windows: Ctrl+Break
except Exception:
    pass  # Ignorar si no se pueden registrar las señales


# Configuración
APP_NAME = "Tu POS"
WEB_FOLDER = "web"
DEFAULT_SIZE = (380, 500)  # Tamaño pequeño para login
SETUP_SIZE = (900, 700)    # Tamaño para el Setup Wizard

# Modo de operación de red
NETWORK_MODE = config.get('network.mode', 'standalone')

def resource_path(relative_path):
    """Obtener ruta absoluta para recursos (compatible con PyInstaller)"""
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

# =============================================================================
# FUNCIONES EXPUESTAS A JAVASCRIPT
# =============================================================================

@eel.expose
def minimize_window():
    """Minimizar la ventana de la aplicación"""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        user32.ShowWindow(hwnd, 6) # 6 = SW_MINIMIZE
    except Exception as e:
        print(f"Error minimizando ventana: {e}")

@eel.expose
def maximize_window():
    """Maximizar o restaurar la ventana de la aplicación (Toggle)"""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        # IsZoomed checks if a window is maximized
        if user32.IsZoomed(hwnd):
            user32.ShowWindow(hwnd, 9) # 9 = SW_RESTORE
        else:
            user32.ShowWindow(hwnd, 3) # 3 = SW_MAXIMIZE
    except Exception as e:
        print(f"Error maximizando ventana: {e}")

@eel.expose
def remove_title_bar():
    """Quitar barra de título para estilo frameless"""
    try:
        import ctypes
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        
        GWL_STYLE = -16
        WS_CAPTION = 0x00C00000
        WS_THICKFRAME = 0x00040000
        
        style = user32.GetWindowLongW(hwnd, GWL_STYLE)
        style = style & ~WS_CAPTION & ~WS_THICKFRAME
        user32.SetWindowLongW(hwnd, GWL_STYLE, style)
        
        # Forzar repintado
        # SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED = 0x0027
        user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027)
    except Exception as e:
        print(f"Error quitando barra de titulo: {e}")

@eel.expose
def close_app():
    """Cerrar la aplicación"""
    sys.exit(0)

# ----- Configuración y Setup Wizard -----
@eel.expose
def is_first_run():
    """Verificar si es la primera ejecución"""
    return {'success': True, 'data': config.is_first_run()}

@eel.expose
def get_app_config():
    """Obtener toda la configuración de la aplicación"""
    return {'success': True, 'data': config.get_all()}

@eel.expose
def get_config_value(path, default=None):
    """Obtener un valor específico de configuración"""
    return {'success': True, 'data': config.get(path, default)}

@eel.expose
def set_config_value(path, value):
    """Establecer un valor de configuración"""
    return config.set(path, value)

@eel.expose
def save_setup_config(setup_data):
    """Guardar la configuración del Setup Wizard"""
    try:
        # Actualizar información de empresa
        if 'company' in setup_data:
            config.update_section('company', setup_data['company'])
        
        # Actualizar configuración regional
        if 'regional' in setup_data:
            config.update_section('regional', setup_data['regional'])
        
        # Actualizar impuestos
        if 'taxes' in setup_data:
            config.update_section('taxes', setup_data['taxes'])
        
        # Actualizar módulos habilitados
        if 'modules' in setup_data:
            for module_name, enabled in setup_data['modules'].items():
                config.toggle_module(module_name, enabled)
        
        # Actualizar configuración de red
        if 'network' in setup_data:
            config.update_section('network', setup_data['network'])
        
        # Marcar setup como completado
        config.complete_setup()
        
        return {'success': True, 'message': 'Configuración guardada correctamente'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@eel.expose
def get_enabled_modules():
    """Obtener lista de módulos habilitados"""
    return {'success': True, 'data': config.get_enabled_modules()}

@eel.expose
def is_module_enabled(module_name):
    """Verificar si un módulo está habilitado"""
    return {'success': True, 'data': config.is_module_enabled(module_name)}

@eel.expose
def toggle_module(module_name, enabled):
    """Habilitar/deshabilitar un módulo"""
    return config.toggle_module(module_name, enabled)

@eel.expose
def get_company_info():
    """Obtener información de la empresa"""
    return {'success': True, 'data': config.get_company_info()}

@eel.expose
def get_regional_settings():
    """Obtener configuración regional"""
    return {'success': True, 'data': config.get_regional_settings()}

@eel.expose
def create_backup():
    """Crear respaldo de la base de datos (llamable desde JavaScript)"""
    from database import backup_db
    return backup_db()

# ----- Red y Multicaja -----
@eel.expose
def get_network_mode():
    """Obtener modo de operación de red"""
    return {
        'success': True, 
        'data': {
            'mode': api_proxy.get_operation_mode(),
            'is_client': api_proxy.is_client_mode(),
            'is_server': api_proxy.is_server_mode(),
            'is_standalone': api_proxy.is_standalone_mode()
        }
    }

@eel.expose
def get_network_status():
    """Obtener estado de conexión de red"""
    return {'success': True, 'data': api_proxy.get_network_status()}

@eel.expose
def connect_to_server():
    """Intentar conectar al servidor (modo cliente)"""
    if api_proxy.is_client_mode():
        client = api_proxy.init_network_if_needed()
        if client:
            result = client.connect()
            return result
    return {'success': False, 'error': 'No está en modo cliente'}

@eel.expose
def sync_offline_data():
    """Sincronizar datos offline con el servidor"""
    client = api_proxy.get_network_client()
    if client:
        return client.sync_offline_data()
    return {'success': False, 'error': 'Cliente de red no inicializado'}

@eel.expose
def refresh_cache():
    """Actualizar caché local desde el servidor"""
    client = api_proxy.get_network_client()
    if client:
        return client.refresh_cache()
    return {'success': False, 'error': 'Cliente de red no inicializado'}

@eel.expose
def get_station_info():
    """Obtener información de la estación actual"""
    return {
        'success': True,
        'data': {
            'station_name': config.get('network.station_name', 'CAJA-1'),
            'station_id': config.get('network.station_id', 1),
            'mode': config.get('network.mode', 'standalone')
        }
    }

# ----- Escáner Móvil (PDA Virtual) -----
@eel.expose
def start_mobile_scanner():
    """Iniciar el servidor de escáner móvil y obtener URL + QR"""
    try:
        station_name = config.get('company.name', 'Tu POS')
        url = mobile_scanner.start_mobile_scanner(station_name)
        
        # Generar código QR como data URL
        try:
            import qrcode
            import io
            import base64
            
            qr = qrcode.QRCode(version=1, box_size=10, border=2)
            qr.add_data(url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            qr_base64 = base64.b64encode(buffer.getvalue()).decode()
            qr_data_url = f"data:image/png;base64,{qr_base64}"
        except ImportError:
            # Si no está instalado qrcode, usar un servicio externo
            qr_data_url = f"https://api.qrserver.com/v1/create-qr-code/?size=200x200&data={url}"
        
        return {
            'success': True,
            'data': {
                'url': url,
                'qr_code': qr_data_url
            },
            'message': f'Escáner móvil listo en {url}'
        }
    except Exception as e:
        return {'success': False, 'error': str(e)}

@eel.expose
def stop_mobile_scanner():
    """Detener el servidor de escáner móvil"""
    try:
        mobile_scanner.stop_mobile_scanner()
        return {'success': True, 'message': 'Escáner móvil detenido'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@eel.expose
def get_mobile_scanner_url():
    """Obtener URL del escáner móvil"""
    try:
        scanner = mobile_scanner.get_mobile_scanner()
        if scanner.is_running:
            return {'success': True, 'data': {'url': scanner.get_url()}}
        return {'success': False, 'error': 'Escáner no está corriendo'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@eel.expose
def get_scanned_products():
    """Obtener productos escaneados desde el móvil"""
    try:
        scanner = mobile_scanner.get_mobile_scanner()
        products = scanner.get_scanned_products()
        return {'success': True, 'data': products}
    except Exception as e:
        return {'success': False, 'error': str(e)}

@eel.expose
def clear_scanned_products():
    """Limpiar lista de productos escaneados"""
    try:
        scanner = mobile_scanner.get_mobile_scanner()
        scanner.clear_scanned_products()
        return {'success': True}
    except Exception as e:
        return {'success': False, 'error': str(e)}

    
# ----- Productos -----
@eel.expose
def get_products():
    """Obtener todos los productos"""
    return api_proxy.products_proxy.get_all()

@eel.expose
def get_product(product_id):
    """Obtener un producto por ID"""
    return api_proxy.products_proxy.get_by_id(product_id)

@eel.expose
def search_products(query):
    """Buscar productos"""
    return api_proxy.products_proxy.search(query)

@eel.expose
def save_product(product_data):
    """Guardar producto (crear o actualizar)"""
    return api_proxy.products_proxy.save(product_data)

@eel.expose
def delete_product(product_id):
    """Eliminar producto"""
    return api_proxy.products_proxy.delete(product_id)

@eel.expose
def get_low_stock_products(threshold=10):
    """Obtener productos con stock bajo"""
    return api_proxy.products_proxy.get_low_stock(threshold)

@eel.expose
def generate_internal_code():
    """Generar código interno para productos sin código de barras"""
    # Esta función solo tiene sentido en modo local/servidor
    if api_proxy.is_client_mode():
        return {'success': False, 'error': 'Operación no disponible en modo cliente'}
    return products.generate_internal_code()

# ----- Catálogo de Productos (Referencia para autocompletar) -----
from api import catalogo_abarrotes

@eel.expose
def buscar_catalogo_por_codigo(codigo):
    """Buscar en el catálogo de referencia por código de barras"""
    return catalogo_abarrotes.buscar_por_codigo(codigo)

@eel.expose
def buscar_catalogo_por_nombre(query):
    """Buscar en el catálogo de referencia por nombre"""
    return catalogo_abarrotes.buscar_por_nombre(query)

@eel.expose
def obtener_estadisticas_catalogo():
    """Obtener estadísticas del catálogo"""
    return catalogo_abarrotes.obtener_estadisticas()

# ----- Movimientos -----
@eel.expose
def get_movements(filters=None):
    """Obtener movimientos con filtros opcionales"""
    return movements.get_all(filters)

@eel.expose
def create_movement(movement_data):
    """Crear movimiento de inventario"""
    return movements.create(movement_data)

# ----- Compras/Entradas -----
@eel.expose
def get_purchases(filters=None):
    """Obtener compras con filtros opcionales"""
    return purchases.get_all(filters)

@eel.expose
def get_purchase(purchase_id):
    """Obtener una compra por ID con sus items"""
    return purchases.get_by_id(purchase_id)

@eel.expose
def create_purchase(purchase_data):
    """Crear una compra completa con múltiples productos"""
    return purchases.create(purchase_data)

@eel.expose
def cancel_purchase(purchase_id, reason=''):
    """Cancelar una compra y revertir stock"""
    return purchases.cancel(purchase_id, reason)

@eel.expose
def get_purchases_summary(start_date=None, end_date=None):
    """Obtener resumen de compras por período"""
    return purchases.get_summary(start_date, end_date)

# ----- Proveedores -----
@eel.expose
def get_suppliers():
    """Obtener todos los proveedores"""
    return suppliers.get_all()

@eel.expose
def get_supplier(supplier_id):
    """Obtener un proveedor por ID"""
    return suppliers.get_by_id(supplier_id)

@eel.expose
def save_supplier(supplier_data):
    """Guardar proveedor (crear o actualizar)"""
    return suppliers.save(supplier_data)

@eel.expose
def delete_supplier(supplier_id):
    """Eliminar proveedor"""
    return suppliers.delete(supplier_id)

@eel.expose
def get_supplier_purchase_history(supplier_id):
    """Obtener historial de compras a un proveedor"""
    return suppliers.get_purchase_history(supplier_id)

@eel.expose
def clear_all_suppliers():
    """Limpiar todos los proveedores de prueba"""
    return suppliers.clear_all()


# ----- Ventas -----
@eel.expose
def get_sales(filters=None):
    """Obtener ventas con filtros"""
    return api_proxy.sales_proxy.get_all(filters)

@eel.expose
def create_sale(sale_data):
    """Crear una venta"""
    return api_proxy.sales_proxy.create(sale_data)

@eel.expose
def cancel_sale(sale_id):
    """Cancelar/anular una venta"""
    return api_proxy.sales_proxy.cancel(sale_id)

@eel.expose
def get_today_sales():
    """Obtener ventas del día"""
    return api_proxy.sales_proxy.get_today()

# ----- Configuración -----
@eel.expose
def get_settings():
    """Obtener configuración de la app"""
    return settings.get_all()

@eel.expose
def save_settings(settings_data):
    """Guardar configuración"""
    return settings.save(settings_data)

# ----- Categorías/Departamentos -----
@eel.expose
def get_categories():
    """Obtener todas las categorías"""
    return settings.get_categories()

@eel.expose
def save_category(data):
    """Guardar o actualizar una categoría"""
    return settings.save_category(data)

@eel.expose
def delete_category(name):
    """Eliminar una categoría"""
    return settings.delete_category(name)

# ----- Reportes -----
@eel.expose
def get_dashboard_stats():
    """Obtener estadísticas para el dashboard"""
    return api_proxy.reports_proxy.get_dashboard_stats()

@eel.expose
def get_sales_report(start_date, end_date):
    """Generar reporte de ventas"""
    return api_proxy.reports_proxy.get_sales_report(start_date, end_date)

@eel.expose
def get_inventory_report():
    """Generar reporte de inventario"""
    return api_proxy.reports_proxy.get_inventory_report()

@eel.expose
def get_profit_report():
    """Generar reporte de utilidades por producto"""
    # Esta función no está en el proxy
    if api_proxy.is_client_mode():
        return {'success': False, 'error': 'Función no disponible en modo cliente'}
    return reports.get_profit_report()

@eel.expose
def get_supplier_comparison():
    """Generar comparativa de proveedores"""
    return reports.get_supplier_comparison()

@eel.expose
def get_product_sales_history(product_id):
    """Obtener historial de ventas de un producto para gráficas"""
    return reports.get_product_sales_history(product_id)

# ----- Turno de Caja -----
@eel.expose
def start_shift(initial_fund):
    """Iniciar turno de caja"""
    return api_proxy.sales_proxy.start_shift(initial_fund)

@eel.expose
def end_shift():
    """Cerrar turno de caja"""
    return api_proxy.sales_proxy.end_shift()

@eel.expose
def get_current_shift():
    """Obtener turno actual"""
    return api_proxy.sales_proxy.get_current_shift()

@eel.expose
def get_shift_history(limit=50):
    """Obtener historial de turnos/cortes"""
    return api_proxy.sales_proxy.get_shift_history(limit)

@eel.expose
def get_shift_summary(shift_id):
    """Obtener resumen detallado de un turno"""
    return api_proxy.sales_proxy.get_shift_summary(shift_id)

@eel.expose
def save_sale(sale_data):
    """Guardar nueva venta"""
    return api_proxy.sales_proxy.create(sale_data)

@eel.expose
def get_sale_by_folio(folio):
    """Obtener venta por folio con detalles"""
    # Esta función no está en el proxy, usar API local si está disponible
    if api_proxy.is_client_mode():
        return {'success': False, 'error': 'Función no disponible en modo cliente'}
    return sales.get_by_folio(folio)

@eel.expose
def get_sale_by_id(sale_id):
    """Obtener venta por ID con detalles"""
    if api_proxy.is_client_mode():
        return {'success': False, 'error': 'Función no disponible en modo cliente'}
    return sales.get_by_id(sale_id)

# ----- Utilidades -----
@eel.expose
def backup_database():
    """Crear respaldo de la base de datos"""
    from database import backup_db
    return backup_db()

@eel.expose
def get_next_folio():
    """Obtener siguiente folio de venta"""
    return sales.get_next_folio()

# ----- Usuarios -----
@eel.expose
def user_login(username, password):
    """Login de usuario"""
    return users.login(username, password)

@eel.expose
def get_logged_user_bypass():
    """FUNCIONALIDAD DESHABILITADA POR SEGURIDAD"""
    return {'success': False, 'error': 'Función inhabilitada en producción'}

@eel.expose
def get_users():
    """Obtener lista de usuarios"""
    return users.get_all()

@eel.expose
def save_user(user_data):
    """Guardar usuario"""
    return users.save(user_data)

@eel.expose
def delete_user(user_id):
    """Eliminar usuario"""
    return users.delete(user_id)

# ----- Clientes -----
@eel.expose
def get_customers():
    """Obtener todos los clientes"""
    return customers.get_all()

@eel.expose
def get_customer(customer_id):
    """Obtener cliente por ID con historial"""
    return customers.get_by_id(customer_id)

@eel.expose
def search_customers(query):
    """Buscar clientes"""
    return customers.search(query)

@eel.expose
def save_customer(customer_data):
    """Guardar cliente (crear o actualizar)"""
    return customers.save(customer_data)

@eel.expose
def delete_customer(customer_id):
    """Eliminar cliente"""
    return customers.delete(customer_id)

@eel.expose
def add_customer_charge(customer_id, amount, sale_id=None, reference='', notes='', user=''):
    """Agregar cargo a cuenta de cliente"""
    return customers.add_charge(customer_id, amount, sale_id, reference, notes, user)

@eel.expose
def add_customer_payment(customer_id, amount, reference='', notes='', user=''):
    """Registrar abono de cliente"""
    return customers.add_payment(customer_id, amount, reference, notes, user)

@eel.expose
def get_customer_statement(customer_id):
    """Obtener estado de cuenta del cliente"""
    return customers.get_statement(customer_id)

@eel.expose
def get_debtors():
    """Obtener clientes con saldo pendiente"""
    return customers.get_debtors()

# ----- Dispositivos -----
from api import devices

@eel.expose
def get_serial_ports():
    """Obtener lista de puertos seriales disponibles"""
    return devices.get_serial_ports()

@eel.expose
def connect_scale(config):
    """Conectar a la báscula serial"""
    return devices.connect_scale(config)

@eel.expose
def disconnect_scale():
    """Desconectar la báscula"""
    return devices.disconnect_scale()

@eel.expose
def read_scale_weight():
    """Leer peso actual de la báscula"""
    return devices.read_scale_weight()

@eel.expose
def get_scale_status():
    """Obtener estado de conexión de la báscula"""
    return devices.get_scale_status()

@eel.expose
def save_scale_config(config):
    """Guardar configuración de la báscula"""
    return devices.save_scale_config(config)

@eel.expose
def get_printers():
    """Obtener lista de impresoras instaladas"""
    return devices.get_printers()

@eel.expose
def print_test_page(printer_name=None):
    """Imprimir página de prueba"""
    return devices.print_test_page(printer_name)

@eel.expose
def save_printer_config(config):
    """Guardar configuración de impresora"""
    return devices.save_printer_config(config)

@eel.expose
def get_devices_config():
    """Obtener configuración de todos los dispositivos"""
    return devices.get_devices_config()

# =============================================================================
# INICIALIZACIÓN
# =============================================================================


def close_callback(route, websockets):
    """Callback cuando se cierra la ventana"""
    if not websockets:
        perform_backup_on_exit()
        sys.exit()

def main():
    """Función principal"""
    print(f"Iniciando {APP_NAME}...")
    print("="*50)
    
    # Verificar modo de operación
    network_mode = config.get('network.mode', 'standalone')
    station_name = config.get('network.station_name', 'CAJA-1')
    print(f"[INFO] Modo de operacion: {network_mode.upper()}")
    print(f"[INFO] Estacion: {station_name}")
    
    # Inicializar base de datos (solo en modo standalone o servidor)
    if network_mode != 'client':
        init_database()
        print("[OK] Base de datos inicializada")
    else:
        print("[INFO] Modo cliente - usando servidor remoto")
        server_ip = config.get('network.server_ip', '')
        server_port = config.get('network.server_port', 5000)
        print(f"[INFO] Servidor: {server_ip}:{server_port}")
        
        # Inicializar cliente de red
        api_proxy.init_network_if_needed()
    
    # Verificar configuración
    is_first = config.is_first_run()
    
    # [AUDITORIA] Verificar si realmente existen usuarios
    # Si no hay usuarios en la BD, forzar el asistente de configuración
    # Esto protege contra bases de datos corruptas o configuraciones erróneas
    try:
        users_result = users.get_all()
        if users_result.get('success', False) and len(users_result.get('data', [])) == 0:
            print("[WARN] No se detectaron usuarios. Forzando asistente de configuración.")
            is_first = True
    except Exception as e:
        print(f"[ERROR] Error verificando usuarios: {e}")

    print(f"[INFO] Primera ejecucion: {'Si' if is_first else 'No'}")
    
    # Inicializar Eel
    web_path = resource_path(WEB_FOLDER)
    eel.init(web_path)
    print(f"[INFO] Carpeta web: {web_path}")
    
    # Determinar qué página abrir
    if is_first:
        start_page = 'setup-wizard.html'
        window_size = SETUP_SIZE
        print("[INFO] Iniciando asistente de configuracion...")
    else:
        start_page = 'index-tabs.html'
        window_size = DEFAULT_SIZE
        company_name = config.get('company.name', 'Tu POS')
        print(f"[INFO] Empresa: {company_name}")
        print(f"[INFO] Modulos activos: {', '.join(config.get_enabled_modules())}")
    
    print("="*50)
    
    # Configurar opciones de Chrome/Edge con apariencia nativa
    # Flags para una ventana más limpia y nativa de Windows
    chrome_flags = [
        '--disable-infobars',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-translate',
        '--disable-background-mode',
        '--disable-sync',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=TranslateUI',
        '--hide-scrollbars=false',
        '--app-shell-host-window-size=450,680', # Sugerencia de tamaño inicial
    ]
    
    eel_options = {
        'mode': 'edge',  # Usar Edge (viene con Windows)
        'host': 'localhost',
        'port': 8766,
        'size': window_size,
        'position': (100, 50),
        'close_callback': close_callback,
        'cmdline_args': chrome_flags
    }
    
    try:
        print("[INFO] Abriendo aplicacion...")
        eel.start(start_page, **eel_options)
    except EnvironmentError:
        # Si no hay navegador disponible, usar modo sin cabeza
        print("[WARN] No se encontro navegador compatible, usando modo web...")
        print(f"[INFO] Abre http://localhost:8766/{start_page} en tu navegador")
        eel.start(start_page, mode=None, host='localhost', port=8766)

if __name__ == "__main__":
    main()
