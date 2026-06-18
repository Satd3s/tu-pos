# =============================================================================
# GESTOR DE CONFIGURACIÓN DEL SISTEMA
# Maneja la configuración global, empresa, módulos y preferencias
# =============================================================================

import json
import os
from datetime import datetime

# Ruta del archivo de configuración
CONFIG_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG_FILE = os.path.join(CONFIG_DIR, 'config.json')
LOGO_DIR = os.path.join(CONFIG_DIR, 'assets', 'logo')

# Configuración por defecto
DEFAULT_CONFIG = {
    "version": "2.0.0",
    "first_run": True,
    "setup_completed": False,
    
    # Información de la empresa
    "company": {
        "name": "",
        "slogan": "",
        "phone": "",
        "email": "",
        "address": "",
        "city": "",
        "state": "",
        "country": "México",
        "postal_code": "",
        "rfc": "",
        "logo_path": ""
    },
    
    # Configuración regional
    "regional": {
        "currency": "MXN",
        "currency_symbol": "$",
        "currency_position": "before",  # before o after
        "decimal_separator": ".",
        "thousands_separator": ",",
        "decimals": 2,
        "date_format": "DD/MM/YYYY",
        "time_format": "24h",
        "timezone": "America/Mexico_City",
        "language": "es"
    },
    
    # Impuestos
    "taxes": {
        "enabled": True,
        "default_rate": 16.0,
        "name": "IVA",
        "included_in_price": True
    },
    
    # Módulos habilitados
    "modules": {
        "inventory": {
            "enabled": True,
            "required": True,
            "name": "Inventario",
            "description": "Gestión de productos, stock y categorías",
            "icon": "📦"
        },
        "pos": {
            "enabled": True,
            "required": False,
            "name": "Punto de Venta",
            "description": "Caja registradora, ventas y tickets",
            "icon": "💰"
        },
        "customers": {
            "enabled": True,
            "required": False,
            "name": "Clientes",
            "description": "Gestión de clientes, créditos y cuentas por cobrar",
            "icon": "👥"
        },
        "suppliers": {
            "enabled": True,
            "required": False,
            "name": "Proveedores",
            "description": "Gestión de proveedores y compras",
            "icon": "🚚"
        },
        "reports": {
            "enabled": True,
            "required": False,
            "name": "Reportes",
            "description": "Estadísticas, gráficos y reportes",
            "icon": "📊"
        },
        "users": {
            "enabled": True,
            "required": False,
            "name": "Usuarios",
            "description": "Multi-usuario con roles y permisos",
            "icon": "👤"
        },
        "multicash": {
            "enabled": False,
            "required": False,
            "name": "Multicaja",
            "description": "Sistema servidor/cliente para múltiples cajas",
            "icon": "🏪"
        }
    },
    
    # Preferencias de venta
    "sales": {
        "check_stock": True,
        "allow_negative_stock": False,
        "show_purchase_price": False,
        "round_prices": True,
        "round_to": 0.5,
        "require_customer": False,
        "default_payment_method": "cash",
        "print_ticket_auto": True,
        "ticket_copies": 1
    },
    
    # Preferencias de inventario
    "inventory": {
        "low_stock_alert": True,
        "low_stock_threshold": 10,
        "auto_generate_code": True,
        "code_prefix": "PROD",
        "track_lots": False,
        "track_expiration": False
    },
    
    # Configuración de red (multicaja)
    "network": {
        "mode": "standalone",  # standalone, server, client
        "server_ip": "",
        "server_port": 5000,
        "station_name": "CAJA-1",
        "station_id": 1,
        "auto_sync": True
    },
    
    # Apariencia
    "appearance": {
        "theme": "dark",
        "accent_color": "#3b82f6",
        "font_size": "medium",
        "compact_mode": False,
        "animations": True
    },
    
    # Ticket/Recibo
    "ticket": {
        "width": 80,  # mm
        "header_text": "",
        "footer_text": "¡Gracias por su compra!",
        "show_logo": True,
        "show_address": True,
        "show_phone": True
    },
    
    # Metadatos
    "metadata": {
        "created_at": "",
        "updated_at": "",
        "last_backup": ""
    }
}


class ConfigManager:
    """Gestor de configuración del sistema"""
    
    _instance = None
    _config = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._load_config()
        return cls._instance
    
    def _load_config(self):
        """Cargar configuración desde archivo o crear default"""
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                    self._config = json.load(f)
                # Merge con defaults para asegurar nuevas keys
                self._config = self._deep_merge(DEFAULT_CONFIG.copy(), self._config)
            except Exception as e:
                print(f"Error cargando config: {e}")
                self._config = DEFAULT_CONFIG.copy()
        else:
            self._config = DEFAULT_CONFIG.copy()
            self._config['metadata']['created_at'] = datetime.now().isoformat()
    
    def _deep_merge(self, base, override):
        """Merge profundo de diccionarios"""
        result = base.copy()
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        return result
    
    def save(self):
        """Guardar configuración a archivo"""
        try:
            self._config['metadata']['updated_at'] = datetime.now().isoformat()
            
            # Asegurar que el directorio exista
            os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
            
            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._config, f, indent=2, ensure_ascii=False)
            
            return {'success': True}
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get(self, path, default=None):
        """
        Obtener valor de configuración usando dot notation
        Ejemplo: config.get('company.name')
        """
        keys = path.split('.')
        value = self._config
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return default
        
        return value
    
    def set(self, path, value):
        """
        Establecer valor de configuración usando dot notation
        Ejemplo: config.set('company.name', 'Mi Empresa')
        """
        keys = path.split('.')
        config = self._config
        
        for key in keys[:-1]:
            if key not in config:
                config[key] = {}
            config = config[key]
        
        config[keys[-1]] = value
        return self.save()
    
    def get_all(self):
        """Obtener toda la configuración"""
        return self._config.copy()
    
    def update_section(self, section, data):
        """Actualizar una sección completa de configuración"""
        if section in self._config:
            self._config[section] = self._deep_merge(self._config[section], data)
            return self.save()
        return {'success': False, 'error': f'Sección {section} no existe'}
    
    def is_first_run(self):
        """Verificar si es la primera ejecución"""
        return self._config.get('first_run', True)
    
    def setup_completed(self):
        """Verificar si el setup inicial está completo"""
        return self._config.get('setup_completed', False)
    
    def complete_setup(self):
        """Marcar el setup como completado"""
        self._config['first_run'] = False
        self._config['setup_completed'] = True
        return self.save()
    
    def is_module_enabled(self, module_name):
        """Verificar si un módulo está habilitado"""
        modules = self._config.get('modules', {})
        module = modules.get(module_name, {})
        return module.get('enabled', False)
    
    def get_enabled_modules(self):
        """Obtener lista de módulos habilitados"""
        modules = self._config.get('modules', {})
        return [name for name, data in modules.items() if data.get('enabled', False)]
    
    def toggle_module(self, module_name, enabled):
        """Habilitar/deshabilitar un módulo"""
        modules = self._config.get('modules', {})
        if module_name in modules:
            if modules[module_name].get('required', False) and not enabled:
                return {'success': False, 'error': 'Este módulo es obligatorio'}
            modules[module_name]['enabled'] = enabled
            return self.save()
        return {'success': False, 'error': f'Módulo {module_name} no existe'}
    
    def get_company_info(self):
        """Obtener información de la empresa"""
        return self._config.get('company', {})
    
    def get_regional_settings(self):
        """Obtener configuración regional"""
        return self._config.get('regional', {})
    
    def get_network_mode(self):
        """Obtener modo de red"""
        return self._config.get('network', {}).get('mode', 'standalone')
    
    def format_currency(self, amount):
        """Formatear cantidad como moneda según configuración regional"""
        regional = self.get_regional_settings()
        symbol = regional.get('currency_symbol', '$')
        decimals = regional.get('decimals', 2)
        position = regional.get('currency_position', 'before')
        
        formatted = f"{amount:,.{decimals}f}"
        
        if position == 'before':
            return f"{symbol}{formatted}"
        else:
            return f"{formatted} {symbol}"


# Instancia global
config = ConfigManager()


# =============================================================================
# FUNCIONES EXPUESTAS A EEL
# =============================================================================

def get_config():
    """Obtener toda la configuración"""
    return {'success': True, 'data': config.get_all()}

def get_config_value(path, default=None):
    """Obtener un valor específico de configuración"""
    return {'success': True, 'data': config.get(path, default)}

def set_config_value(path, value):
    """Establecer un valor de configuración"""
    return config.set(path, value)

def update_company_info(data):
    """Actualizar información de la empresa"""
    return config.update_section('company', data)

def update_regional_settings(data):
    """Actualizar configuración regional"""
    return config.update_section('regional', data)

def update_sales_settings(data):
    """Actualizar preferencias de venta"""
    return config.update_section('sales', data)

def update_appearance(data):
    """Actualizar apariencia"""
    return config.update_section('appearance', data)

def is_first_run():
    """Verificar si es primera ejecución"""
    return {'success': True, 'data': config.is_first_run()}

def complete_setup():
    """Completar setup inicial"""
    return config.complete_setup()

def get_enabled_modules():
    """Obtener módulos habilitados"""
    return {'success': True, 'data': config.get_enabled_modules()}

def toggle_module(module_name, enabled):
    """Habilitar/deshabilitar módulo"""
    return config.toggle_module(module_name, enabled)

def get_all_modules():
    """Obtener todos los módulos con su estado"""
    return {'success': True, 'data': config.get('modules', {})}
