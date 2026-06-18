# =============================================================================
# CLIENTE DE RED - SISTEMA MULTICAJA
# Cliente HTTP para conectarse al servidor API
# =============================================================================

import requests
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
import threading
import time

class NetworkClient:
    """
    Cliente de red para conectarse al servidor API del sistema multicaja.
    Permite a las cajas remotas operar contra la base de datos central.
    """
    
    def __init__(self, server_ip: str = None, server_port: int = 5000, 
                 api_key: str = None, station_name: str = "CAJA-1", 
                 station_id: int = 1):
        self.server_ip = server_ip
        self.server_port = server_port
        self.api_key = api_key or 'default-key-change-me'
        self.station_name = station_name
        self.station_id = station_id
        
        self.base_url = f"http://{server_ip}:{server_port}/api/v1"
        self.connected = False
        self.last_sync = None
        
        # Cola de operaciones offline
        self.offline_queue = []
        self.offline_mode = False
        
        # Caché local
        self.products_cache = []
        self.categories_cache = []
        self.customers_cache = []
        
        # Thread para verificar conexión
        self._connection_monitor = None
        self._monitoring = False
    
    # =========================================================================
    # CONEXIÓN
    # =========================================================================
    
    def connect(self) -> Dict[str, Any]:
        """Intentar conectar al servidor"""
        try:
            response = requests.get(
                f"{self.base_url}/status",
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success'):
                    self.connected = True
                    self.offline_mode = False
                    return {
                        'success': True,
                        'data': data.get('data'),
                        'message': 'Conectado al servidor'
                    }
            
            return {'success': False, 'error': 'Servidor no disponible'}
            
        except requests.exceptions.ConnectionError:
            self.connected = False
            self.offline_mode = True
            return {'success': False, 'error': 'No se puede conectar al servidor'}
        except requests.exceptions.Timeout:
            self.connected = False
            self.offline_mode = True
            return {'success': False, 'error': 'Tiempo de espera agotado'}
        except Exception as e:
            self.connected = False
            return {'success': False, 'error': str(e)}
    
    def disconnect(self):
        """Desconectar del servidor"""
        self.connected = False
        self._stop_monitoring()
    
    def get_status(self) -> Dict[str, Any]:
        """Obtener estado de conexión"""
        return {
            'connected': self.connected,
            'offline_mode': self.offline_mode,
            'server_ip': self.server_ip,
            'server_port': self.server_port,
            'station_name': self.station_name,
            'station_id': self.station_id,
            'pending_sync': len(self.offline_queue),
            'last_sync': self.last_sync.isoformat() if self.last_sync else None
        }
    
    def start_connection_monitor(self, interval: int = 30):
        """Iniciar monitoreo de conexión en segundo plano"""
        self._monitoring = True
        self._connection_monitor = threading.Thread(
            target=self._monitor_connection,
            args=(interval,),
            daemon=True
        )
        self._connection_monitor.start()
    
    def _stop_monitoring(self):
        """Detener monitoreo"""
        self._monitoring = False
    
    def _monitor_connection(self, interval: int):
        """Thread para monitorear conexión"""
        while self._monitoring:
            if not self.connected:
                result = self.connect()
                if result.get('success') and self.offline_queue:
                    # Sincronizar cola offline
                    self.sync_offline_data()
            time.sleep(interval)
    
    # =========================================================================
    # HEADERS COMUNES
    # =========================================================================
    
    def _get_headers(self) -> Dict[str, str]:
        """Obtener headers para las peticiones"""
        return {
            'Content-Type': 'application/json',
            'X-API-Key': self.api_key,
            'X-Station-Name': self.station_name,
            'X-Station-Id': str(self.station_id)
        }
    
    def _make_request(self, method: str, endpoint: str, data: Dict = None) -> Dict[str, Any]:
        """Realizar petición HTTP al servidor"""
        if not self.connected and not self.connect().get('success'):
            return {'success': False, 'error': 'Sin conexión al servidor', 'offline': True}
        
        url = f"{self.base_url}/{endpoint}"
        headers = self._get_headers()
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=data, timeout=10)
            elif method == 'POST':
                response = requests.post(url, headers=headers, json=data, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, headers=headers, json=data, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return {'success': False, 'error': f'Método no soportado: {method}'}
            
            if response.status_code == 401:
                return {'success': False, 'error': 'No autorizado. Verifica la API Key.'}
            
            return response.json()
            
        except requests.exceptions.ConnectionError:
            self.connected = False
            self.offline_mode = True
            return {'success': False, 'error': 'Conexión perdida', 'offline': True}
        except requests.exceptions.Timeout:
            return {'success': False, 'error': 'Tiempo de espera agotado'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    # =========================================================================
    # PRODUCTOS
    # =========================================================================
    
    def get_products(self) -> Dict[str, Any]:
        """Obtener lista de productos"""
        if self.offline_mode and self.products_cache:
            return {'success': True, 'data': self.products_cache, 'cached': True}
        
        result = self._make_request('GET', 'products')
        if result.get('success'):
            self.products_cache = result.get('data', [])
        return result
    
    def get_product(self, product_id: int) -> Dict[str, Any]:
        """Obtener producto por ID"""
        return self._make_request('GET', f'products/{product_id}')
    
    def search_products(self, query: str) -> Dict[str, Any]:
        """Buscar productos"""
        if self.offline_mode and self.products_cache:
            # Búsqueda local en caché
            query_lower = query.lower()
            results = [
                p for p in self.products_cache
                if query_lower in p.get('name', '').lower() or
                   query_lower in p.get('barcode', '').lower() or
                   query_lower in p.get('internal_code', '').lower()
            ]
            return {'success': True, 'data': results, 'cached': True}
        
        return self._make_request('GET', 'products/search', {'q': query})
    
    def save_product(self, product_data: Dict) -> Dict[str, Any]:
        """Guardar producto"""
        result = self._make_request('POST', 'products', product_data)
        if result.get('success'):
            # Invalidar caché
            self.products_cache = []
        return result
    
    def delete_product(self, product_id: int) -> Dict[str, Any]:
        """Eliminar producto"""
        return self._make_request('DELETE', f'products/{product_id}')
    
    def get_low_stock(self, threshold: int = 10) -> Dict[str, Any]:
        """Productos con stock bajo"""
        return self._make_request('GET', 'products/low-stock', {'threshold': threshold})
    
    # =========================================================================
    # VENTAS
    # =========================================================================
    
    def get_sales(self, filters: Dict = None) -> Dict[str, Any]:
        """Obtener ventas"""
        return self._make_request('GET', 'sales', filters)
    
    def create_sale(self, sale_data: Dict) -> Dict[str, Any]:
        """Registrar venta"""
        # Agregar información de la estación
        sale_data['station_name'] = self.station_name
        sale_data['station_id'] = self.station_id
        
        result = self._make_request('POST', 'sales', sale_data)
        
        if result.get('offline'):
            # Guardar en cola offline
            sale_data['offline_id'] = f"OFF-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
            sale_data['created_at'] = datetime.now().isoformat()
            self.offline_queue.append({
                'type': 'sale',
                'data': sale_data
            })
            return {
                'success': True,
                'data': {'id': sale_data['offline_id']},
                'offline': True,
                'message': 'Venta guardada localmente. Se sincronizará cuando haya conexión.'
            }
        
        return result
    
    def cancel_sale(self, sale_id: int) -> Dict[str, Any]:
        """Cancelar venta"""
        return self._make_request('POST', f'sales/{sale_id}/cancel')
    
    def get_today_sales(self) -> Dict[str, Any]:
        """Ventas del día"""
        return self._make_request('GET', 'sales/today', {'station': self.station_name})
    
    def get_next_folio(self) -> Dict[str, Any]:
        """Obtener siguiente folio"""
        return self._make_request('GET', 'sales/next-folio', {'station_id': self.station_id})
    
    # =========================================================================
    # TURNOS
    # =========================================================================
    
    def get_current_shift(self) -> Dict[str, Any]:
        """Obtener turno activo"""
        return self._make_request('GET', 'shifts/current', {'station_id': self.station_id})
    
    def start_shift(self, initial_fund: float) -> Dict[str, Any]:
        """Iniciar turno"""
        return self._make_request('POST', 'shifts/start', {
            'initial_fund': initial_fund,
            'station_id': self.station_id
        })
    
    def end_shift(self) -> Dict[str, Any]:
        """Cerrar turno"""
        return self._make_request('POST', 'shifts/end', {
            'station_id': self.station_id
        })
    
    # =========================================================================
    # CLIENTES
    # =========================================================================
    
    def get_customers(self) -> Dict[str, Any]:
        """Obtener clientes"""
        if self.offline_mode and self.customers_cache:
            return {'success': True, 'data': self.customers_cache, 'cached': True}
        
        result = self._make_request('GET', 'customers')
        if result.get('success'):
            self.customers_cache = result.get('data', [])
        return result
    
    def get_customer(self, customer_id: int) -> Dict[str, Any]:
        """Obtener cliente por ID"""
        return self._make_request('GET', f'customers/{customer_id}')
    
    def search_customers(self, query: str) -> Dict[str, Any]:
        """Buscar clientes"""
        if self.offline_mode and self.customers_cache:
            query_lower = query.lower()
            results = [
                c for c in self.customers_cache
                if query_lower in c.get('name', '').lower() or
                   query_lower in c.get('phone', '').lower()
            ]
            return {'success': True, 'data': results, 'cached': True}
        
        return self._make_request('GET', 'customers/search', {'q': query})
    
    def save_customer(self, customer_data: Dict) -> Dict[str, Any]:
        """Guardar cliente"""
        return self._make_request('POST', 'customers', customer_data)
    
    def add_customer_charge(self, customer_id: int, amount: float, 
                           sale_id: int = None, reference: str = '', 
                           notes: str = '', user: str = '') -> Dict[str, Any]:
        """Agregar cargo a cliente"""
        return self._make_request('POST', f'customers/{customer_id}/charge', {
            'amount': amount,
            'sale_id': sale_id,
            'reference': reference,
            'notes': notes,
            'user': user
        })
    
    def add_customer_payment(self, customer_id: int, amount: float,
                            reference: str = '', notes: str = '', 
                            user: str = '') -> Dict[str, Any]:
        """Registrar pago de cliente"""
        return self._make_request('POST', f'customers/{customer_id}/payment', {
            'amount': amount,
            'reference': reference,
            'notes': notes,
            'user': user
        })
    
    def get_debtors(self) -> Dict[str, Any]:
        """Clientes con saldo pendiente"""
        return self._make_request('GET', 'customers/debtors')
    
    # =========================================================================
    # REPORTES
    # =========================================================================
    
    def get_dashboard_stats(self) -> Dict[str, Any]:
        """Estadísticas del dashboard"""
        return self._make_request('GET', 'reports/dashboard')
    
    def get_sales_report(self, start_date: str, end_date: str) -> Dict[str, Any]:
        """Reporte de ventas"""
        return self._make_request('GET', 'reports/sales', {
            'start_date': start_date,
            'end_date': end_date
        })
    
    def get_inventory_report(self) -> Dict[str, Any]:
        """Reporte de inventario"""
        return self._make_request('GET', 'reports/inventory')
    
    # =========================================================================
    # USUARIOS
    # =========================================================================
    
    def login(self, username: str, password: str) -> Dict[str, Any]:
        """Login de usuario"""
        return self._make_request('POST', 'users/login', {
            'username': username,
            'password': password
        })
    
    # =========================================================================
    # CATEGORÍAS
    # =========================================================================
    
    def get_categories(self) -> Dict[str, Any]:
        """Obtener categorías"""
        if self.offline_mode and self.categories_cache:
            return {'success': True, 'data': self.categories_cache, 'cached': True}
        
        result = self._make_request('GET', 'categories')
        if result.get('success'):
            self.categories_cache = result.get('data', [])
        return result
    
    # =========================================================================
    # SINCRONIZACIÓN
    # =========================================================================
    
    def sync_products(self) -> Dict[str, Any]:
        """Sincronizar productos desde el servidor"""
        result = self._make_request('GET', 'sync/products', {'since': self.last_sync})
        if result.get('success'):
            self.products_cache = result.get('data', [])
            self.last_sync = datetime.now()
        return result
    
    def sync_offline_data(self) -> Dict[str, Any]:
        """Sincronizar datos offline con el servidor"""
        if not self.offline_queue:
            return {'success': True, 'message': 'No hay datos pendientes'}
        
        if not self.connected:
            return {'success': False, 'error': 'Sin conexión'}
        
        # Preparar datos para sincronización
        sync_data = {
            'sales': [],
            'movements': []
        }
        
        for item in self.offline_queue:
            if item['type'] == 'sale':
                sync_data['sales'].append(item['data'])
            elif item['type'] == 'movement':
                sync_data['movements'].append(item['data'])
        
        result = self._make_request('POST', 'sync/upload', sync_data)
        
        if result.get('success'):
            self.offline_queue = []  # Limpiar cola
            self.last_sync = datetime.now()
            return {
                'success': True,
                'message': f"Sincronizados: {len(sync_data['sales'])} ventas, {len(sync_data['movements'])} movimientos"
            }
        
        return result
    
    def refresh_cache(self) -> Dict[str, Any]:
        """Refrescar toda la caché local"""
        results = {}
        
        # Productos
        products_result = self.get_products()
        results['products'] = products_result.get('success', False)
        
        # Categorías
        categories_result = self.get_categories()
        results['categories'] = categories_result.get('success', False)
        
        # Clientes
        customers_result = self.get_customers()
        results['customers'] = customers_result.get('success', False)
        
        self.last_sync = datetime.now()
        
        return {
            'success': all(results.values()),
            'data': results,
            'message': 'Caché actualizado'
        }


# =============================================================================
# SINGLETON PARA EL CLIENTE GLOBAL
# =============================================================================

_network_client: Optional[NetworkClient] = None

def get_network_client() -> Optional[NetworkClient]:
    """Obtener instancia del cliente de red"""
    global _network_client
    return _network_client

def init_network_client(server_ip: str, server_port: int = 5000,
                       api_key: str = None, station_name: str = "CAJA-1",
                       station_id: int = 1) -> NetworkClient:
    """Inicializar cliente de red"""
    global _network_client
    _network_client = NetworkClient(
        server_ip=server_ip,
        server_port=server_port,
        api_key=api_key,
        station_name=station_name,
        station_id=station_id
    )
    return _network_client

def is_network_mode() -> bool:
    """Verificar si estamos en modo cliente de red"""
    return _network_client is not None and _network_client.connected
