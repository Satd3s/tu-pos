# =============================================================================
# API PROXY - SISTEMA MULTICAJA
# Redirige las llamadas a local o remoto según la configuración
# =============================================================================

from typing import Dict, Any, Optional
from core.config_manager import config

# Cliente de red (se inicializa solo si es modo cliente)
_network_client = None
_operation_mode = None

def get_operation_mode() -> str:
    """Obtener modo de operación actual"""
    global _operation_mode
    if _operation_mode is None:
        _operation_mode = config.get('network.mode', 'standalone')
    return _operation_mode

def is_client_mode() -> bool:
    """Verificar si estamos en modo cliente"""
    return get_operation_mode() == 'client'

def is_server_mode() -> bool:
    """Verificar si estamos en modo servidor"""
    return get_operation_mode() == 'server'

def is_standalone_mode() -> bool:
    """Verificar si estamos en modo standalone"""
    return get_operation_mode() == 'standalone'

def init_network_if_needed():
    """Inicializar cliente de red si es modo cliente"""
    global _network_client
    
    if is_client_mode() and _network_client is None:
        from core.network import NetworkClient
        
        server_ip = config.get('network.server_ip', '')
        server_port = config.get('network.server_port', 5000)
        api_key = config.get('network.api_key', 'default-key-change-me')
        station_name = config.get('network.station_name', 'CAJA-1')
        station_id = config.get('network.station_id', 1)
        
        if server_ip:
            _network_client = NetworkClient(
                server_ip=server_ip,
                server_port=server_port,
                api_key=api_key,
                station_name=station_name,
                station_id=station_id
            )
            
            # Intentar conectar
            result = _network_client.connect()
            if result.get('success'):
                print(f"[NETWORK] Conectado al servidor: {server_ip}:{server_port}")
                # Iniciar monitoreo de conexión
                _network_client.start_connection_monitor()
            else:
                print(f"[NETWORK] Error conectando: {result.get('error')}")
                print("[NETWORK] Trabajando en modo offline")
        else:
            print("[NETWORK] Error: No se configuró IP del servidor")
    
    return _network_client

def get_network_client():
    """Obtener cliente de red"""
    return _network_client

def get_network_status() -> Dict[str, Any]:
    """Obtener estado de la red"""
    if _network_client:
        return _network_client.get_status()
    return {
        'mode': get_operation_mode(),
        'connected': False,
        'offline_mode': False
    }


# =============================================================================
# PROXY PARA PRODUCTOS
# =============================================================================

class ProductsProxy:
    """Proxy para operaciones de productos"""
    
    @staticmethod
    def get_all() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_products()
        else:
            from api import products
            return products.get_all()
    
    @staticmethod
    def get_by_id(product_id: int) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_product(product_id)
        else:
            from api import products
            return products.get_by_id(product_id)
    
    @staticmethod
    def search(query: str) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.search_products(query)
        else:
            from api import products
            return products.search(query)
    
    @staticmethod
    def save(product_data: Dict) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.save_product(product_data)
        else:
            from api import products
            return products.save(product_data)
    
    @staticmethod
    def delete(product_id: int) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.delete_product(product_id)
        else:
            from api import products
            return products.delete(product_id)
    
    @staticmethod
    def get_low_stock(threshold: int = 10) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_low_stock(threshold)
        else:
            from api import products
            return products.get_low_stock(threshold)


# =============================================================================
# PROXY PARA VENTAS
# =============================================================================

class SalesProxy:
    """Proxy para operaciones de ventas"""
    
    @staticmethod
    def get_all(filters: Dict = None) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_sales(filters)
        else:
            from api import sales
            return sales.get_all(filters)
    
    @staticmethod
    def create(sale_data: Dict) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.create_sale(sale_data)
        else:
            from api import sales
            return sales.create(sale_data)
    
    @staticmethod
    def cancel(sale_id: int) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.cancel_sale(sale_id)
        else:
            from api import sales
            return sales.cancel(sale_id)
    
    @staticmethod
    def get_today(station: str = None) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_today_sales()
        else:
            from api import sales
            return sales.get_today(station)
    
    @staticmethod
    def get_next_folio(station_id: int = 1) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_next_folio()
        else:
            from api import sales
            return sales.get_next_folio(station_id)
    
    @staticmethod
    def get_current_shift(station_id: int = 1) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_current_shift()
        else:
            from api import sales
            return sales.get_current_shift()
    
    @staticmethod
    def start_shift(initial_fund: float, station_id: int = 1) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.start_shift(initial_fund)
        else:
            from api import sales
            return sales.start_shift(initial_fund)
    
    @staticmethod
    def end_shift(station_id: int = 1) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.end_shift()
        else:
            from api import sales
            return sales.end_shift()

    @staticmethod
    def get_shift_history(limit: int = 50) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            # Si existiera en el cliente de red
            if hasattr(_network_client, 'get_shift_history'):
                return _network_client.get_shift_history(limit)
            return {'success': False, 'error': 'No disponible en modo cliente'}
        else:
            from api import sales
            return sales.get_shift_history(limit)

    @staticmethod
    def get_shift_summary(shift_id: int) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            # Podría implementarse en red
            return {'success': False, 'error': 'No disponible en modo cliente'}
        else:
            from api import sales
            return sales.get_shift_summary(shift_id)


# =============================================================================
# PROXY PARA CLIENTES
# =============================================================================

class CustomersProxy:
    """Proxy para operaciones de clientes"""
    
    @staticmethod
    def get_all() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_customers()
        else:
            from api import customers
            return customers.get_all()
    
    @staticmethod
    def get_by_id(customer_id: int) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_customer(customer_id)
        else:
            from api import customers
            return customers.get_by_id(customer_id)
    
    @staticmethod
    def search(query: str) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.search_customers(query)
        else:
            from api import customers
            return customers.search(query)
    
    @staticmethod
    def save(customer_data: Dict) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.save_customer(customer_data)
        else:
            from api import customers
            return customers.save(customer_data)
    
    @staticmethod
    def add_charge(customer_id: int, amount: float, sale_id: int = None,
                   reference: str = '', notes: str = '', user: str = '') -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.add_customer_charge(
                customer_id, amount, sale_id, reference, notes, user
            )
        else:
            from api import customers
            return customers.add_charge(customer_id, amount, sale_id, reference, notes, user)
    
    @staticmethod
    def add_payment(customer_id: int, amount: float, reference: str = '',
                    notes: str = '', user: str = '') -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.add_customer_payment(
                customer_id, amount, reference, notes, user
            )
        else:
            from api import customers
            return customers.add_payment(customer_id, amount, reference, notes, user)
    
    @staticmethod
    def get_debtors() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_debtors()
        else:
            from api import customers
            return customers.get_debtors()


# =============================================================================
# PROXY PARA REPORTES
# =============================================================================

class ReportsProxy:
    """Proxy para operaciones de reportes"""
    
    @staticmethod
    def get_dashboard_stats() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_dashboard_stats()
        else:
            from api import reports
            return reports.get_dashboard_stats()
    
    @staticmethod
    def get_sales_report(start_date: str, end_date: str) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_sales_report(start_date, end_date)
        else:
            from api import reports
            return reports.get_sales_report(start_date, end_date)
    
    @staticmethod
    def get_inventory_report() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_inventory_report()
        else:
            from api import reports
            return reports.get_inventory_report()


# =============================================================================
# PROXY PARA USUARIOS
# =============================================================================

class UsersProxy:
    """Proxy para operaciones de usuarios"""
    
    @staticmethod
    def login(username: str, password: str) -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.login(username, password)
        else:
            from api import users
            return users.login(username, password)


# =============================================================================
# PROXY PARA CATEGORÍAS
# =============================================================================

class CategoriesProxy:
    """Proxy para operaciones de categorías"""
    
    @staticmethod
    def get_all() -> Dict[str, Any]:
        if is_client_mode() and _network_client:
            return _network_client.get_categories()
        else:
            from api import settings
            return settings.get_categories()


# =============================================================================
# INSTANCIAS GLOBALES DE LOS PROXIES
# =============================================================================

products_proxy = ProductsProxy()
sales_proxy = SalesProxy()
customers_proxy = CustomersProxy()
reports_proxy = ReportsProxy()
users_proxy = UsersProxy()
categories_proxy = CategoriesProxy()
