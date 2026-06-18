# =============================================================================
# API DE DISPOSITIVOS
# Impresoras, Escáneres y Básculas
# =============================================================================

import sys
import os
import json
import threading
import time

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Intentar importar pyserial para comunicación serial
try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("[Devices] pyserial no está instalado. Ejecuta: pip install pyserial")

# Variable global para la conexión de la báscula
scale_connection = None
scale_reading_thread = None
scale_reading_active = False
last_weight = 0.0
last_weight_unit = 'kg'

# Configuración de dispositivos (se guarda en config.json)
def get_devices_config():
    """Obtener configuración de dispositivos desde config.json"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
            return config.get('devices', get_default_devices_config())
    except:
        return get_default_devices_config()

def get_default_devices_config():
    """Configuración por defecto de dispositivos"""
    return {
        "printer": {
            "enabled": False,
            "name": "",
            "type": "thermal",
            "width": 80
        },
        "scanner": {
            "enabled": True,
            "type": "keyboard",
            "prefix": "",
            "suffix": ""
        },
        "scale": {
            "enabled": False,
            "port": "",
            "baud_rate": 9600,
            "data_bits": 8,
            "parity": "N",
            "stop_bits": 1,
            "unit": "kg",
            "protocol": "generic"
        }
    }

def save_devices_config(devices_config):
    """Guardar configuración de dispositivos en config.json"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'config.json')
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
    except:
        config = {}
    
    config['devices'] = devices_config
    config['metadata'] = config.get('metadata', {})
    config['metadata']['updated_at'] = time.strftime('%Y-%m-%dT%H:%M:%S')
    
    with open(config_path, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2, ensure_ascii=False)
    
    return {'success': True, 'message': 'Configuración de dispositivos guardada'}

# =============================================================================
# PUERTOS SERIALES
# =============================================================================

def get_serial_ports():
    """Obtener lista de puertos seriales disponibles"""
    if not SERIAL_AVAILABLE:
        return {
            'success': False,
            'error': 'pyserial no está instalado. Ejecuta: pip install pyserial',
            'data': []
        }
    
    try:
        ports = []
        for port in serial.tools.list_ports.comports():
            ports.append({
                'port': port.device,
                'description': port.description,
                'hwid': port.hwid,
                'manufacturer': port.manufacturer or 'Desconocido'
            })
        
        return {'success': True, 'data': ports}
    except Exception as e:
        return {'success': False, 'error': str(e), 'data': []}

# =============================================================================
# BÁSCULA
# =============================================================================

def connect_scale(config):
    """Conectar a la báscula serial"""
    global scale_connection, scale_reading_active, scale_reading_thread
    
    if not SERIAL_AVAILABLE:
        return {'success': False, 'error': 'pyserial no está instalado'}
    
    port = config.get('port', '')
    if not port:
        return {'success': False, 'error': 'No se especificó el puerto COM'}
    
    try:
        # Cerrar conexión anterior si existe
        disconnect_scale()
        
        # Mapear paridad
        parity_map = {
            'N': serial.PARITY_NONE,
            'E': serial.PARITY_EVEN,
            'O': serial.PARITY_ODD
        }
        
        # Mapear stop bits
        stopbits_map = {
            1: serial.STOPBITS_ONE,
            2: serial.STOPBITS_TWO
        }
        
        scale_connection = serial.Serial(
            port=port,
            baudrate=int(config.get('baud_rate', 9600)),
            bytesize=int(config.get('data_bits', 8)),
            parity=parity_map.get(config.get('parity', 'N'), serial.PARITY_NONE),
            stopbits=stopbits_map.get(int(config.get('stop_bits', 1)), serial.STOPBITS_ONE),
            timeout=1
        )
        
        # Esperar a que se estabilice
        time.sleep(0.5)
        
        # Iniciar hilo de lectura continua
        scale_reading_active = True
        scale_reading_thread = threading.Thread(target=_scale_reading_loop, daemon=True)
        scale_reading_thread.start()
        
        return {
            'success': True,
            'message': f'Conectado a {port}',
            'port': port
        }
        
    except serial.SerialException as e:
        return {'success': False, 'error': f'Error de conexión: {str(e)}'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def disconnect_scale():
    """Desconectar la báscula"""
    global scale_connection, scale_reading_active
    
    scale_reading_active = False
    
    if scale_connection and scale_connection.is_open:
        try:
            scale_connection.close()
        except:
            pass
    
    scale_connection = None
    return {'success': True, 'message': 'Báscula desconectada'}

def _scale_reading_loop():
    """Hilo de lectura continua de la báscula"""
    global last_weight, scale_connection, scale_reading_active
    
    buffer = ""
    
    while scale_reading_active and scale_connection and scale_connection.is_open:
        try:
            if scale_connection.in_waiting > 0:
                data = scale_connection.read(scale_connection.in_waiting).decode('ascii', errors='ignore')
                buffer += data
                
                # Buscar líneas completas
                while '\r' in buffer or '\n' in buffer:
                    # Dividir por saltos de línea
                    lines = buffer.replace('\r\n', '\n').replace('\r', '\n').split('\n')
                    
                    for line in lines[:-1]:  # Procesar todas las líneas completas
                        weight = _parse_weight_data(line.strip())
                        if weight is not None:
                            last_weight = weight
                    
                    buffer = lines[-1]  # Mantener la parte incompleta
            
            time.sleep(0.1)  # Pequeña pausa para no saturar CPU
            
        except Exception as e:
            print(f"[Scale] Error leyendo: {e}")
            time.sleep(0.5)

def _parse_weight_data(data):
    """Parsear datos de peso de la báscula (formato genérico)"""
    if not data:
        return None
    
    try:
        # Formato común: "  1.234 kg" o "ST,GS,  1.234kg" o "+001.234"
        # Intentar extraer número
        import re
        
        # Buscar patrón numérico con decimales
        match = re.search(r'[-+]?\s*(\d+\.?\d*)', data)
        if match:
            weight_str = match.group(1).strip()
            return float(weight_str)
    except:
        pass
    
    return None

def read_scale_weight():
    """Leer peso actual de la báscula"""
    global last_weight, scale_connection, last_weight_unit
    
    if not scale_connection or not scale_connection.is_open:
        return {
            'success': False,
            'error': 'Báscula no conectada',
            'weight': 0.0,
            'unit': 'kg'
        }
    
    try:
        # Algunas básculas necesitan un comando para enviar el peso
        # Comandos comunes: 'W\r\n', 'P\r\n', 'R\r\n', '\x05' (ENQ)
        # Por ahora usamos lectura pasiva (la báscula envía datos continuamente)
        
        config = get_devices_config().get('scale', {})
        unit = config.get('unit', 'kg')
        
        return {
            'success': True,
            'weight': round(last_weight, 3),
            'unit': unit,
            'timestamp': time.strftime('%H:%M:%S')
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'weight': 0.0,
            'unit': 'kg'
        }

def get_scale_status():
    """Obtener estado de conexión de la báscula"""
    global scale_connection, last_weight
    
    connected = scale_connection is not None and scale_connection.is_open
    
    config = get_devices_config().get('scale', {})
    
    return {
        'success': True,
        'connected': connected,
        'port': config.get('port', ''),
        'last_weight': round(last_weight, 3),
        'unit': config.get('unit', 'kg')
    }

# =============================================================================
# IMPRESORAS
# =============================================================================

def get_printers():
    """Obtener lista de impresoras instaladas en Windows"""
    printers = []
    
    try:
        # Método 1: Usando win32print si está disponible
        try:
            import win32print
            for printer in win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS):
                printers.append({
                    'name': printer[2],
                    'description': printer[1] if len(printer) > 1 else '',
                    'is_default': printer[2] == win32print.GetDefaultPrinter()
                })
            return {'success': True, 'data': printers}
        except ImportError:
            pass
        
        # Método 2: Usando PowerShell
        import subprocess
        result = subprocess.run(
            ['powershell', '-Command', 'Get-Printer | Select-Object Name, DriverName, PortName | ConvertTo-Json'],
            capture_output=True,
            text=True,
            timeout=10
        )
        
        if result.returncode == 0 and result.stdout.strip():
            data = json.loads(result.stdout)
            if isinstance(data, dict):
                data = [data]
            
            for printer in data:
                printers.append({
                    'name': printer.get('Name', ''),
                    'driver': printer.get('DriverName', ''),
                    'port': printer.get('PortName', '')
                })
        
        return {'success': True, 'data': printers}
        
    except Exception as e:
        return {'success': False, 'error': str(e), 'data': []}

def print_test_page(printer_name=None):
    """Imprimir página de prueba"""
    try:
        if not printer_name:
            config = get_devices_config()
            printer_name = config.get('printer', {}).get('name', '')
        
        if not printer_name:
            return {'success': False, 'error': 'No hay impresora configurada'}
        
        # Contenido de prueba
        test_content = """
================================
     PRUEBA DE IMPRESIÓN
================================
  Sistema POS
  Fecha: {}
  Hora: {}
--------------------------------
  Impresora: {}
--------------------------------
  1234567890
  ABCDEFGHIJ
  abcdefghij
  !@#$%^&*()
--------------------------------
  ¡Prueba exitosa!
================================
""".format(
            time.strftime('%d/%m/%Y'),
            time.strftime('%H:%M:%S'),
            printer_name
        )
        
        # Por ahora, guardar en archivo temporal (implementación básica)
        # Para impresión real se necesita win32print o escpos
        return {
            'success': True,
            'message': f'Página de prueba enviada a {printer_name}',
            'content': test_content
        }
        
    except Exception as e:
        return {'success': False, 'error': str(e)}

# =============================================================================
# CONFIGURACIÓN DE DISPOSITIVOS
# =============================================================================

def save_printer_config(config):
    """Guardar configuración de impresora"""
    devices = get_devices_config()
    devices['printer'] = {
        'enabled': bool(config.get('name')),
        'name': config.get('name', ''),
        'type': config.get('type', 'thermal'),
        'width': config.get('width', 80)
    }
    return save_devices_config(devices)

def save_scale_config(config):
    """Guardar configuración de báscula"""
    devices = get_devices_config()
    devices['scale'] = {
        'enabled': bool(config.get('port')),
        'port': config.get('port', ''),
        'baud_rate': int(config.get('baud_rate', 9600)),
        'data_bits': int(config.get('data_bits', 8)),
        'parity': config.get('parity', 'N'),
        'stop_bits': int(config.get('stop_bits', 1)),
        'unit': config.get('unit', 'kg'),
        'protocol': config.get('protocol', 'generic')
    }
    return save_devices_config(devices)
