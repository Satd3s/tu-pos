# =============================================================================
# API DE MOVIMIENTOS DE INVENTARIO
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime

def get_all(filters=None):
    """Obtener movimientos con filtros opcionales"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT m.*, p.code as product_code, p.name as product_name
            FROM movements m
            LEFT JOIN products p ON m.product_id = p.id
            WHERE 1=1
        '''
        params = []
        
        if filters:
            if filters.get('product_id'):
                query += ' AND m.product_id = ?'
                params.append(filters['product_id'])
            if filters.get('type'):
                query += ' AND m.type = ?'
                params.append(filters['type'])
            if filters.get('start_date'):
                query += ' AND DATE(m.created_at) >= ?'
                params.append(filters['start_date'])
            if filters.get('end_date'):
                query += ' AND DATE(m.created_at) <= ?'
                params.append(filters['end_date'])
        
        query += ' ORDER BY m.created_at DESC'
        
        if filters and filters.get('limit'):
            query += ' LIMIT ?'
            params.append(filters['limit'])
        
        cursor.execute(query, params)
        movements = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': movements}

def get_by_product(product_id, limit=50):
    """Obtener movimientos de un producto específico"""
    return get_all({'product_id': product_id, 'limit': limit})

def create(movement_data):
    """Crear un movimiento de inventario"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        product_id = movement_data.get('product_id')
        movement_type = movement_data.get('type')  # entry, exit, adjustment
        quantity = movement_data.get('quantity', 0)
        
        # Validaciones
        if not product_id:
            return {'success': False, 'error': 'Producto requerido'}
        if movement_type not in ['entry', 'exit', 'adjustment']:
            return {'success': False, 'error': 'Tipo de movimiento inválido'}
        if quantity <= 0:
            return {'success': False, 'error': 'La cantidad debe ser mayor a 0'}
        
        try:
            # Obtener producto actual
            cursor.execute('SELECT stock, code, name FROM products WHERE id = ?', (product_id,))
            product = cursor.fetchone()
            
            if not product:
                return {'success': False, 'error': 'Producto no encontrado'}
            
            current_stock = product['stock']
            
            # Calcular nuevo stock
            if movement_type == 'entry':
                new_stock = current_stock + quantity
            elif movement_type == 'exit':
                new_stock = current_stock - quantity
                if new_stock < 0:
                    return {'success': False, 'error': 'Stock insuficiente'}
            else:  # adjustment
                new_stock = quantity  # En ajuste, la cantidad es el nuevo stock
            
            # Insertar movimiento
            cursor.execute('''
                INSERT INTO movements (product_id, type, quantity, reason, reference, user, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (
                product_id,
                movement_type,
                quantity,
                movement_data.get('reason', ''),
                movement_data.get('reference', ''),
                movement_data.get('user', 'Sistema'),
                movement_data.get('notes', '')
            ))
            
            movement_id = cursor.lastrowid
            
            # Actualizar stock del producto
            cursor.execute('''
                UPDATE products SET stock = ?, updated_at = ?
                WHERE id = ?
            ''', (new_stock, datetime.now().isoformat(), product_id))
            
            conn.commit()
            
            return {
                'success': True,
                'id': movement_id,
                'previous_stock': current_stock,
                'new_stock': new_stock,
                'message': f'Movimiento registrado. Stock: {current_stock} → {new_stock}'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def get_summary(start_date=None, end_date=None):
    """Obtener resumen de movimientos por período"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT 
                type,
                COUNT(*) as count,
                SUM(quantity) as total_quantity
            FROM movements
            WHERE 1=1
        '''
        params = []
        
        if start_date:
            query += ' AND DATE(created_at) >= ?'
            params.append(start_date)
        if end_date:
            query += ' AND DATE(created_at) <= ?'
            params.append(end_date)
        
        query += ' GROUP BY type'
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        
        summary = {
            'entries': {'count': 0, 'quantity': 0},
            'exits': {'count': 0, 'quantity': 0},
            'adjustments': {'count': 0, 'quantity': 0}
        }
        
        for row in rows:
            if row['type'] == 'entry':
                summary['entries'] = {'count': row['count'], 'quantity': row['total_quantity']}
            elif row['type'] == 'exit':
                summary['exits'] = {'count': row['count'], 'quantity': row['total_quantity']}
            elif row['type'] == 'adjustment':
                summary['adjustments'] = {'count': row['count'], 'quantity': row['total_quantity']}
        
        return {'success': True, 'data': summary}

def process_reconciliation(items, apply=False, user='Sistema', reason='Conciliación', notes=''):
    """
    Comparar conteo físico con sistema y opcionalmente aplicar ajustes.
    
    Args:
        items: Lista de dicts {'product_id': int, 'physical_count': float}
        apply: Si es True, aplica los cambios en la BD
        user: Usuario que realiza la acción
        reason: Razón del ajuste
        
    Returns:
        Dict con resultados de discrepancias y acciones tomadas
    """
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        results = {
            'discrepancies': [],
            'matches': [],
            'adjustments_created': 0,
            'total_diff_value': 0
        }
        
        for item in items:
            product_id = item.get('product_id')
            physical_count = float(item.get('physical_count', 0))
            
            # Obtener info actual del producto
            cursor.execute('SELECT id, code, name, stock, purchase_cost FROM products WHERE id = ?', (product_id,))
            row = cursor.fetchone()
            
            if not row:
                continue
                
            product = dict_from_row(row)
            system_stock = product['stock'] or 0
            
            # Calcular diferencia
            diff = physical_count - system_stock
            
            if diff == 0:
                results['matches'].append({
                    'product_id': product_id,
                    'code': product['code'],
                    'name': product['name'],
                    'stock': system_stock
                })
            else:
                # Discrepancia encontrada
                cost = product['purchase_cost'] or 0
                diff_value = diff * cost
                
                discrepancy = {
                    'product_id': product_id,
                    'code': product['code'],
                    'name': product['name'],
                    'system_stock': system_stock,
                    'physical_count': physical_count,
                    'difference': diff,
                    'value_diff': diff_value
                }
                results['discrepancies'].append(discrepancy)
                results['total_diff_value'] += diff_value
                
                if apply:
                    # 1. Actualizar Stock
                    cursor.execute('''
                        UPDATE products SET stock = ?, updated_at = ?
                        WHERE id = ?
                    ''', (physical_count, datetime.now().isoformat(), product_id))
                    
                    # 2. Registrar Movimiento de Ajuste
                    # Nota: Guardamos el stock físico final como quantity para mantener consistencia 
                    # con la lógica de adjustments en create()
                    cursor.execute('''
                        INSERT INTO movements (product_id, type, quantity, reason, reference, user, notes)
                        VALUES (?, 'adjustment', ?, ?, ?, ?, ?)
                    ''', (
                        product_id, 
                        physical_count, 
                        reason,
                        'Auto-Ajuste',
                        user,
                        f"{notes} - Sistema: {system_stock} -> Físico: {physical_count} (Dif: {diff})"
                    ))
                    
                    results['adjustments_created'] += 1

        if apply:
            conn.commit()
            
        return {'success': True, 'data': results}

