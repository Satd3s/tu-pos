# =============================================================================
# SERVIDOR API REST - SISTEMA MULTICAJA
# API REST para sincronización de múltiples cajas/terminales
# =============================================================================

from flask import Flask, jsonify, request
from flask_cors import CORS
import sqlite3
import os
import json
from datetime import datetime
from functools import wraps

# Importar módulos de la API
from database import get_db_connection, init_database
from api import products, sales, movements, purchases, suppliers, customers, users, reports, settings
from core.config_manager import config

# =============================================================================
# CONFIGURACIÓN DEL SERVIDOR
# =============================================================================

app = Flask(__name__)
CORS(app)  # Permitir conexiones desde otras máquinas

# Configuración
SERVER_PORT = config.get('network.server_port', 5000)
API_VERSION = 'v1'

# =============================================================================
# MIDDLEWARE DE AUTENTICACIÓN (Básico)
# =============================================================================

def require_auth(f):
    """Decorador para requerir autenticación en endpoints"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        api_key = request.headers.get('X-API-Key')
        
        # Por ahora, autenticación simple con API key
        # En producción usar JWT o similar
        expected_key = config.get('network.api_key', 'default-key-change-me')
        
        if api_key != expected_key:
            return jsonify({'success': False, 'error': 'No autorizado'}), 401
        
        return f(*args, **kwargs)
    return decorated

# =============================================================================
# ENDPOINTS DE INFORMACIÓN
# =============================================================================

@app.route(f'/api/{API_VERSION}/status', methods=['GET'])
def get_status():
    """Estado del servidor"""
    return jsonify({
        'success': True,
        'data': {
            'status': 'online',
            'version': config.get('version', '2.0.0'),
            'company': config.get('company.name', 'Sin configurar'),
            'timestamp': datetime.now().isoformat(),
            'station_name': 'SERVIDOR',
            'connected_clients': 0  # TODO: Implementar contador de clientes
        }
    })

@app.route(f'/api/{API_VERSION}/config', methods=['GET'])
@require_auth
def get_server_config():
    """Obtener configuración (para sincronizar clientes)"""
    return jsonify({
        'success': True,
        'data': {
            'company': config.get_company_info(),
            'regional': config.get_regional_settings(),
            'taxes': config.get('taxes'),
            'sales': config.get('sales'),
            'modules': config.get('modules')
        }
    })

# =============================================================================
# ENDPOINTS DE PRODUCTOS
# =============================================================================

@app.route(f'/api/{API_VERSION}/products', methods=['GET'])
@require_auth
def api_get_products():
    """Obtener todos los productos"""
    return jsonify(products.get_all())

@app.route(f'/api/{API_VERSION}/products/<int:product_id>', methods=['GET'])
@require_auth
def api_get_product(product_id):
    """Obtener un producto por ID"""
    return jsonify(products.get_by_id(product_id))

@app.route(f'/api/{API_VERSION}/products/search', methods=['GET'])
@require_auth
def api_search_products():
    """Buscar productos"""
    query = request.args.get('q', '')
    return jsonify(products.search(query))

@app.route(f'/api/{API_VERSION}/products/catalog/search', methods=['GET'])
@require_auth
def api_search_catalog():
    """Buscar productos en el catálogo histórico (importado)"""
    query = request.args.get('q', '')
    return jsonify(products.search_catalog(query))


@app.route(f'/api/{API_VERSION}/products', methods=['POST'])
@require_auth
def api_save_product():
    """Crear/actualizar producto"""
    data = request.get_json()
    return jsonify(products.save(data))

@app.route(f'/api/{API_VERSION}/products/<int:product_id>', methods=['DELETE'])
@require_auth
def api_delete_product(product_id):
    """Eliminar producto"""
    return jsonify(products.delete(product_id))

@app.route(f'/api/{API_VERSION}/products/low-stock', methods=['GET'])
@require_auth
def api_low_stock():
    """Productos con stock bajo"""
    threshold = request.args.get('threshold', 10, type=int)
    return jsonify(products.get_low_stock(threshold))

# =============================================================================
# ENDPOINTS DE VENTAS
# =============================================================================

@app.route(f'/api/{API_VERSION}/sales', methods=['GET'])
@require_auth
def api_get_sales():
    """Obtener ventas con filtros"""
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'station': request.args.get('station'),
        'status': request.args.get('status')
    }
    return jsonify(sales.get_all(filters))

@app.route(f'/api/{API_VERSION}/sales', methods=['POST'])
@require_auth
def api_create_sale():
    """Registrar nueva venta"""
    data = request.get_json()
    
    # Agregar información de la estación cliente
    data['station_name'] = request.headers.get('X-Station-Name', 'DESCONOCIDA')
    data['station_id'] = request.headers.get('X-Station-Id', 0)
    
    return jsonify(sales.create(data))

@app.route(f'/api/{API_VERSION}/sales/<int:sale_id>/cancel', methods=['POST'])
@require_auth
def api_cancel_sale(sale_id):
    """Cancelar venta"""
    return jsonify(sales.cancel(sale_id))

@app.route(f'/api/{API_VERSION}/sales/today', methods=['GET'])
@require_auth
def api_today_sales():
    """Ventas del día"""
    station = request.args.get('station')
    return jsonify(sales.get_today(station))

@app.route(f'/api/{API_VERSION}/sales/next-folio', methods=['GET'])
@require_auth
def api_next_folio():
    """Obtener siguiente folio"""
    station_id = request.args.get('station_id', 1, type=int)
    return jsonify(sales.get_next_folio(station_id))

# =============================================================================
# ENDPOINTS DE TURNOS
# =============================================================================

@app.route(f'/api/{API_VERSION}/shifts/current', methods=['GET'])
@require_auth
def api_current_shift():
    """Obtener turno activo"""
    # station_id = request.args.get('station_id', 1, type=int)  # TODO: soporte multi-caja
    return jsonify(sales.get_current_shift())

@app.route(f'/api/{API_VERSION}/shifts/start', methods=['POST'])
@require_auth
def api_start_shift():
    """Iniciar turno"""
    data = request.get_json()
    return jsonify(sales.start_shift(data.get('initial_fund', 0)))

@app.route(f'/api/{API_VERSION}/shifts/end', methods=['POST'])
@require_auth
def api_end_shift():
    """Cerrar turno"""
    # data = request.get_json()  # TODO: soporte multi-caja con station_id
    return jsonify(sales.end_shift())

# =============================================================================
# ENDPOINTS DE CLIENTES
# =============================================================================

@app.route(f'/api/{API_VERSION}/customers', methods=['GET'])
@require_auth
def api_get_customers():
    """Obtener todos los clientes"""
    return jsonify(customers.get_all())

@app.route(f'/api/{API_VERSION}/customers/<int:customer_id>', methods=['GET'])
@require_auth
def api_get_customer(customer_id):
    """Obtener cliente por ID"""
    return jsonify(customers.get_by_id(customer_id))

@app.route(f'/api/{API_VERSION}/customers/search', methods=['GET'])
@require_auth
def api_search_customers():
    """Buscar clientes"""
    query = request.args.get('q', '')
    return jsonify(customers.search(query))

@app.route(f'/api/{API_VERSION}/customers', methods=['POST'])
@require_auth
def api_save_customer():
    """Crear/actualizar cliente"""
    data = request.get_json()
    return jsonify(customers.save(data))

@app.route(f'/api/{API_VERSION}/customers/<int:customer_id>/charge', methods=['POST'])
@require_auth
def api_customer_charge(customer_id):
    """Agregar cargo a cliente"""
    data = request.get_json()
    return jsonify(customers.add_charge(
        customer_id,
        data.get('amount'),
        data.get('sale_id'),
        data.get('reference', ''),
        data.get('notes', ''),
        data.get('user', '')
    ))

@app.route(f'/api/{API_VERSION}/customers/<int:customer_id>/payment', methods=['POST'])
@require_auth
def api_customer_payment(customer_id):
    """Registrar pago de cliente"""
    data = request.get_json()
    return jsonify(customers.add_payment(
        customer_id,
        data.get('amount'),
        data.get('reference', ''),
        data.get('notes', ''),
        data.get('user', '')
    ))

@app.route(f'/api/{API_VERSION}/customers/debtors', methods=['GET'])
@require_auth
def api_get_debtors():
    """Clientes con saldo pendiente"""
    return jsonify(customers.get_debtors())

# =============================================================================
# ENDPOINTS DE PROVEEDORES
# =============================================================================

@app.route(f'/api/{API_VERSION}/suppliers', methods=['GET'])
@require_auth
def api_get_suppliers():
    """Obtener todos los proveedores"""
    return jsonify(suppliers.get_all())

@app.route(f'/api/{API_VERSION}/suppliers/<int:supplier_id>', methods=['GET'])
@require_auth
def api_get_supplier(supplier_id):
    """Obtener proveedor por ID"""
    return jsonify(suppliers.get_by_id(supplier_id))

@app.route(f'/api/{API_VERSION}/suppliers', methods=['POST'])
@require_auth
def api_save_supplier():
    """Crear/actualizar proveedor"""
    data = request.get_json()
    return jsonify(suppliers.save(data))

@app.route(f'/api/{API_VERSION}/suppliers/<int:supplier_id>', methods=['DELETE'])
@require_auth
def api_delete_supplier(supplier_id):
    """Eliminar proveedor"""
    return jsonify(suppliers.delete(supplier_id))

# =============================================================================
# ENDPOINTS DE COMPRAS
# =============================================================================

@app.route(f'/api/{API_VERSION}/purchases', methods=['GET'])
@require_auth
def api_get_purchases():
    """Obtener compras"""
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'supplier_id': request.args.get('supplier_id', type=int)
    }
    return jsonify(purchases.get_all(filters))

@app.route(f'/api/{API_VERSION}/purchases', methods=['POST'])
@require_auth
def api_create_purchase():
    """Registrar compra"""
    data = request.get_json()
    return jsonify(purchases.create(data))

@app.route(f'/api/{API_VERSION}/purchases/<int:purchase_id>/cancel', methods=['POST'])
@require_auth
def api_cancel_purchase(purchase_id):
    """Cancelar compra"""
    data = request.get_json()
    return jsonify(purchases.cancel(purchase_id, data.get('reason', '')))

# =============================================================================
# ENDPOINTS DE REPORTES
# =============================================================================

@app.route(f'/api/{API_VERSION}/reports/dashboard', methods=['GET'])
@require_auth
def api_dashboard_stats():
    """Estadísticas del dashboard"""
    return jsonify(reports.get_dashboard_stats())

@app.route(f'/api/{API_VERSION}/reports/sales', methods=['GET'])
@require_auth
def api_sales_report():
    """Reporte de ventas"""
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    return jsonify(reports.get_sales_report(start_date, end_date))

@app.route(f'/api/{API_VERSION}/reports/inventory', methods=['GET'])
@require_auth
def api_inventory_report():
    """Reporte de inventario"""
    return jsonify(reports.get_inventory_report())

@app.route(f'/api/{API_VERSION}/reports/profit', methods=['GET'])
@require_auth
def api_profit_report():
    """Reporte de utilidades"""
    return jsonify(reports.get_profit_report())

# =============================================================================
# ENDPOINTS DE USUARIOS
# =============================================================================

@app.route(f'/api/{API_VERSION}/users/login', methods=['POST'])
def api_login():
    """Login de usuario"""
    data = request.get_json()
    return jsonify(users.login(data.get('username'), data.get('password')))

@app.route(f'/api/{API_VERSION}/users', methods=['GET'])
@require_auth
def api_get_users():
    """Obtener usuarios"""
    return jsonify(users.get_all())

@app.route(f'/api/{API_VERSION}/users', methods=['POST'])
@require_auth
def api_save_user():
    """Crear/actualizar usuario"""
    data = request.get_json()
    return jsonify(users.save(data))

# =============================================================================
# ENDPOINTS DE MOVIMIENTOS DE INVENTARIO
# =============================================================================

@app.route(f'/api/{API_VERSION}/movements', methods=['GET'])
@require_auth
def api_get_movements():
    """Obtener movimientos de inventario"""
    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'type': request.args.get('type'),
        'product_id': request.args.get('product_id', type=int)
    }
    return jsonify(movements.get_all(filters))

@app.route(f'/api/{API_VERSION}/movements', methods=['POST'])
@require_auth
def api_create_movement():
    """Crear movimiento de inventario"""
    data = request.get_json()
    return jsonify(movements.create(data))

# =============================================================================
# ENDPOINTS DE CATEGORÍAS
# =============================================================================

@app.route(f'/api/{API_VERSION}/categories', methods=['GET'])
@require_auth
def api_get_categories():
    """Obtener categorías"""
    return jsonify(settings.get_categories())

@app.route(f'/api/{API_VERSION}/categories', methods=['POST'])
@require_auth
def api_save_category():
    """Guardar categoría"""
    data = request.get_json()
    return jsonify(settings.save_category(data))

@app.route(f'/api/{API_VERSION}/categories/<name>', methods=['DELETE'])
@require_auth
def api_delete_category(name):
    """Eliminar categoría"""
    return jsonify(settings.delete_category(name))

# =============================================================================
# SINCRONIZACIÓN (Para modo offline de clientes)
# =============================================================================

@app.route(f'/api/{API_VERSION}/sync/products', methods=['GET'])
@require_auth
def api_sync_products():
    """Sincronizar productos (con timestamp de última sincronización)"""
    since = request.args.get('since')  # ISO timestamp
    # TODO: Implementar sincronización incremental
    return jsonify(products.get_all())

@app.route(f'/api/{API_VERSION}/sync/upload', methods=['POST'])
@require_auth
def api_sync_upload():
    """Subir datos del cliente (ventas offline, etc.)"""
    data = request.get_json()
    results = {
        'sales': [],
        'movements': []
    }
    
    # Procesar ventas pendientes
    if 'sales' in data:
        for sale in data['sales']:
            result = sales.create(sale)
            results['sales'].append(result)
    
    # Procesar movimientos pendientes
    if 'movements' in data:
        for movement in data['movements']:
            result = movements.create(movement)
            results['movements'].append(result)
    
    return jsonify({'success': True, 'data': results})

# =============================================================================
# WEBSOCKET PARA ACTUALIZACIONES EN TIEMPO REAL (Futuro)
# =============================================================================

# TODO: Implementar WebSocket con flask-socketio para:
# - Notificar cambios de precios en tiempo real
# - Sincronización instantánea de stock
# - Mensajes entre cajas

# =============================================================================
# MAIN
# =============================================================================

def run_server(host='0.0.0.0', port=None, debug=False):
    """Iniciar el servidor API"""
    if port is None:
        port = SERVER_PORT
    
    print("=" * 60)
    print(f"  SERVIDOR API - {config.get('company.name', 'Tu POS')}")
    print("=" * 60)
    print(f"  Direccion: http://{host}:{port}")
    print(f"  API Key: {config.get('network.api_key', 'default-key-change-me')}")
    print("=" * 60)
    print("\n  Endpoints disponibles:")
    print(f"    GET  /api/{API_VERSION}/status        - Estado del servidor")
    print(f"    GET  /api/{API_VERSION}/products      - Lista de productos")
    print(f"    POST /api/{API_VERSION}/sales         - Registrar venta")
    print(f"    GET  /api/{API_VERSION}/reports/*     - Reportes")
    print("\n  Presiona Ctrl+C para detener el servidor")
    print("=" * 60 + "\n")
    
    app.run(host=host, port=port, debug=debug, threaded=True)

if __name__ == '__main__':
    init_database()
    run_server(debug=True)
