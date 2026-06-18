// ============================================
// DATOS DE PRUEBA PARA EL SISTEMA DE INVENTARIO
// ============================================ 
// Este archivo contiene datos de ejemplo para probar
// el sistema de proveedores y utilidades

// Ejecutar en la consola del navegador (F12) para cargar datos de prueba

// PROVEEDORES DE PRUEBA
const testSuppliers = [
    {
        id: 'supp_test_1',
        code: 'PROV001',
        name: 'Auto Partes México SA de CV',
        contact: 'Juan Pérez Gómez',
        phone: '555-1234-5678',
        email: 'ventas@autopartesmx.com',
        address: 'Av. Industrial 123, Col. Granjas Valle, CDMX, CP 12345',
        active: true
    },
    {
        id: 'supp_test_2',
        code: 'PROV002',
        name: 'Distribuidora Nacional de Refacciones',
        contact: 'María González López',
        phone: '555-9876-5432',
        email: 'contacto@distnacional.com',
        address: 'Calle Comercio 456, Col. Industrial, Guadalajara, JAL, CP 44100',
        active: true
    },
    {
        id: 'supp_test_3',
        code: 'PROV003',
        name: 'Refacciones del Norte SA',
        contact: 'Carlos Rodríguez Martínez',
        phone: '555-2468-1357',
        email: 'ventas@refacnorte.com',
        address: 'Blvd. Fundidora 789, Col. Obrera, Monterrey, NL, CP 64000',
        active: true
    },
    {
        id: 'supp_test_4',
        code: 'PROV004',
        name: 'Importadora de Autopartes del Bajío',
        contact: 'Ana Martínez Sánchez',
        phone: '555-3691-2580',
        email: 'importaciones@autopbajio.com',
        address: 'Av. Principal 321, León, GTO, CP 37000',
        active: true
    }
];

// PRODUCTOS DE PRUEBA CON DIFERENTES MÁRGENES DE UTILIDAD
const testProducts = [
    // UTILIDAD ALTA (>= 30%)
    {
        id: 'prod_test_1',
        code: 'ACC001',
        partNumber: '5W30-SINT-1L',
        name: 'Aceite Motor Sintético 5W-30 1L',
        category: 'Lubricantes',
        supplierId: 'supp_test_1',
        cost: 180.00,
        publicPrice: 299.99,
        stock: 45,
        minStock: 10,
        description: 'Aceite sintético premium para motor, ideal para vehículos modernos'
    },
    {
        id: 'prod_test_2',
        code: 'FIL001',
        partNumber: 'FLT-OIL-8945',
        name: 'Filtro de Aceite Universal',
        category: 'Filtros',
        supplierId: 'supp_test_1',
        cost: 45.00,
        publicPrice: 89.50,
        stock: 120,
        minStock: 20,
        description: 'Filtro de aceite de alta eficiencia, compatible con múltiples modelos'
    },
    {
        id: 'prod_test_3',
        code: 'BUJ001',
        partNumber: 'PLT-BUJ-4567',
        name: 'Bujías Platinum (Juego 4 pzas)',
        category: 'Sistema Eléctrico',
        supplierId: 'supp_test_2',
        cost: 250.00,
        publicPrice: 450.00,
        stock: 60,
        minStock: 15,
        description: 'Bujías de platino de larga duración, mayor eficiencia en combustión'
    },

    // UTILIDAD MEDIA (15-29%)
    {
        id: 'prod_test_4',
        code: 'BAL001',
        partNumber: 'BRK-CER-FR',
        name: 'Balatas Cerámicas Delanteras',
        category: 'Frenos',
        supplierId: 'supp_test_2',
        cost: 380.00,
        publicPrice: 499.00,
        stock: 35,
        minStock: 12,
        description: 'Balatas cerámicas de alto rendimiento, menos polvo y ruido'
    },
    {
        id: 'prod_test_5',
        code: 'AMO001',
        partNumber: 'SHK-HD-FR',
        name: 'Amortiguador Delantero Heavy Duty',
        category: 'Suspensión',
        supplierId: 'supp_test_3',
        cost: 650.00,
        publicPrice: 849.00,
        stock: 18,
        minStock: 8,
        description: 'Amortiguador de alta resistencia para trabajo pesado'
    },
    {
        id: 'prod_test_6',
        code: 'FIL002',
        partNumber: 'FLT-AIR-7890',
        name: 'Filtro de Aire de Alto Flujo',
        category: 'Filtros',
        supplierId: 'supp_test_1',
        cost: 120.00,
        publicPrice: 159.00,
        stock: 85,
        minStock: 20,
        description: 'Filtro de aire de alto rendimiento, mejora la eficiencia del motor'
    },

    // UTILIDAD BAJA (< 15%) - Para análisis
    {
        id: 'prod_test_7',
        code: 'BAT001',
        partNumber: 'BTR-12V-75AH',
        name: 'Batería 12V 75AH',
        category: 'Sistema Eléctrico',
        supplierId: 'supp_test_3',
        cost: 1450.00,
        publicPrice: 1599.00,
        stock: 12,
        minStock: 5,
        description: 'Batería libre de mantenimiento, alta capacidad de arranque'
    },
    {
        id: 'prod_test_8',
        code: 'LLT001',
        partNumber: 'TRE-RAD-205/55R16',
        name: 'Llanta Radial 205/55 R16',
        category: 'Llantas',
        supplierId: 'supp_test_4',
        cost: 950.00,
        publicPrice: 1099.00,
        stock: 24,
        minStock: 8,
        description: 'Llanta all-season de alto agarre y larga duración'
    },

    // PRODUCTOS ADICIONALES
    {
        id: 'prod_test_9',
        code: 'LIQ001',
        partNumber: 'BRK-FLD-DOT4',
        name: 'Líquido de Frenos DOT 4 500ml',
        category: 'Líquidos',
        supplierId: 'supp_test_1',
        cost: 65.00,
        publicPrice: 119.00,
        stock: 95,
        minStock: 25,
        description: 'Líquido de frenos sintético de alto punto de ebullición'
    },
    {
        id: 'prod_test_10',
        code: 'FIL003',
        partNumber: 'FLT-FUEL-4521',
        name: 'Filtro de Combustible',
        category: 'Filtros',
        supplierId: 'supp_test_2',
        cost: 55.00,
        publicPrice: 95.00,
        stock: 110,
        minStock: 30,
        description: 'Filtro de combustible de alta eficiencia'
    },
    {
        id: 'prod_test_11',
        code: 'BAL002',
        partNumber: 'BRK-STD-RR',
        name: 'Balatas Estándar Traseras',
        category: 'Frenos',
        supplierId: 'supp_test_2',
        cost: 280.00,
        publicPrice: 449.00,
        stock: 42,
        minStock: 15,
        description: 'Balatas traseras de calidad OEM'
    },
    {
        id: 'prod_test_12',
        code: 'ACC002',
        partNumber: '10W40-CONV-4L',
        name: 'Aceite Motor Convencional 10W-40 4L',
        category: 'Lubricantes',
        supplierId: 'supp_test_1',
        cost: 240.00,
        publicPrice: 379.00,
        stock: 68,
        minStock: 20,
        description: 'Aceite convencional multigrado para motores a gasolina'
    }
];

// FUNCIÓN PARA CARGAR LOS DATOS DE PRUEBA
function cargarDatosPrueba() {
    console.log('🔄 Cargando datos de prueba...');

    // Guardar proveedores
    const currentSuppliers = StorageManager.get('suppliers', []);
    const mergedSuppliers = [...currentSuppliers];

    testSuppliers.forEach(testSupp => {
        const exists = mergedSuppliers.find(s => s.id === testSupp.id);
        if (!exists) {
            mergedSuppliers.push(testSupp);
        }
    });

    StorageManager.set('suppliers', mergedSuppliers);
    console.log(`✅ ${testSuppliers.length} proveedores agregados`);

    // Guardar productos
    const currentProducts = StorageManager.get('products', []);
    const mergedProducts = [...currentProducts];

    testProducts.forEach(testProd => {
        const exists = mergedProducts.find(p => p.id === testProd.id);
        if (!exists) {
            mergedProducts.push(testProd);
        }
    });

    StorageManager.set('products', mergedProducts);
    console.log(`✅ ${testProducts.length} productos agregados`);

    console.log('✨ ¡Datos de prueba cargados exitosamente!');
    console.log('🔄 Recarga la página para ver los cambios');

    // Mostrar resumen
    console.log('\n📊 RESUMEN DE UTILIDADES:');
    testProducts.forEach(p => {
        const utility = ((p.publicPrice - p.cost) / p.cost * 100).toFixed(1);
        const emoji = utility >= 30 ? '🟢' : utility >= 15 ? '🟡' : '🔴';
        console.log(`${emoji} ${p.name}: ${utility}% utilidad`);
    });
}

// FUNCIÓN PARA LIMPIAR DATOS DE PRUEBA
function limpiarDatosPrueba() {
    console.log('🗑️ Limpiando datos de prueba...');

    const suppliers = StorageManager.get('suppliers', []);
    const filteredSuppliers = suppliers.filter(s => !s.id.startsWith('supp_test_'));
    StorageManager.set('suppliers', filteredSuppliers);

    const products = StorageManager.get('products', []);
    const filteredProducts = products.filter(p => !p.id.startsWith('prod_test_'));
    StorageManager.set('products', filteredProducts);

    console.log('✅ Datos de prueba eliminados');
    console.log('🔄 Recarga la página para ver los cambios');
}

// FUNCIÓN PARA ANALIZAR UTILIDADES
function analizarUtilidades() {
    const products = StorageManager.get('products', []);
    const suppliers = StorageManager.get('suppliers', []);

    console.log('\n📊 ANÁLISIS DE UTILIDADES\n');
    console.log('='.repeat(80));

    // Calcular totales
    let totalCost = 0;
    let totalValue = 0;
    const bySupplier = {};

    products.forEach(p => {
        const cost = (p.cost || 0) * p.stock;
        const value = (p.publicPrice || p.price || 0) * p.stock;

        totalCost += cost;
        totalValue += value;

        const suppId = p.supplierId || 'sin_proveedor';
        if (!bySupplier[suppId]) {
            bySupplier[suppId] = { cost: 0, value: 0, products: 0 };
        }
        bySupplier[suppId].cost += cost;
        bySupplier[suppId].value += value;
        bySupplier[suppId].products++;
    });

    const totalProfit = totalValue - totalCost;
    const profitPercent = ((totalProfit / totalCost) * 100).toFixed(2);

    console.log(`💰 Costo Total:      $${totalCost.toFixed(2)}`);
    console.log(`💵 Valor Total:      $${totalValue.toFixed(2)}`);
    console.log(`✅ Utilidad Total:   $${totalProfit.toFixed(2)}`);
    console.log(`📈 Margen:           ${profitPercent}%`);
    console.log('\n' + '='.repeat(80));
    console.log('\n📦 POR PROVEEDOR:\n');

    Object.entries(bySupplier).forEach(([suppId, data]) => {
        const supplier = suppliers.find(s => s.id === suppId);
        const name = supplier ? supplier.name : 'Sin Proveedor';
        const profit = data.value - data.cost;
        const margin = ((profit / data.cost) * 100).toFixed(1);

        console.log(`\n${name}:`);
        console.log(`  Productos: ${data.products}`);
        console.log(`  Costo:     $${data.cost.toFixed(2)}`);
        console.log(`  Valor:     $${data.value.toFixed(2)}`);
        console.log(`  Utilidad:  $${profit.toFixed(2)} (${margin}%)`);
    });

    console.log('\n' + '='.repeat(80));
}

// Instrucciones
console.log('%c📦 DATOS DE PRUEBA DISPONIBLES', 'font-size: 16px; font-weight: bold; color: #3b82f6');
console.log('\nFunciones disponibles:');
console.log('  cargarDatosPrueba()   - Cargar datos de ejemplo');
console.log('  limpiarDatosPrueba()  - Eliminar datos de ejemplo');
console.log('  analizarUtilidades()  - Ver análisis de utilidades');
console.log('\nEjecutar en la consola del navegador (F12)');
