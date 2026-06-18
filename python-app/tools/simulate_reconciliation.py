
import sys
import os
import json
import random

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import products, movements

def simulate_reconciliation():
    print("=== SIMULADOR DE CONCILIACIÓN DE INVENTARIO ===\n")
    
    # 1. Crear productos de prueba
    print("[1] Creando productos de prueba...")
    test_ids = []
    
    # Producto A: Coincide (Sistema 10, Físico 10)
    p1 = products.save({'code': 'REC-001', 'name': 'Producto Coincidente', 'stock': 10, 'purchase_cost': 50})
    test_ids.append((p1['id'], 10)) # (id, fisico_real)
    
    # Producto B: Sobrante (Sistema 5, Físico 8) -> Ganancia +3
    p2 = products.save({'code': 'REC-002', 'name': 'Producto con Sobrante', 'stock': 5, 'purchase_cost': 100})
    test_ids.append((p2['id'], 8))
    
    # Producto C: Faltante (Sistema 20, Físico 15) -> Pérdida -5
    p3 = products.save({'code': 'REC-003', 'name': 'Producto con Faltante', 'stock': 20, 'purchase_cost': 200})
    test_ids.append((p3['id'], 15))
    
    print("Productos creados.\n")

    # 2. Preparar datos de conciliación (Simulando conteo con scanner)
    print("[2] Simulando conteo físico...")
    recon_items = []
    for pid, physical_qty in test_ids:
        recon_items.append({'product_id': pid, 'physical_count': physical_qty})
        
    print(f"Items contados: {len(recon_items)}\n")
    
    # 3. Ejecutar Análisis (Sin aplicar cambios)
    print("[3] Ejecurando ANÁLISIS PREVIO (Dry Run)...")
    analysis = movements.process_reconciliation(recon_items, apply=False)
    
    data = analysis['data']
    print(f"Coincidencias: {len(data['matches'])}")
    print(f"Discrepancias: {len(data['discrepancies'])}")
    print(f"Valor Diferencia Total: ${data['total_diff_value']:.2f}")
    
    print("\n--- DETALLE DE DISCREPANCIAS ENCONTRADAS ---")
    for d in data['discrepancies']:
        diff_str = f"+{d['difference']}" if d['difference'] > 0 else f"{d['difference']}"
        print(f"Producto: {d['name']} ({d['code']})")
        print(f"  Sistema: {d['system_stock']} | Físico: {d['physical_count']}")
        print(f"  Diferencia: {diff_str} unidades")
        print(f"  Impacto $: {d['value_diff']:.2f}")
        print("-" * 30)
        
    # 4. Aplicar Ajustes
    confirm = input("\n¿Desea aplicar estos ajustes automáticamente? (S/N): ")
    if confirm.lower() == 's':
        print("\n[4] Aplicando ajustes...")
        result = movements.process_reconciliation(recon_items, apply=True, user='Admin', reason='Simulacion')
        
        if result['success']:
            print(f"EXITO: Se crearon {result['data']['adjustments_created']} movimientos de ajuste.")
            
            # Verificar
            print("\n[5] Verificando stocks finales en sistema...")
            for pid, expected in test_ids:
                curr = products.get_by_id(pid)['data']
                status = "OK" if curr['stock'] == expected else "ERROR"
                print(f"{curr['code']}: Stock {curr['stock']} (Esperado: {expected}) -> {status}")
        else:
            print(f"ERROR: {result.get('error')}")

    # Limpieza
    print("\n[6] Limpiando datos de prueba...")
    for pid, _ in test_ids:
        products.delete(pid)
    print("Terminado.")

if __name__ == "__main__":
    simulate_reconciliation()
