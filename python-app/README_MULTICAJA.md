# 🏪 Tu POS - Sistema de Punto de Venta Multicaja

Sistema de punto de venta modular con soporte para múltiples cajas conectadas en red.

## 📋 Modos de Operación

### 1. **Modo Standalone** (Por defecto)
Una sola computadora con base de datos local.

```
IniciarPOS.bat
```

### 2. **Modo Servidor**
Computadora central que almacena la base de datos y sirve a múltiples cajas.

```
IniciarServidor.bat
```

El servidor API se inicia en `http://TU_IP:5000`. Las cajas cliente se conectarán a esta dirección.

### 3. **Modo Cliente**
Cajas adicionales que se conectan al servidor central.

**Configuración en `config.json`:**
```json
{
  "network": {
    "mode": "client",
    "server_ip": "192.168.0.100",
    "server_port": 5000,
    "station_name": "CAJA-2",
    "station_id": 2,
    "api_key": "tupos-api-key-2024"
  }
}
```

Luego ejecutar:
```
IniciarCliente.bat
```

## 🔧 Configuración de Red

### En el Servidor:
1. Editar `config.json` y verificar que `network.mode` sea `"standalone"` o `"server"`
2. Ejecutar `IniciarServidor.bat`
3. Anotar la IP que aparece (ej: `192.168.0.121:5000`)
4. Compartir la IP y API Key con las cajas cliente

### En cada Caja Cliente:
1. Editar `config.json`:
   - `network.mode`: `"client"`
   - `network.server_ip`: IP del servidor
   - `network.station_name`: Nombre único (ej: "CAJA-2", "CAJA-3")
   - `network.station_id`: ID único (ej: 2, 3, 4...)
2. Ejecutar `IniciarCliente.bat` o `IniciarPOS.bat`

## 🔐 Autenticación API

Todas las peticiones al servidor requieren el header:
```
X-API-Key: tupos-api-key-2024
```

Puedes cambiar la API key en `config.json` → `network.api_key`

## 📡 Endpoints del Servidor

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/status` | GET | Estado del servidor |
| `/api/v1/products` | GET | Lista de productos |
| `/api/v1/products/search?q=` | GET | Buscar productos |
| `/api/v1/sales` | POST | Registrar venta |
| `/api/v1/sales/today` | GET | Ventas del día |
| `/api/v1/customers` | GET | Lista de clientes |
| `/api/v1/reports/dashboard` | GET | Estadísticas |

## 🔄 Modo Offline

Las cajas cliente pueden trabajar sin conexión al servidor:
- Las ventas se guardan localmente
- Se sincronizan automáticamente cuando hay conexión
- Un indicador muestra el estado de conexión

## 📁 Archivos Principales

```
python-app/
├── main.py              # Aplicación principal (Eel)
├── server.py            # Servidor API REST
├── config.json          # Configuración del sistema
├── IniciarPOS.bat       # Iniciar en modo normal
├── IniciarServidor.bat  # Iniciar como servidor
├── IniciarCliente.bat   # Iniciar como cliente
├── core/
│   ├── api_proxy.py     # Proxy local/remoto
│   ├── network.py       # Cliente HTTP
│   └── config_manager.py
└── web/
    ├── network-status.js # Widget de conexión
    └── ...
```

## 🛠️ Requisitos

```bash
pip install -r requirements.txt
```

Dependencias principales:
- eel (interfaz gráfica)
- flask, flask-cors (servidor API)
- requests (cliente HTTP)
- pyserial (dispositivos)

## 📞 Soporte

Para problemas de conexión:
1. Verificar que el servidor esté ejecutándose
2. Verificar la IP y puerto en `config.json`
3. Verificar que ambas máquinas estén en la misma red
4. Verificar que no haya firewall bloqueando el puerto 5000
