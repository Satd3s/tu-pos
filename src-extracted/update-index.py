#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import re

# Leer el archivo
with open('index-backup.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Agregar el CSS de profit-calculator en el head
content = content.replace('</head>', '    <link rel="stylesheet" href="profit-calculator.css">\n</head>')

# 2. Actualizar la tabla de productos - reemplazar todo el thead
old_thead = r'<thead>\s*<tr>\s*<th>Código</th>\s*<th>Nombre</th>\s*<th>Categoría</th>\s*<th>Stock</th>\s*<th>Precio</th>\s*<th>Stock Mínimo</th>\s*<th>Acciones</th>\s*</tr>\s*</thead>'

new_thead = '''<thead>
                                    <tr>
                                        <th>Código</th>
                                        <th>N° Pieza</th>
                                        <th>Nombre</th>
                                        <th>Categoría</th>
                                        <th>Proveedor</th>
                                        <th>Stock</th>
                                        <th>Costo</th>
                                        <th>Precio Público</th>
                                        <th>Utilidad</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>'''

content = re.sub(old_thead, new_thead, content, flags=re.DOTALL)

# 3. Actualizar el colspan de la tabla vacía
content = content.replace('colspan="7"', 'colspan="10"')

# 4. Actualizar el modal de productos - agregar campos nuevos
# Primero encontramos el formulario de productos y lo reemplazamos

old_form_start = '<form id="productForm">'
new_form_html = '''<form id="productForm">
                <div class="modal-body">
                    <input type="hidden" id="productId">

                    <div class="form-row">
                        <div class="form-group">
                            <label for="productCode">Código *</label>
                            <input type="text" id="productCode" class="form-input" required>
                        </div>

                        <div class="form-group">
                            <label for="productPartNumber">Número de Pieza</label>
                            <input type="text" id="productPartNumber" class="form-input" placeholder="Ej: PRT-5W30-500ML">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="productName">Nombre *</label>
                            <input type="text" id="productName" class="form-input" required>
                        </div>

                        <div class="form-group">
                            <label for="productCategory">Categoría *</label>
                            <input type="text" id="productCategory" class="form-input" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="productSupplier">Proveedor</label>
                            <select id="productSupplier" class="form-input">
                                <option value="">Sin proveedor</option>
                            </select>
                        </div>

                        <div class="form-group">
                            <label for="productStock">Stock Inicial *</label>
                            <input type="number" id="productStock" class="form-input" required>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="productMinStock">Stock Mínimo *</label>
                            <input type="number" id="productMinStock" class="form-input" required>
                        </div>

                        <div class="form-group">
                            <label for="productCost">Costo de Compra</label>
                            <input type="number" id="productCost" class="form-input" step="0.01" min="0" placeholder="$0.00">
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="productPublicPrice">Precio al Público *</label>
                            <input type="number" id="productPublicPrice" class="form-input" step="0.01" min="0" required placeholder="$0.00">
                        </div>

                        <div class="form-group">
                            <label>Utilidad</label>
                            <div id="productProfitDisplay" class="profit-display">
                                <span class="profit-amount">$0.00</span>
                                <span class="profit-percentage">(0%)</span>
                            </div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="productDescription">Descripción</label>
                        <textarea id="productDescription" class="form-input" rows="3"></textarea>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-ghost" onclick="closeModal('productModal')">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Guardar</button>
                </div>
            </form>'''

# Encontrar y reemplazar el formulario completo
form_pattern = r'<form id="productForm">.*?</form>'
content = re.sub(form_pattern, new_form_html, content, flags=re.DOTALL)

# Guardar
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ index.html actualizado correctamente")
print("✅ Tabla con 10 columnas")
print("✅ Formulario con todos los campos nuevos")
print("✅ CSS de profit-calculator agregado")
