# Sistema de Inventario - Python Edition

Sistema de gestión de inventario y punto de venta construido con Python, Eel y SQLite.

## 🚀 Instalación Rápida

### 1. Requisitos
- Python 3.9 o superior
- Microsoft Edge (viene con Windows 10/11)

### 2. Instalar dependencias
```bash
cd python-app
pip install -r requirements.txt
```

### 3. Ejecutar
```bash
python main.py
```

## 📁 Estructura del Proyecto

```
python-app/
├── main.py              # Aplicación principal
├── database.py          # Conexión SQLite
├── requirements.txt     # Dependencias
├── inventory.db         # Base de datos (se crea automáticamente)
├── api/
│   ├── products.py      # API de productos
│   ├── sales.py         # API de ventas y turnos
│   ├── movements.py     # API de movimientos
│   ├── settings.py      # API de configuración
│   └── reports.py       # API de reportes
├── web/
│   ├── index.html       # Interfaz principal
│   ├── styles.css       # Estilos
│   ├── app.js           # Lógica frontend
│   ├── storage-manager.js # Adaptador Python-JS
│   └── *.js             # Otros módulos
└── backups/             # Respaldos automáticos
```

## 🗄️ Base de Datos

El sistema usa SQLite, que ofrece:
- ✅ Sin límite práctico de registros
- ✅ Transacciones ACID
- ✅ Respaldos sencillos (archivo .db)
- ✅ No requiere servidor

### Tablas:
- `products` - Productos del inventario
- `categories` - Categorías
- `suppliers` - Proveedores
- `movements` - Movimientos de inventario
- `sales` - Ventas
- `sale_items` - Detalle de ventas
- `shifts` - Turnos de caja
- `settings` - Configuración

## 🔧 Crear Ejecutable (.exe)

```bash
pip install pyinstaller
pyinstaller --onefile --windowed --add-data "web;web" --name "InventarioSMIP" main.py
```

El ejecutable estará en `dist/InventarioSMIP.exe`

## 🔌 Migrar Datos Existentes

Si tienes datos en la versión Electron (localStorage), puedes exportarlos:

1. En la app Electron, abre la consola (F12)
2. Ejecuta:
```javascript
copy(JSON.stringify({
    products: JSON.parse(localStorage.getItem('products') || '[]'),
    sales: JSON.parse(localStorage.getItem('sales') || '[]'),
    movements: JSON.parse(localStorage.getItem('movements') || '[]')
}))
```
3. Guarda el contenido en un archivo `data-export.json`
4. Usa el script de migración (próximamente)

## 📞 Soporte

Para agregar funciones de Windows:
- Impresión térmica: `pip install python-escpos`
- Generación de PDFs: `pip install reportlab`
- APIs de Windows: `pip install pywin32`
