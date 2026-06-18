# 📋 GUÍA DE INTEGRACIÓN - MÓDULO DE PROVEEDORES Y UTILIDADES

## 🎯 Resumen de Funcionalidades Agregadas

Este módulo extiende el Sistema de Inventario con las siguientes capacidades:

### ✨ Nuevas Funcionalidades:
1. **Gestión de Proveedores** - Catálogo completo de proveed ores con información de contacto
2. **Número de Pieza** - Campo adicional para identificar productos por número de pieza
3. **Costos y Precios** - Separación entre costo de compra y precio al público
4. **Cálculo de Utilidad** - Automático al ingresar costos y precios
5. **Reporte de Utilidades** - Análisis completo de rentabilidad por producto
6. **Comparativa de Proveedores** - Identifica qué proveedor conviene más

---

## 📁 Archivos Creados

Los siguientes archivos han sido creados en la carpeta `src-extracted`:

1. **suppliers-module.js** - Módulo JavaScript con toda la lógica de proveedores
2. **elementos-adicionales.html** - Plantillas HTML a integrar
3. **estilos-adicionales.css** - Estilos CSS para las nuevas funcionalidades
4. **INSTRUCCIONES.md** - Este archivo de instrucciones

---

## 🔧 PASOS DE INTEGRACIÓN

### PASO 1: Agregar los CSS Adicionales

1. Abrir el archivo `index.html`
2. En la sección `<head>`, después de la línea donde dice:
   ```html
   <link rel="stylesheet" href="styles.css">
   ```
3. Agregar esta nueva línea:
   ```html
   <link rel="stylesheet" href="estilos-adicionales.css">
   ```

### PASO 2: Agregar el Script del Módulo de Proveedores

1. En el archivo `index.html`, buscar la línea (casi al final del archivo):
   ```html
   <script src="app.js"></script>
   ```
2. Inmediatamente **después** de esa línea, agregar:
   ```html
   <script src="suppliers-module.js"></script>
   ```

### PASO 3: Agregar la Vista de Proveedores en el HTML

1. Abrir el archivo `elementos-adicionales.html` 
2. Copiar la sección completa que dice "VISTA DE PROVEEDORES"
3. En el archivo `index.html`, buscar la sección `<!-- Products View -->` y localizar su cierre `</div>`
4. Después de ese cierre (antes de `<!-- Movements View -->`), pegar la vista de proveedores

### PASO 4: Agregar el Modal de Proveedores

1. En el archivo `elementos-adicionales.html`, copiar la sección "MODAL DE PROVEEDORES"
2. En el archivo `index.html`, buscar el último modal (probablemente el de usuarios)
3. Después del cierre de ese modal, pegar el modal de proveedores

### PASO 5: Actualizar el Modal de Productos

En el archivo `index.html`, localizar el formulario del modal de productos (`<form id="productForm">`) y:

1. **Después del campo "productName"**, agregar:
   ```html
   <div class="form-group">
       <label for="productPartNumber">Número de Pieza</label>
       <input type="text" id="productPartNumber" class="form-input" placeholder="Ej: PRT-12345">
   </div>

   <div class="form-group">
       <label for="productSupplier">Proveedor</label>
       <select id="productSupplier" class="form-input">
           <option value="">Sin proveedor</option>
       </select>
   </div>
   ```

2. **Antes del campo "productPrice"**, agregar:
   ```html
   <div class="form-group">
       <label for="productCost">Costo de Compra *</label>
       <input type="number" id="productCost" class="form-input" step="0.01" min="0" required>
       <small style="color: var(--gray-400);">Precio al que compras al proveedor</small>
   </div>
   ```

3. **Actualizar el campo "productPrice"** cambiando el label a:
   ```html
   <label for="productPrice">Precio al Público *</label>
   ```
   Y agregar debajo del input:
   ```html
   <small style="color: var(--gray-400);">Precio de venta al cliente</small>
   ```

4. **Después del campo price**, agregar el cálculo de utilidad:
   ```html
   <div class="form-group">
       <label>Utilidad Calculada</label>
       <div id="profitCalculation" style="padding: 0.75rem; background: rgba(16, 185, 129, 0.1); border-radius: var(--radius-md); color: var(--success-500);">
           <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
               <span>Utilidad por unidad:</span>
               <strong id="unitProfit">$0.00</strong>
           </div>
           <div style="display: flex; justify-content: space-between;">
               <span>Margen de utilidad:</span>
               <strong id="profitMargin">0%</strong>
           </div>
       </div>
   </div>
   ```

### PASO 6: Agregar Nuevos Reportes

1. En el archivo `index.html`, buscar la sección `<!-- Reports View -->` (dentro de `<div id="reportsView">`)
2. Localizar el `<div class="reports-grid">` que contiene las tarjetas de reportes
3. **Dentro de ese reports-grid**, después de las tarjetas existentes, agregar:

```html
<div class="card">
    <div class="card-header">
        <h3>Reporte de Utilidades</h3>
    </div>
    <div class="card-body">
        <p class="mb-2">Análisis completo de costos, precios y utilidades por producto.</p>
        <button class="btn btn-secondary btn-full" id="generateProfitReport">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Generar Reporte de Utilidades
        </button>
    </div>
</div>

<div class="card">
    <div class="card-header">
        <h3>Comparativa de Proveedores</h3>
    </div>
    <div class="card-body">
        <p class="mb-2">Análisis comparativo de rentabilidad por proveedor.</p>
        <button class="btn btn-secondary btn-full" id="generateSupplierComparisonReport">
            <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002- 2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Generar Comparativa de Proveedores
        </button>
    </div>
</div>
```

### PASO 7: Actualizar el archivo app.js

En el archivo `app.js`, hay que hacer varias actualizaciones:

#### 7.1 - Actualizar initializeDefaultData() (línea ~28):

Después de la línea que dice `initializeDefaultData() {`, agregar al final de la función, justo antes del último cierre `}`:
```javascript
// Inicializar proveedores
initializeSuppliers();
```

#### 7.2 - Actualizar loadData() (línea ~245):

Después de la línea `allUsers = StorageManager.get('users', []);`, agregar:
```javascript
loadSuppliers();
```

#### 7.3 - Actualizar setupNavigation() (línea ~208):

Dentro del switch/if que maneja las vistas, agregar después de la sección de 'users':
```javascript
} else if (viewName === 'suppliers') {
    renderSuppliersTable();
}
```

#### 7.4 - Actualizar renderProductsTable() (~línea 320):

En la tabla de productos, hay que agregar las nuevas columnas. Buscar la fila de encabezados `<thead><tr>` y modificar para incluir:
```html
<th>N° Pieza</th>
<th>Proveedor</th>
<th>Costo</th>
<th>Utilidad%</th>
```

Y en el tbody, agregar las celdas correspondientes:
```javascript
<td>${product.partNumber || '-'}</td>
<td>${allSuppliers.find(s => s.id === product.supplierId)?.name || '-'}</td>
<td>${formatCurrency(product.cost || 0)}</td>
<td><span class="badge ${utility > 25 ? 'profit-high' : utility > 10 ? 'profit-medium' : 'profit-low'}">${utility.toFixed(1)}%</span></td>
```

Nota: En la función, antes del return ``, agregar:
```javascript
const utility = product.cost > 0 ? (((product.publicPrice - product.cost) / product.cost) * 100) : 0;
```

#### 7.5 - Actualizar openAddProductModal() (~línea 371):

Después de `openModal('productModal');`, agregar:
```javascript
// Rellenar dropdown de proveedores
const supplierSelect = document.getElementById('productSupplier');
supplierSelect.innerHTML = '<option value="">Sin proveedor</option>';
allSuppliers.forEach(supplier => {
    const option = document.createElement('option');
    option.value = supplier.id;
    option.textContent = supplier.name;
    supplierSelect.appendChild(option);
});
```

#### 7.6 - Actualizar editProduct() (~línea 378):

Después de las líneas que asignan valores a los campos del formulario, agregar:
```javascript
document.getElementById('productPartNumber').value = product.partNumber || '';
document.getElementById('productSupplier').value = product.supplierId || '';
document.getElementById('productCost').value = product.cost || 0;

// Rellenar dropdown de proveedores
const supplierSelect = document.getElementById('productSupplier');
supplierSelect.innerHTML = '<option value="">Sin proveedor</option>';
allSuppliers.forEach(supplier => {
    const option = document.createElement('option');
    option.value = supplier.id;
    option.textContent = supplier.name;
    if (supplier.id === product.supplierId) {
        option.selected = true;
    }
    supplierSelect.appendChild(option);
});
```

#### 7.7 - Actualizar handleProductSubmit() (~línea 410):

En el objeto `productData`, agregar los nuevos campos:
```javascript
partNumber: document.getElementById('productPartNumber').value,
supplierId: document.getElementById('productSupplier').value,
cost: parseFloat(document.getElementById('productCost').value) || 0,
publicPrice: parseFloat(document.getElementById('productPrice').value),
```

Nota: Cambiar `price:` por `publicPrice:` para mantener consistencia.

#### 7.8 - Actualizar setupEventListeners() (~línea 850):

Al final de la función, antes del cierre `}`, agregar:
```javascript
// Proveedores
const addSupplierBtn = document.getElementById('addSupplierBtn');
if (addSupplierBtn) {
    addSupplierBtn.addEventListener('click', openAddSupplierModal);
}

const searchSuppliers = document.getElementById('searchSuppliers');
if (searchSuppliers) {
    searchSuppliers.addEventListener('input', (e) => {
        renderSuppliersTable(e.target.value);
    });
}

const supplierForm = document.getElementById('supplierForm');
if (supplierForm) {
    supplierForm.addEventListener('submit', handleSupplierSubmit);
}

// Reportes de utilidad
const profitReportBtn = document.getElementById('generateProfitReport');
if (profitReportBtn) {
    profitReportBtn.addEventListener('click', generateProfitReport);
}

const supplierComparisonBtn = document.getElementById('generateSupplierComparisonReport');
if (supplierComparisonBtn) {
    supplierComparisonBtn.addEventListener('click', generateSupplierComparisonReport);
}

// Cálculo automático de utilidad en el formulario de productos
const costInput = document.getElementById('productCost');
const priceInput = document.getElementById('productPrice');
if (costInput && priceInput) {
    const updateProfitCalc = () => {
        const cost = parseFloat(costInput.value) || 0;
        const price = parseFloat(priceInput.value) || 0;
        const profit = price - cost;
        const profitPercent = cost > 0 ? ((profit / cost) * 100) : 0;
        
        document.getElementById('unitProfit').textContent = formatCurrency(profit);
        document.getElementById('profitMargin').textContent = profitPercent.toFixed(2) + '%';
    };
    
    costInput.addEventListener('input', updateProfitCalc);
    priceInput.addEventListener('input', updateProfitCalc);
}
```

---

## 🧪 PRUEBAS

Después de completar la integración:

1. **Verificar que no hay errores de consola**:
   - Abrir las herramientas de desarrollador (F12)
   - Revisar la consola en busca de errores

2. **Probar el flujo de Proveedores**:
   - Ir a la sección "Proveedores"
   - Agregar un nuevo proveedor
   - Editar un proveedor existente
   - Verificar que no se puede eliminar si tiene productos asociados

3. **Probar el flujo de Productos con costos**:
   - Ir a "Productos" → "Agregar Producto"
   - Verificar que aparecen los nuevos campos: Número de Pieza, Proveedor, Costo
   - Ingresar un costo y precio público
   - Verificar que se calcula automáticamente la utilidad
   - Guardar y ver que se muestra correctamente en la tabla

4. **Probar los Reportes**:
   - Ir a "Reportes" → "Reporte de Utilidades"
   - Verificar que muestra correctamente los costos, precios y utilidades
   - Ir a "Comparativa de Proveedores"
   - Verificar que muestra el ranking de proveedores por rentabilidad

---

## 📊 ESTRUCTURA DE DATOS

### Proveedor (Supplier):
```javascript
{
    id: 'supp_xxx',
    code: 'PROV001',
    name: 'Nombre del Proveedor',
    contact: 'Persona de Contacto',
    phone: '555-1234',
    email: 'email@proveedor.com',
    address: 'Dirección completa',
    active: true
}
```

### Producto Actualizado (Product):
```javascript
{
    id: 'prod_xxx',
    code: 'ACC001',
    partNumber: 'PRT-12345',          // NUEVO
    name: 'Nombre del Producto',
    category: 'Categoría',
    supplierId: 'supp_xxx',           // NUEVO - referencia al proveedor
    cost: 100.00,                     // NUEVO - costo de compra
    publicPrice: 150.00,              // RENOMBRADO (antes era "price")
    stock: 50,
    minStock: 10,
    description: 'Descripción'
}
```

---

## 🎨 CLASES CSS IMPORTANTES

- `.profit-high` - Utilidad alta (>= 30%)
- `.profit-medium` - Utilidad media (15%-29%)
- `.profit-low` - Utilidad baja (< 15%)
- `.badge-info` - Badge azul para información general
- `.action-btns` - Container para botones de acción en tablas

---

## ⚠️ NOTAS IMPORTANTES

1. **Compatibilidad**: Algunos productos existentes no tendrán los nuevos campos (cost, publicPrice, supplierId, partNumber). El sistema muestra "-" o "$0.00" en esos casos.

2. **Migración de datos**: Si quieres migrar productos existentes, tendrás que:
   - Copiar el valor de `price` a `publicPrice`
   - Asignar un `cost` manualmente
   - Opcionalmente asignar un `supplierId`

3. **Eliminación de proveedores**: No se puede eliminar un proveedor que tiene productos asociados. Primero hay que cambiar o eliminar esos productos.

4. **Reportes**: Los reportes solo mostrarán datos útiles cuando los productos tengan `cost` y `publicPrice` definidos.

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema: No aparece la vista de Proveedores
**Solución**: Verificar que se agregó correctamente el navigation item en el sidebar y la vista completa en el main content.

### Problema: Los cálculos de utilidad no se actualizan
**Solución**: Verificar que se agregaron los event listeners en `setupEventListeners()`.

### Problema: Error "generateProfitReport is not defined"
**Solución**: Verificar que se agregó el script `suppliers-module.js` **después** de `app.js`.

### Problema: Los dropdowns de proveedor están vacíos
**Solución**: Verificar que se llama `loadSuppliers()` en la función `loadData()` y que se actualiza el dropdown en `openAddProductModal()` y `editProduct()`.

---

## 📝 CHANGELOG

**Versión 1.0.1** (2025-11-24)
- ✅ Módulo de gestión de proveedores
- ✅ Campos extendidos en productos (número de pieza, costo, precio público)
- ✅ Cálculo automático de utilidades
- ✅ Reporte de utilidades por producto
- ✅ Comparativa de proveedores por rentabilidad
- ✅ Badges de clasificación de utilidad
- ✅ Estilos mejorados y responsivos

---

## 📧 SOPORTE

Si encuentras algún problema durante la integración, revisa:
1. La consola del navegador (F12) en busca de errores
2. Que todos los archivos estén en la misma carpeta `src-extracted`
3. Que los nombres de los archivos sean exactos (distinguen mayúsculas/minúsculas)
4. Que los IDs de los elementos HTML coincidan exactamente

---

## 🚀 PRÓXIMAS MEJORAS SUGERIDAS

- [ ] Gráficos de utilidad con Chart.js
- [ ] Exportar reportes a Excel
- [ ] Alertas de margen de utilidad bajo
- [ ] Historial de precios por proveedor
- [ ] Búsqueda avanzada multi-criterio

---

**¡Éxito con la integración! 🎉**
