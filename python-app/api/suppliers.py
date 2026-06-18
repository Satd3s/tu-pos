# =============================================================================
# API DE PROVEEDORES
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime

def get_all(filters=None):
    """Obtener todos los proveedores"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = '''
            SELECT s.*,
                   (SELECT COUNT(DISTINCT pi.product_id) 
                    FROM purchase_items pi 
                    JOIN purchases p ON pi.purchase_id = p.id 
                    WHERE p.supplier_id = s.id) as products_count,
                   (SELECT COALESCE(SUM(p.total), 0) 
                    FROM purchases p 
                    WHERE p.supplier_id = s.id AND p.status = 'completed') as total_purchases,
                   (SELECT MAX(p.purchase_date) 
                    FROM purchases p 
                    WHERE p.supplier_id = s.id) as last_purchase
            FROM suppliers s
            WHERE s.active = 1
        '''
        params = []
        
        if filters:
            if filters.get('search'):
                query += ' AND (s.name LIKE ? OR s.contact LIKE ? OR s.phone LIKE ?)'
                search = f'%{filters["search"]}%'
                params.extend([search, search, search])
        
        query += ' ORDER BY s.name ASC'
        
        cursor.execute(query, params)
        suppliers = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': suppliers}

def get_by_id(supplier_id):
    """Obtener un proveedor por ID"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM suppliers WHERE id = ?', (supplier_id,))
        supplier = dict_from_row(cursor.fetchone())
        
        if not supplier:
            return {'success': False, 'error': 'Proveedor no encontrado'}
        
        return {'success': True, 'data': supplier}

def save(supplier_data):
    """Guardar proveedor (crear o actualizar)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        supplier_id = supplier_data.get('id')
        name = supplier_data.get('name', '').strip()
        
        if not name:
            return {'success': False, 'error': 'El nombre es requerido'}
        
        try:
            if supplier_id:
                # Actualizar existente
                cursor.execute('''
                    UPDATE suppliers SET 
                        name = ?, contact = ?, phone = ?, email = ?, address = ?, notes = ?, updated_at = ?
                    WHERE id = ?
                ''', (
                    name,
                    supplier_data.get('contact', ''),
                    supplier_data.get('phone', ''),
                    supplier_data.get('email', ''),
                    supplier_data.get('address', ''),
                    supplier_data.get('notes', ''),
                    datetime.now().isoformat(),
                    supplier_id
                ))
                
                conn.commit()
                return {'success': True, 'id': supplier_id, 'message': 'Proveedor actualizado'}
            else:
                # Crear nuevo
                cursor.execute('''
                    INSERT INTO suppliers (name, contact, phone, email, address, notes)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (
                    name,
                    supplier_data.get('contact', ''),
                    supplier_data.get('phone', ''),
                    supplier_data.get('email', ''),
                    supplier_data.get('address', ''),
                    supplier_data.get('notes', '')
                ))
                
                new_id = cursor.lastrowid
                conn.commit()
                return {'success': True, 'id': new_id, 'message': 'Proveedor creado'}
                
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def delete(supplier_id):
    """Eliminar proveedor (soft delete)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Verificar si tiene compras asociadas (solo para información)
            cursor.execute('SELECT COUNT(*) as count FROM purchases WHERE supplier_id = ?', (supplier_id,))
            result = cursor.fetchone()
            has_purchases = result['count'] if result else 0
            
            # Siempre hacer soft delete (desactivar)
            cursor.execute('UPDATE suppliers SET active = 0, updated_at = datetime("now") WHERE id = ?', (supplier_id,))
            conn.commit()
            
            if has_purchases > 0:
                return {'success': True, 'message': f'Proveedor desactivado (tenía {has_purchases} compras asociadas)'}
            else:
                return {'success': True, 'message': 'Proveedor eliminado'}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def get_purchase_history(supplier_id, limit=20):
    """Obtener historial de compras a un proveedor con detalle de costos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT 
                pi.product_code,
                pi.product_name,
                pi.quantity,
                pi.unit_cost,
                p.purchase_date,
                p.folio
            FROM purchase_items pi
            JOIN purchases p ON pi.purchase_id = p.id
            WHERE p.supplier_id = ? AND p.status = 'completed'
            ORDER BY p.purchase_date DESC
            LIMIT ?
        ''', (supplier_id, limit))
        
        history = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': history}

def clear_all():
    """Eliminar TODOS los proveedores (para limpiar datos de prueba)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Eliminar proveedores que no tienen compras
            cursor.execute('''
                DELETE FROM suppliers 
                WHERE id NOT IN (SELECT DISTINCT supplier_id FROM purchases WHERE supplier_id IS NOT NULL)
            ''')
            
            # Desactivar los que sí tienen compras
            cursor.execute('UPDATE suppliers SET active = 0')
            
            conn.commit()
            return {'success': True, 'message': 'Proveedores limpiados'}
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}
