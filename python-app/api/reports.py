# =============================================================================
# API DE REPORTES
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime, date, timedelta

def get_dashboard_stats():
    """Obtener estadísticas para el dashboard"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        today = date.today().isoformat()
        
        stats = {}
        
        # Total de productos
        cursor.execute('SELECT COUNT(*) as count FROM products WHERE active = 1')
        stats['total_products'] = cursor.fetchone()['count']
        
        # Valor del inventario
        cursor.execute('SELECT SUM(stock * purchase_cost) as value FROM products WHERE active = 1')
        row = cursor.fetchone()
        stats['inventory_value'] = row['value'] or 0
        
        # Productos con stock bajo (<= stock mínimo)
        cursor.execute('SELECT COUNT(*) as count FROM products WHERE active = 1 AND stock <= min_stock')
        stats['low_stock_count'] = cursor.fetchone()['count']
        
        # Productos sin stock (<= 0)
        cursor.execute('SELECT COUNT(*) as count FROM products WHERE active = 1 AND stock <= 0')
        stats['out_of_stock'] = cursor.fetchone()['count']
        
        # Ventas de hoy
        cursor.execute('''
            SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total 
            FROM sales 
            WHERE DATE(created_at) = ? AND status = 'completed'
        ''', (today,))
        row = cursor.fetchone()
        stats['today_sales_count'] = row['count']
        stats['today_sales_total'] = row['total']
        
        # Utilidad de hoy (Venta - Costo)
        cursor.execute('''
            SELECT SUM(si.subtotal - (si.quantity * p.purchase_cost)) as profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE DATE(s.created_at) = ? AND s.status = 'completed'
        ''', (today,))
        stats['today_profit'] = cursor.fetchone()['profit'] or 0

        # Créditos pendientes (Cuentas por cobrar)
        try:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
            if cursor.fetchone():
                cursor.execute('SELECT SUM(current_balance) as total FROM customers WHERE active = 1')
                stats['credit_pending'] = cursor.fetchone()['total'] or 0
            else:
                stats['credit_pending'] = 0
        except:
            stats['credit_pending'] = 0

        # Productos más vendidos HOY
        cursor.execute('''
            SELECT 
                si.product_name as name, 
                SUM(si.quantity) as quantity
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) = ? AND s.status = 'completed'
            GROUP BY si.product_id
            ORDER BY quantity DESC
            LIMIT 5
        ''', (today,))
        stats['top_selling'] = [dict_from_row(row) for row in cursor.fetchall()]

        # Fallback: Si no hay ventas hoy, mostrar del último mes para no ver el dashboard vacío
        if not stats['top_selling']:
             first_day = date.today().replace(day=1).isoformat()
             cursor.execute('''
                SELECT 
                    si.product_name as name, 
                    SUM(si.quantity) as quantity
                FROM sale_items si
                JOIN sales s ON si.sale_id = s.id
                WHERE DATE(s.created_at) >= ? AND s.status = 'completed'
                GROUP BY si.product_id
                ORDER BY quantity DESC
                LIMIT 5
            ''', (first_day,))
             stats['top_selling'] = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': stats}

def get_sales_report(start_date, end_date):
    """Generar reporte de ventas por período"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Resumen general
        cursor.execute('''
            SELECT 
                COUNT(*) as total_sales,
                COALESCE(SUM(total), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total ELSE 0 END), 0) as cash_total,
                COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total ELSE 0 END), 0) as card_total,
                COALESCE(SUM(CASE WHEN payment_method = 'transfer' THEN total ELSE 0 END), 0) as transfer_total,
                COALESCE(AVG(total), 0) as average_sale
            FROM sales
            WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
        ''', (start_date, end_date))
        summary = dict_from_row(cursor.fetchone())
        
        # Ventas por día
        cursor.execute('''
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as sales_count,
                SUM(total) as daily_total
            FROM sales
            WHERE DATE(created_at) BETWEEN ? AND ? AND status = 'completed'
            GROUP BY DATE(created_at)
            ORDER BY date
        ''', (start_date, end_date))
        daily_sales = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Productos más vendidos
        cursor.execute('''
            SELECT 
                si.product_code,
                si.product_name,
                SUM(si.quantity) as total_quantity,
                SUM(si.subtotal) as total_revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE DATE(s.created_at) BETWEEN ? AND ? AND s.status = 'completed'
            GROUP BY si.product_id
            ORDER BY total_quantity DESC
            LIMIT 20
        ''', (start_date, end_date))
        top_products = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {
            'success': True,
            'data': {
                'period': {'start': start_date, 'end': end_date},
                'summary': summary,
                'daily_sales': daily_sales,
                'top_products': top_products
            }
        }

def get_inventory_report():
    """Generar reporte de inventario"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Resumen general
        cursor.execute('''
            SELECT 
                COUNT(*) as total_products,
                SUM(stock) as total_units,
                SUM(stock * purchase_cost) as total_cost_value,
                SUM(stock * public_price) as total_sale_value,
                SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) as out_of_stock,
                SUM(CASE WHEN stock > 0 AND stock <= min_stock THEN 1 ELSE 0 END) as low_stock
            FROM products
            WHERE active = 1
        ''')
        summary = dict_from_row(cursor.fetchone())
        
        # Por categoría
        cursor.execute('''
            SELECT 
                COALESCE(category, 'Sin categoría') as category,
                COUNT(*) as product_count,
                SUM(stock) as total_stock,
                SUM(stock * purchase_cost) as category_value
            FROM products
            WHERE active = 1
            GROUP BY category
            ORDER BY category_value DESC
        ''')
        by_category = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Productos con stock bajo
        cursor.execute('''
            SELECT code, name, stock, min_stock, category
            FROM products
            WHERE active = 1 AND stock <= min_stock
            ORDER BY stock ASC
        ''')
        low_stock_products = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Productos sin movimiento (últimos 30 días)
        thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
        cursor.execute('''
            SELECT p.code, p.name, p.stock, p.category, MAX(m.created_at) as last_movement
            FROM products p
            LEFT JOIN movements m ON p.id = m.product_id
            WHERE p.active = 1
            GROUP BY p.id
            HAVING MAX(m.created_at) < ? OR MAX(m.created_at) IS NULL
            ORDER BY last_movement ASC
            LIMIT 20
        ''', (thirty_days_ago,))
        inactive_products = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {
            'success': True,
            'data': {
                'summary': summary,
                'by_category': by_category,
                'low_stock_products': low_stock_products,
                'inactive_products': inactive_products
            }
        }

def get_movements_report(start_date, end_date):
    """Generar reporte de movimientos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Resumen por tipo
        cursor.execute('''
            SELECT 
                type,
                COUNT(*) as count,
                SUM(quantity) as total_quantity
            FROM movements
            WHERE DATE(created_at) BETWEEN ? AND ?
            GROUP BY type
        ''', (start_date, end_date))
        
        by_type = {}
        for row in cursor.fetchall():
            by_type[row['type']] = {
                'count': row['count'],
                'quantity': row['total_quantity']
            }
        
        # Top productos con más movimientos
        cursor.execute('''
            SELECT 
                p.code,
                p.name,
                COUNT(*) as movement_count,
                SUM(CASE WHEN m.type = 'entry' THEN m.quantity ELSE 0 END) as entries,
                SUM(CASE WHEN m.type = 'exit' THEN m.quantity ELSE 0 END) as exits
            FROM movements m
            JOIN products p ON m.product_id = p.id
            WHERE DATE(m.created_at) BETWEEN ? AND ?
            GROUP BY m.product_id
            ORDER BY movement_count DESC
            LIMIT 20
        ''', (start_date, end_date))
        top_products = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {
            'success': True,
            'data': {
                'period': {'start': start_date, 'end': end_date},
                'by_type': by_type,
                'top_products': top_products
            }
        }

def get_profit_report():
    """Generar reporte de utilidades por producto"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener productos con su último costo de compra
        cursor.execute('''
            SELECT 
                p.id,
                p.code,
                p.name,
                p.category,
                p.stock,
                p.public_price,
                p.purchase_cost,
                (SELECT s.name FROM suppliers s 
                 JOIN purchases pu ON pu.supplier_id = s.id 
                 JOIN purchase_items pi ON pi.purchase_id = pu.id 
                 WHERE pi.product_id = p.id 
                 ORDER BY pu.purchase_date DESC LIMIT 1) as last_supplier,
                (SELECT pi.unit_cost FROM purchase_items pi 
                 JOIN purchases pu ON pi.purchase_id = pu.id 
                 WHERE pi.product_id = p.id 
                 ORDER BY pu.purchase_date DESC LIMIT 1) as last_cost
            FROM products p
            WHERE p.active = 1
            ORDER BY p.name
        ''')
        
        products = []
        total_inventory_cost = 0
        total_inventory_value = 0
        
        for row in cursor.fetchall():
            product = dict_from_row(row)
            
            # Usar el último costo de compra o el purchase_cost del producto
            cost = product['last_cost'] or product['purchase_cost'] or 0
            price = product['public_price'] or 0
            stock = product['stock'] or 0
            
            # Calcular utilidades
            unit_profit = price - cost
            profit_percent = ((unit_profit / cost) * 100) if cost > 0 else 0
            total_profit = unit_profit * stock
            
            products.append({
                'id': product['id'],
                'code': product['code'],
                'name': product['name'],
                'category': product['category'] or 'Sin categoría',
                'stock': stock,
                'cost': cost,
                'price': price,
                'supplier': product['last_supplier'] or 'Sin proveedor',
                'unit_profit': unit_profit,
                'profit_percent': profit_percent,
                'total_profit': total_profit
            })
            
            total_inventory_cost += cost * stock
            total_inventory_value += price * stock
        
        total_profit = total_inventory_value - total_inventory_cost
        overall_margin = ((total_profit / total_inventory_cost) * 100) if total_inventory_cost > 0 else 0
        
        return {
            'success': True,
            'data': {
                'summary': {
                    'total_cost': total_inventory_cost,
                    'total_value': total_inventory_value,
                    'total_profit': total_profit,
                    'overall_margin': overall_margin
                },
                'products': products
            }
        }

def get_supplier_comparison():
    """Generar comparativa de proveedores por rentabilidad"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener estadísticas por proveedor basadas en compras
        cursor.execute('''
            SELECT 
                s.id,
                s.name,
                COUNT(DISTINCT pi.product_id) as products_count,
                SUM(pi.quantity * pi.unit_cost) as total_cost,
                SUM(pi.quantity * p.public_price) as total_value,
                AVG(
                    CASE WHEN pi.unit_cost > 0 
                    THEN ((p.public_price - pi.unit_cost) / pi.unit_cost) * 100 
                    ELSE 0 END
                ) as avg_margin
            FROM suppliers s
            JOIN purchases pu ON pu.supplier_id = s.id
            JOIN purchase_items pi ON pi.purchase_id = pu.id
            JOIN products p ON pi.product_id = p.id
            WHERE s.active = 1 AND pu.status = 'completed'
            GROUP BY s.id
            ORDER BY (SUM(pi.quantity * p.public_price) - SUM(pi.quantity * pi.unit_cost)) DESC
        ''')
        
        suppliers = []
        for row in cursor.fetchall():
            supplier = dict_from_row(row)
            total_cost = supplier['total_cost'] or 0
            total_value = supplier['total_value'] or 0
            total_profit = total_value - total_cost
            
            suppliers.append({
                'id': supplier['id'],
                'name': supplier['name'],
                'products_count': supplier['products_count'] or 0,
                'total_cost': total_cost,
                'total_value': total_value,
                'total_profit': total_profit,
                'avg_margin': supplier['avg_margin'] or 0
            })
        
        # Agregar recomendaciones
        recommendations = []
        if suppliers:
            best = suppliers[0]
            recommendations.append(f"Mejor proveedor: {best['name']} - Mayor utilidad total (${best['total_profit']:.2f})")
            
            # Alertar sobre proveedores con bajo margen
            low_margin = [s for s in suppliers if s['avg_margin'] < 15]
            for s in low_margin:
                recommendations.append(f"Atención: {s['name']} - Margen promedio bajo ({s['avg_margin']:.1f}%)")
        
        return {
            'success': True,
            'data': {
                'suppliers': suppliers,
                'recommendations': recommendations
            }
        }

def get_product_sales_history(product_id):
    """Obtener historial de ventas de un producto para gráficas"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Ventas por día de los últimos 30 días
        thirty_days_ago = (date.today() - timedelta(days=30)).isoformat()
        
        cursor.execute('''
            SELECT 
                DATE(s.created_at) as date,
                SUM(si.quantity) as quantity,
                SUM(si.subtotal) as revenue
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE si.product_id = ? 
              AND s.status = 'completed'
              AND DATE(s.created_at) >= ?
            GROUP BY DATE(s.created_at)
            ORDER BY date
        ''', (product_id, thirty_days_ago))
        
        daily_sales = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Estadísticas totales de ventas
        cursor.execute('''
            SELECT 
                SUM(si.quantity) as total_sold,
                SUM(si.subtotal) as total_revenue,
                COUNT(DISTINCT s.id) as transaction_count
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE si.product_id = ? AND s.status = 'completed'
        ''', (product_id,))
        
        stats = dict_from_row(cursor.fetchone())
        
        # Últimas 10 ventas de este producto
        cursor.execute('''
            SELECT 
                s.folio,
                s.created_at,
                si.quantity,
                si.unit_price,
                si.subtotal
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE si.product_id = ? AND s.status = 'completed'
            ORDER BY s.created_at DESC
            LIMIT 10
        ''', (product_id,))
        
        recent_sales = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {
            'success': True,
            'data': {
                'daily_sales': daily_sales,
                'stats': {
                    'total_sold': stats['total_sold'] or 0,
                    'total_revenue': stats['total_revenue'] or 0,
                    'transaction_count': stats['transaction_count'] or 0
                },
                'recent_sales': recent_sales
            }
        }
