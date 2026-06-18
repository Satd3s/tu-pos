# 🚀 Sistema de Inventario - Módulo de Proveedores y Utilidades

## ✨ Bienvenido

Este módulo extiende el **Sistema de Inventario para Refaccionarias** con funcionalidades avanzadas de gestión de proveedores y análisis de utilidades.

---

## 📚 DOCUMENTACIÓN

| Archivo | Descripción | Para Quién |
|---------|-------------|------------|
| **[RESUMEN.md](RESUMEN.md)** | 📊 Vista general rápida de todas las funcionalidades | Todos |
| **[INSTRUCCIONES.md](INSTRUCCIONES.md)** | 📖 Guía detallada de integración paso a paso | Desarrolladores |
| **datos-prueba.js** | 🧪 Script con datos de ejemplo para probar | Desarrolladores |

---

## 🎯 INICIO RÁPIDO

### Para Usuarios (¿Qué hace este módulo?)

Este módulo te permite:

1. **Gestionar Proveedores** 📋
   - Agregar y administrar tus proveedores
   - Guardar información de contacto
   - Ver cuántos productos tienes de cada proveedor

2. **Controlar Costos y Precios** 💰
   - Registrar el costo de compra de cada producto
   - Establecer el precio de venta al público
   - Ver la utilidad calculada automáticamente

3. **Analizar Rentabilidad** 📈
   - Ver qué productos son más rentables
   - Comparar proveedores para saber cuál conviene más
   - Tomar decisiones basadas en datos reales

### Para Desarrolladores (¿Cómo lo integro?)

**Tiempo estimado**: 30-45 minutos

1. **Lee el RESUMEN.md** - Entiende qué se agregó
2. **Sigue INSTRUCCIONES.md** - Integra paso a paso
3. **Usa datos-prueba.js** - Prueba con datos de ejemplo
4. **¡Listo!** 🎉

---

## 📦 ARCHIVOS DE CÓDIGO

### Archivos JavaScript:
- **suppliers-module.js** (455 líneas) - Lógica del módulo de proveedores
- **datos-prueba.js** (150 líneas) - Datos de ejemplo

### Archivos HTML:
- **elementos-adicionales.html** (200 líneas) - Plantillas a integrar

### Archivos CSS:
- **estilos-adicionales.css** (400 líneas) - Estilos nuevos

---

## 💡 CARACTERÍSTICAS PRINCIPALES

```
✅ Gestión completa de proveedores
✅ Número de pieza para productos
✅ Separación de costo vs precio público
✅ Cálculo automático de utilidades
✅ Reporte de utilidades por producto
✅ Comparativa de proveedores
✅ Clasificación visual por colores
✅ Protección de integridad de datos
✅ Diseño responsivo
✅ Reportes imprimibles
```

---

## 🖼️ CAPTURAS DE PANTALLA (Conceptuales)

### Vista de Proveedores
```
┌─────────────────────────────────────────────────┐
│ Gestión de Proveedores          [+ Agregar]    │
├─────────────────────────────────────────────────┤
│ Código │ Nombre         │ Contacto │ Productos │
├────────┼────────────────┼──────────┼──────────┤
│ PROV001│ Auto Partes MX │ Juan P.  │ 15 prod. │
│ PROV002│ Dist. Nacional │ María G. │ 8 prod.  │
│ PROV003│ Refac. Norte   │ Carlos R.│ 12 prod. │
└─────────────────────────────────────────────────┘
```

### Formulario de Producto Mejorado
```
┌─────────────────────────────────────┐
│ Agregar Producto                   │
├─────────────────────────────────────┤
│ Código: [ACC001        ]           │
│ Nombre: [Aceite Motor 5W-30]       │
│ N° Pieza: [5W30-SINT-1L]           │
│ Proveedor: [Auto Partes MX ▼]      │
│ Costo Compra: [$180.00]            │
│ Precio Público: [$299.99]          │
│                                     │
│ ┌─── Utilidad Calculada ─────┐    │
│ │ Utilidad por unidad: $119.99│    │
│ │ Margen de utilidad:  66.66% │    │
│ └─────────────────────────────┘    │
│                                     │
│ Stock: [45] Min: [10]              │
│ Categoría: [Lubricantes]           │
│                                     │
│ [Cancelar] [Guardar]               │
└─────────────────────────────────────┘
```

### Reporte de Utilidades
```
┌───────────────────────────────────────────────────┐
│ 📊 Reporte de Utilidades                         │
├───────────────────────────────────────────────────┤
│ Costo Total Inventario:    $50,000.00           │
│ Valor Total Inventario:     $75,000.00           │
│ Utilidad Total:            $25,000.00           │
│ Margen de Utilidad:         50.00%              │
├───────────────────────────────────────────────────┤
│ Producto       │ Cost │ Precio │ Utilidad │ %   │
├────────────────┼──────┼────────┼──────────┼─────┤
│ Aceite 5W-30   │$180  │$299.99 │ $119.99  │🟢67%│
│ Filtro Aceite  │$45   │$89.50  │ $44.50   │🟢99%│
│ Balatas        │$380  │$499.00 │ $119.00  │🟡31%│
│ Batería 12V    │$1450 │$1599   │ $149.00  │🔴10%│
└────────────────┴──────┴────────┴──────────┴─────┘

🟢 = Utilidad Alta (≥30%)
🟡 = Utilidad Media (15-29%)
🔴 = Utilidad Baja (<15%)
```

### Comparativa de Proveedores  
```
┌─────────────────────────────────────────────────┐
│ 📈 Comparativa de Proveedores                  │
├─────────────────────────────────────────────────┤
│ Proveedor          │ Productos │ Utilidad │ %  │
├────────────────────┼───────────┼──────────┼────┤
│ #1 Auto Partes MX  │    15     │ $12,500  │45% │
│ #2 Dist. Nacional  │     8     │  $6,800  │34% │
│ #3 Refac. Norte    │    12     │  $5,700  │19% │
└────────────────────┴───────────┴──────────┴────┘

💡 Recomendaciones:
• Mejor proveedor: Auto Partes MX
• Atención: Refac. Norte tiene margen bajo
```

---

## 🎓 CONCEPTOS  CLAVE

### Cálculo de Utilidad
```
Utilidad por Unidad = Precio Público - Costo de Compra
Margen de Utilidad = (Utilidad / Costo) × 100

Ejemplo:
Costo: $180
Precio: $299.99
Utilidad: $299.99 - $180 = $119.99
Margen: ($119.99 / $180) × 100 = 66.66%
```

### Clasificación por Color
- 🟢 **Verde** (≥30%) - Utilidad Alta - Excelente
- 🟡 **Amarillo** (15-29%) - Utilidad Media - Aceptable
- 🔴 **Rojo** (<15%) - Utilidad Baja - Revisar

---

## 🔧 INSTALACIÓN Y CONFIGURACIÓN

### Opción 1: Integración Completa (Recomendada)
Sigue la guía completa en **INSTRUCCIONES.md** para integrar todo el módulo.

### Opción 2: Prueba Rápida con Datos de Ejemplo
1. Abre el sistema en tu navegador
2. Presiona F12 para abrir la consola
3. Copia y pega el contenido de `datos-prueba.js`
4. Ejecuta: `cargarDatosPrueba()`
5. Recarga la página
6. ¡Explora las nuevas funcionalidades!

---

## 📊 ESTRUCTURA DEL PROYECTO

```
src-extracted/
├── 📄 index.html                    # Aplicación principal
├── 🎨 styles.css                    # Estilos base
├── 💼 app.js                        # Lógica principal
│
├── ── ARCHIVOS NUEVOS ──
├── 💼 suppliers-module.js           # Módulo de proveedores
├── 🎨 estilos-adicionales.css       # Estilos nuevos
├── 📄 elementos-adicionales.html    # Plantillas HTML
├── 🧪 datos-prueba.js               # Datos de ejemplo
│
├── ── DOCUMENTACIÓN ──
├── 📖 README.md                     # Este archivo
├── 📊 RESUMEN.md                    # Resumen visual
└── 📝 INSTRUCCIONES.md              # Guía detallada
```

---

## 📖 ORDEN DE LECTURA RECOMENDADO

1. **📄 README.md** (este archivo) - Empezar aquí
2. **📊 RESUMEN.md** - Ver todas las funcionalidades
3. **📝 INSTRUCCIONES.md** - Guía de integración
4. **🧪 datos-prueba.js** - Probar con ejemplos

---

## ⚡ EJEMPLOS DE USO REAL

### Caso 1: Detectar Productos con Baja Utilidad
```javascript
// 1. Generar Reporte de Utilidades
// 2. Identificar productos en rojo (<15%)
// 3. Opciones:
//    a) Subir el precio al público
//    b) Negociar mejor costo con proveedor
//    c) Buscar proveedor alternativo
```

### Caso 2: Comparar Proveedores
```javascript
// 1. Generar Comparativa de Proveedores
// 2. Ver ranking por utilidad
// 3. Decisiones:
//    - Aumentar compras al mejor proveedor
//    - Renegociar con proveedores de bajo margen
//    - Diversificar riesgo entre top 2
```

### Caso 3: Establecer Política de Precios
```javascript
// 1. Decidir margen mínimo (ej: 25%)
// 2. Revisar productos que no cumplen
// 3. Ajustar precios o costos
// 4. Monitorear trimestralmente
```

---

## 🆘 AYUDA Y SOPORTE

### Problemas Comunes

**No veo la vista de Proveedores**
→ Verifica que agregaste el navigation item en el sidebar

**Los cálculos no se actualizan**
→ Revisa que agregaste los event listeners

**Error "función no definida"**
→ Asegúrate de cargar suppliers-module.js **después** de app.js

Ver más en la sección de [Solución de Problemas](INSTRUCCIONES.md#-solución-de-problemas-comunes) en INSTRUCCIONES.md

---

## 🔄 ACTUALIZACIONES FUTURAS

Posibles mejoras a considerar:

- [ ] Gráficos interactivos con Chart.js
- [ ] Exportar a Excel/PDF
- [ ] Historial de precios
- [ ] Alertas automáticas de margen bajo
- [ ] Multi-moneda
- [ ] Descuentos por volumen
- [ ] Integración con facturación

---

## 📜 LICENCIA

Este módulo es una extensión del Sistema de Inventario para Refaccionaria Smip.
Consulta el archivo LICENSE del proyecto principal.

---

## 👥 CRÉDITOS

**Desarrollado para**: Refaccionaria Smip  
**Fecha**: Noviembre 2025  
**Versión**: 1.0.1

---

## 🎉 ¡COMIENZA AHORA!

1. **Lee el [RESUMEN.md](RESUMEN.md)** para ver todas las funcionalidades
2. **Sigue [INSTRUCCIONES.md](INSTRUCCIONES.md)** para integrar
3. **Usa datos-prueba.js** para probar

**Tiempo total estimado**: 📅 30-45 minutos  
**Nivel de dificultad**: ⭐⭐ Intermedio

---

## 📞 CONTACTO

Para dudas sobre la integración, consulta primero:
1. Este README
2. INSTRUCCIONES.md (sección de solución de problemas)
3. Comentarios en el código fuente

---

**¡Éxito con tu nuevo sistema de gestión de proveedores y utilidades! 🚀**

---

<div align="center">

**Hecho con ❤️ para Refaccionaria Smip**

[📊 Ver Resumen](RESUMEN.md) | [📖 Guía de Integración](INSTRUCCIONES.md) | [🧪 Datos de Prueba](datos-prueba.js)

</div>
