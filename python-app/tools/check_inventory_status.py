
import sys
import os
import json
from datetime import datetime

# Add parent directory to path to import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api import reports

def print_header(title):
    print("\n" + "="*60)
    print(f" {title.upper()}")
    print("="*60)

def format_currency(value):
    return f"${value:,.2f}"

def run_inventory_check():
    print(f"Generando Reporte de Estatus Global de Inventario")
    print(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Obtener Reporte de Inventario
    res = reports.get_inventory_report()
    
    if not res.get('success'):
        print(f"Error al generar reporte: {res.get('error')}")
        return

    data = res['data']
    summary = data['summary']
    
    # 2. Resumen General
    print_header("Resumen General")
    print(f"Total de Productos:      {summary['total_products']}")
    print(f"Unidades en Stock:       {summary['total_units']}")
    print(f"Valor Total (Costo):     {format_currency(summary['total_cost_value'] or 0)}")
    print(f"Valor Total (Venta):     {format_currency(summary['total_sale_value'] or 0)}")
    print(f"Productos Agotados:      {summary['out_of_stock']}")
    print(f"Stock Bajo (Alerta):     {summary['low_stock']}")

    # 3. Desglose por Categoría
    print_header("Desglose por Categoría")
    print(f"{'Categoría':<25} | {'Productos':<10} | {'Stock':<10} | {'Valor (Costo)':<15}")
    print("-" * 68)
    
    for cat in data['by_category']:
        print(f"{cat['category']:<25} | {cat['product_count']:<10} | {cat['total_stock']:<10} | {format_currency(cat['category_value'] or 0):<15}")

    # 4. Alertas de Stock Bajo (Top 10)
    if data['low_stock_products']:
        print_header("ALERTA: Productos con Stock Bajo (Top 10)")
        print(f"{'Código':<15} | {'Nombre':<30} | {'Stock':<8} | {'Min':<8}")
        print("-" * 68)
        
        for p in data['low_stock_products'][:10]:
            print(f"{p['code']:<15} | {p['name'][:30]:<30} | {p['stock']:<8} | {p['min_stock']:<8}")
            
        if len(data['low_stock_products']) > 10:
            print(f"... y {len(data['low_stock_products']) - 10} más.")
    else:
        print("\n[OK] No hay productos con stock bajo.")

    # 5. Productos Inactivos (Sin movimiento > 30 días)
    if data['inactive_products']:
        print_header("Productos Inactivos (> 30 días sin mov.)")
        print(f"{'Código':<15} | {'Nombre':<30} | {'Stock':<8} | {'Último Mov.':<12}")
        print("-" * 72)
        
        for p in data['inactive_products'][:5]:
            last_mov = p['last_movement'] if p['last_movement'] else 'Nunca'
            print(f"{p['code']:<15} | {p['name'][:30]:<30} | {p['stock']:<8} | {last_mov:<12}")

if __name__ == "__main__":
    run_inventory_check()
