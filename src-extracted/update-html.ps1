# Script para actualizar index.html con los nuevos campos

# 1. Agregar el CSS de profit-calculator
$content = Get-Content "index-fixed.html" -Raw
$content = $content -replace '</head>', '    <link rel="stylesheet" href="profit-calculator.css">`r`n</head>'

# 2. Actualizar tabla de productos (agregar columnas)
$content = $content -replace '<th>Precio</th>', '<th>Costo</th>`r`n                                        <th>Precio Público</th>`r`n                                        <th>Utilidad</th>'
$content = $content -replace '<th>Stock Mínimo</th>`r`n', ''
$content = $content -replace 'colspan="7"', 'colspan="9"'
$content = $content -replace '<th>Categoría</th>', '<th>Categoría</th>`r`n                                        <th>Proveedor</th>'

# Guardar
$content | Set-Content "index.html" -Encoding UTF8

Write-Host "✅ index.html actualizado correctamente" -ForegroundColor Green
