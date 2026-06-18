# =============================================================================
# API DE COMPRAS / ENTRADAS DE INVENTARIO
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime

def get_all(filters=None):
    """Obtener todas las compras con filtros opcionales"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT p.*, 
                   (SELECT COUNT(*) FROM purchase_items WHERE purchase_id = p.id) as items_count
            FROM purchases p
            WHERE 1=1
        '''
        params = []
        
        if filters:
            if filters.get('supplier_id'):
                query += ' AND p.supplier_id = ?'
                params.append(filters['supplier_id'])
            if filters.get('start_date'):
                query += ' AND DATE(p.purchase_date) >= ?'
                params.append(filters['start_date'])
            if filters.get('end_date'):
                query += ' AND DATE(p.purchase_date) <= ?'
                params.append(filters['end_date'])
            if filters.get('status'):
                query += ' AND p.status = ?'
                params.append(filters['status'])
        
        query += ' ORDER BY p.created_at DESC'
        
        if filters and filters.get('limit'):
            query += ' LIMIT ?'
            params.append(filters['limit'])
        
        cursor.execute(query, params)
        purchases = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': purchases}

def get_by_id(purchase_id):
    """Obtener una compra por ID con sus items"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener cabecera de la compra
        cursor.execute('SELECT * FROM purchases WHERE id = ?', (purchase_id,))
        purchase = dict_from_row(cursor.fetchone())
        
        if not purchase:
            return {'success': False, 'error': 'Compra no encontrada'}
        
        # Obtener items de la compra
        cursor.execute('''
            SELECT pi.*, p.code as current_code, p.name as current_name
            FROM purchase_items pi
            LEFT JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = ?
        ''', (purchase_id,))
        items = [dict_from_row(row) for row in cursor.fetchall()]
        
        purchase['items'] = items
        
        return {'success': True, 'data': purchase}

def create(purchase_data):
    """Crear una compra completa con múltiples productos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        supplier_id = purchase_data.get('supplier_id')
        supplier_name = purchase_data.get('supplier_name', '')
        folio = purchase_data.get('folio', '')
        purchase_date = purchase_data.get('purchase_date', datetime.now().strftime('%Y-%m-%d'))
        notes = purchase_data.get('notes', '')
        user = purchase_data.get('user', 'Sistema')
        items = purchase_data.get('items', [])
        
        if not items:
            return {'success': False, 'error': 'Debe agregar al menos un producto'}
        
        # Calcular total
        total = 0
        for item in items:
            item['subtotal'] = float(item.get('quantity', 0)) * float(item.get('unit_cost', 0))
            total += item['subtotal']
        
        try:
            # 1. Insertar cabecera de compra
            cursor.execute('''
                INSERT INTO purchases (folio, supplier_id, supplier_name, purchase_date, total, notes, user)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (folio, supplier_id, supplier_name, purchase_date, total, notes, user))
            
            purchase_id = cursor.lastrowid
            
            # 2. Procesar cada item
            products_updated = []
            for item in items:
                product_id = item.get('product_id')
                quantity = int(item.get('quantity', 0))
                unit_cost = float(item.get('unit_cost', 0))
                subtotal = item.get('subtotal', 0)
                
                # Obtener datos del producto
                cursor.execute('SELECT id, code, name, stock, purchase_cost FROM products WHERE id = ?', (product_id,))
                product = cursor.fetchone()
                
                if not product:
                    conn.rollback()
                    return {'success': False, 'error': f'Producto ID {product_id} no encontrado'}
                
                product_code = product['code']
                product_name = product['name']
                current_stock = product['stock'] or 0
                new_stock = current_stock + quantity
                
                # 2.1 Insertar item de compra
                cursor.execute('''
                    INSERT INTO purchase_items (purchase_id, product_id, product_code, product_name, quantity, unit_cost, subtotal)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (purchase_id, product_id, product_code, product_name, quantity, unit_cost, subtotal))
                
                # 2.2 Crear movimiento de entrada
                cursor.execute('''
                    INSERT INTO movements (product_id, type, quantity, reason, reference, purchase_id, unit_cost, user, notes)
                    VALUES (?, 'entry', ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    product_id,
                    quantity,
                    f'Compra a {supplier_name}',
                    folio,
                    purchase_id,
                    unit_cost,
                    user,
                    notes
                ))
                
                # 2.3 Actualizar stock y costo del producto
                cursor.execute('''
                    UPDATE products 
                    SET stock = ?, purchase_cost = ?, updated_at = ?
                    WHERE id = ?
                ''', (new_stock, unit_cost, datetime.now().isoformat(), product_id))
                
                products_updated.append({
                    'product_id': product_id,
                    'code': product_code,
                    'name': product_name,
                    'previous_stock': current_stock,
                    'new_stock': new_stock,
                    'quantity_added': quantity,
                    'unit_cost': unit_cost
                })
            
            # 3. Actualizar estadísticas del proveedor (si existe)
            if supplier_id:
                cursor.execute('''
                    UPDATE suppliers 
                    SET updated_at = ?
                    WHERE id = ?
                ''', (datetime.now().isoformat(), supplier_id))
            
            conn.commit()
            
            return {
                'success': True,
                'purchase_id': purchase_id,
                'total': total,
                'items_count': len(items),
                'products_updated': products_updated,
                'message': f'Compra registrada: {len(items)} productos, Total: ${total:.2f}'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def cancel(purchase_id, reason=''):
    """Cancelar una compra y revertir stock"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verificar que existe y no está cancelada
        cursor.execute('SELECT * FROM purchases WHERE id = ?', (purchase_id,))
        purchase = cursor.fetchone()
        
        if not purchase:
            return {'success': False, 'error': 'Compra no encontrada'}
        
        if purchase['status'] == 'cancelled':
            return {'success': False, 'error': 'La compra ya está cancelada'}
        
        try:
            # Obtener items de la compra
            cursor.execute('SELECT * FROM purchase_items WHERE purchase_id = ?', (purchase_id,))
            items = cursor.fetchall()
            
            # Revertir stock de cada producto
            for item in items:
                product_id = item['product_id']
                quantity = item['quantity']
                
                cursor.execute('SELECT stock FROM products WHERE id = ?', (product_id,))
                product = cursor.fetchone()
                
                if product:
                    new_stock = max(0, (product['stock'] or 0) - quantity)
                    cursor.execute('''
                        UPDATE products SET stock = ?, updated_at = ?
                        WHERE id = ?
                    ''', (new_stock, datetime.now().isoformat(), product_id))
                    
                    # Registrar movimiento de ajuste negativo
                    cursor.execute('''
                        INSERT INTO movements (product_id, type, quantity, reason, reference, user, notes)
                        VALUES (?, 'adjustment', ?, ?, ?, ?, ?)
                    ''', (
                        product_id,
                        -quantity,
                        'Cancelación de compra',
                        f'Compra #{purchase_id}',
                        'Sistema',
                        reason
                    ))
            
            # Marcar compra como cancelada
            cursor.execute('''
                UPDATE purchases SET status = 'cancelled', notes = ?
                WHERE id = ?
            ''', (f'CANCELADA: {reason}', purchase_id))
            
            conn.commit()
            
            return {
                'success': True,
                'message': f'Compra #{purchase_id} cancelada. Stock revertido para {len(items)} productos.'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def get_supplier_purchases(supplier_id, limit=50):
    """Obtener historial de compras a un proveedor"""
    return get_all({'supplier_id': supplier_id, 'limit': limit})

def get_summary(start_date=None, end_date=None):
    """Obtener resumen de compras por período"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                COUNT(*) as total_purchases,
                COALESCE(SUM(total), 0) as total_amount,
                COUNT(DISTINCT supplier_id) as suppliers_count
            FROM purchases
            WHERE status = 'completed'
        '''
        params = []
        
        if start_date:
            query += ' AND DATE(purchase_date) >= ?'
            params.append(start_date)
        if end_date:
            query += ' AND DATE(purchase_date) <= ?'
            params.append(end_date)
        
        cursor.execute(query, params)
        row = cursor.fetchone()
        
        summary = {
            'total_purchases': row['total_purchases'] or 0,
            'total_amount': row['total_amount'] or 0,
            'suppliers_count': row['suppliers_count'] or 0
        }
        
        return {'success': True, 'data': summary}
