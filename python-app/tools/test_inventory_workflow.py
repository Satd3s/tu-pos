
import sys
import os
import json

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import products, movements

def print_result(step, result):
    print(f"\n--- {step} ---")
    if result.get('success'):
        print(f"SUCCESS: {json.dumps(result, default=str, indent=2)}")
        return True
    else:
        print(f"FAILED: {result.get('error')}")
        return False

def run_test():
    print("Iniciando prueba de flujo de inventario...")
    
    test_code = 'TEST-INV-001'
    
    # 0. Limpieza previa
    print("\n[0] Limpieza previa...")
    existing = products.get_by_code(test_code)
    if existing.get('success'):
        print(f"Producto existente encontrado (ID: {existing['data']['id']}), eliminando...")
        products.delete(existing['data']['id'])
    
    # 1. Crear Producto
    product_data = {
        'code': test_code,
        'name': 'Producto de Prueba Automática',
        'description': 'Producto para verificar flujo de inventario',
        'category': 'Pruebas',
        'brand': 'TestBrand',
        'stock': 0,
        'min_stock': 10,
        'max_stock': 100,
        'purchase_cost': 50.0,
        'public_price': 100.0,
        'unit': 'pieza'
    }
    
    if not print_result("Crear Producto", products.save(product_data)):
        return
        
    # Obtener ID del producto creado
    res = products.get_by_code(test_code)
    if not res.get('success'):
        print("Error: No se pudo recuperar el producto creado")
        return
    
    product_id = res['data']['id']
    print(f"Producto creado con ID: {product_id}")
    
    # 2. Agregar Stock (Entrada)
    print(f"\n[2] Agregando stock (50 unidades)...")
    entry_data = {
        'product_id': product_id,
        'type': 'entry',
        'quantity': 50,
        'reason': 'Compra inicial',
        'reference': 'FACT-001',
        'user': 'Tester'
    }
    if not print_result("Movimiento de Entrada", movements.create(entry_data)):
        return

    # 3. Verificar Stock
    res = products.get_by_id(product_id)
    if res['data']['stock'] != 50:
        print(f"ERROR: Stock esperado 50, actual {res['data']['stock']}")
        return
    print("Stock verificado: 50")
    
    # 4. Simular Venta (Salida)
    print(f"\n[4] Simulando salida (5 unidades)...")
    exit_data = {
        'product_id': product_id,
        'type': 'exit',
        'quantity': 5,
        'reason': 'Venta de prueba',
        'reference': 'TICKET-001',
        'user': 'Tester'
    }
    if not print_result("Movimiento de Salida", movements.create(exit_data)):
        return

    # Stock debe ser 45
    res = products.get_by_id(product_id)
    if res['data']['stock'] != 45:
        print(f"ERROR: Stock esperado 45, actual {res['data']['stock']}")
        return
    print("Stock verificado: 45")

    # 5. Probar Stock Insuficiente
    print(f"\n[5] Probando salida excesiva (100 unidades)...")
    fail_data = {
        'product_id': product_id,
        'type': 'exit',
        'quantity': 100,
        'reason': 'Fallo esperado'
    }
    res_fail = movements.create(fail_data)
    if not res_fail.get('success'):
        print(f"SUCCESS: El sistema bloqueó correctamente la salida excesiva: {res_fail.get('error')}")
    else:
        print("FAILED: El sistema permitió stock negativo!")
        return

    # 6. Ajuste de Inventario (Reset a 5 - Bajo Stock)
    print(f"\n[6] Ajustando inventario a 5 (para probar bajo stock)...")
    adj_data = {
        'product_id': product_id,
        'type': 'adjustment',
        'quantity': 5,
        'reason': 'Ajuste manual',
        'user': 'Admin'
    }
    if not print_result("Ajuste de Inventario", movements.create(adj_data)):
        return

    # 7. Verificar Reporte de Bajo Stock
    print(f"\n[7] Verificando reporte de bajo stock...")
    low_stock = products.get_low_stock()
    found = any(p['id'] == product_id for p in low_stock['data'])
    if found:
        print("SUCCESS: El producto aparece correctamente en reporte de stock bajo")
    else:
        print("FAILED: El producto NO aparece en stock bajo (y debería)")

    # 8. Limpieza Final
    print("\n[8] Limpiando prueba...")
    products.delete(product_id)
    print("Producto eliminado.")
    
    print("\n=== PRUEBA COMPLETADA EXITOSAMENTE ===")

if __name__ == "__main__":
    run_test()
