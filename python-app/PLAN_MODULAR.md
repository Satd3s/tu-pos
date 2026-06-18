# 🚀 Plan de Sistema POS Modular Profesional

## 📋 Visión General

Convertir el sistema actual en un **POS modular, escalable y multicaja** con las siguientes características:

---

## 🧩 FASE 1: Sistema de Módulos (Instalador)

### Módulos Disponibles:

| Módulo | Descripción | Obligatorio |
|--------|-------------|-------------|
| 📦 **Artículos/Inventario** | Gestión de productos, stock, categorías | ✅ SÍ |
| 💰 **Punto de Venta (POS)** | Caja, ventas, tickets | Opcional |
| 👥 **Clientes** | Gestión de clientes, créditos, cuentas | Opcional |
| 🚚 **Proveedores** | Gestión de proveedores, compras | Opcional |
| 📊 **Reportes** | Estadísticas, reportes, dashboard | Opcional |
| 👤 **Usuarios** | Multi-usuario, permisos, roles | Opcional |
| 🏪 **Multicaja** | Sistema servidor/cliente | Opcional |

### Estructura de Configuración de Módulos:
```json
{
    "modules": {
        "inventory": { "enabled": true, "required": true },
        "pos": { "enabled": true },
        "customers": { "enabled": true },
        "suppliers": { "enabled": true },
        "reports": { "enabled": true },
        "users": { "enabled": true },
        "multicash": { "enabled": false }
    }
}
```

---

## 🏢 FASE 2: Configuración de Empresa (Setup Wizard)

### Pantalla de Configuración Inicial:

1. **Datos de la Empresa**
   - Nombre del negocio
   - Dirección
   - Teléfono
   - RFC/NIT/ID Fiscal
   - Logo (imagen)

2. **Configuración Regional**
   - Moneda (MXN, USD, EUR, etc.)
   - Símbolo de moneda ($, €, etc.)
   - Formato de fecha
   - Zona horaria
   - Impuesto (IVA %)

3. **Preferencias de Venta**
   - ✅ Verificar stock antes de vender
   - ✅ Permitir ventas con stock negativo
   - ✅ Mostrar precio de compra
   - ✅ Redondeo de precios

---

## 🏪 FASE 3: Sistema Multicaja (Servidor/Cliente)

### Arquitectura:

```
┌─────────────────────────────────────────────────────┐
│                    SERVIDOR                          │
│  ┌─────────────────────────────────────────────┐    │
│  │           Base de Datos SQLite              │    │
│  │              (inventory.db)                 │    │
│  └─────────────────────────────────────────────┘    │
│                       │                              │
│  ┌─────────────────────────────────────────────┐    │
│  │         API REST (Flask/FastAPI)            │    │
│  │              Puerto: 5000                   │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────┘
                        │ Red Local (WiFi/Ethernet)
        ┌───────────────┼───────────────┐
        │               │               │
   ┌────▼────┐    ┌────▼────┐    ┌────▼────┐
   │ CAJA 1  │    │ CAJA 2  │    │ CAJA 3  │
   │(Cliente)│    │(Cliente)│    │(Cliente)│
   └─────────┘    └─────────┘    └─────────┘
```

### Modos de Operación:

1. **Modo Standalone (Local)**
   - Una sola caja
   - Base de datos local
   - Sin necesidad de red

2. **Modo Servidor**
   - Ejecuta la API REST
   - Almacena la base de datos central
   - Administración del sistema

3. **Modo Cliente**
   - Se conecta al servidor
   - Solo interfaz de caja
   - Sincronización en tiempo real

---

## 📁 Nueva Estructura de Archivos

```
python-app/
├── main.py                 # Entrada principal
├── config.json             # Configuración del sistema
├── database.py             # Base de datos
├── server.py               # API REST para multicaja
│
├── core/                   # Núcleo del sistema
│   ├── __init__.py
│   ├── module_manager.py   # Gestor de módulos
│   ├── config_manager.py   # Gestor de configuración
│   └── network.py          # Red servidor/cliente
│
├── api/                    # APIs de backend
│   ├── products.py         # [OBLIGATORIO]
│   ├── sales.py
│   ├── customers.py
│   ├── suppliers.py
│   ├── reports.py
│   ├── users.py
│   └── settings.py
│
├── web/                    # Frontend
│   ├── index.html
│   ├── setup-wizard.html   # Asistente de configuración inicial
│   ├── styles.css
│   └── modules/
│       ├── inventory.js
│       ├── pos.js
│       ├── customers.js
│       └── ...
│
└── installer/              # Instalador
    ├── setup.py
    ├── setup_wizard.html
    └── assets/
```

---

## 🎯 FASE 4: Setup Wizard (Primera Ejecución)

Cuando el sistema se ejecute por primera vez, mostrará un asistente de configuración:

### Paso 1: Bienvenida
- Selección de idioma
- Aceptar términos

### Paso 2: Datos de Empresa
- Nombre, logo, datos de contacto

### Paso 3: Configuración Regional
- Moneda, impuestos, formato de fecha

### Paso 4: Selección de Módulos
- Checkboxes para cada módulo opcional
- Descripción de cada uno

### Paso 5: Modo de Operación
- Standalone / Servidor / Cliente
- Si es cliente: IP del servidor

### Paso 6: Usuario Administrador
- Crear usuario admin
- Contraseña segura

### Paso 7: ¡Listo!
- Resumen de configuración
- Botón "Iniciar Sistema"

---

## 📝 Orden de Implementación

1. ✅ **Crear sistema de configuración** (config.json)
2. ✅ **Crear gestor de módulos** (habilitar/deshabilitar)
3. ✅ **Crear Setup Wizard** (primera ejecución)
4. ⏳ **Adaptar frontend** para módulos dinámicos
5. ⏳ **Crear API REST** para multicaja
6. ⏳ **Crear cliente de red** para cajas remotas
7. ⏳ **Crear instalador** con NSIS o similar

---

## 🚀 ¡Empezamos!

Comenzaré implementando las primeras 3 fases de forma incremental.
