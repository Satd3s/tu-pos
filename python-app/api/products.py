# =============================================================================
# API DE PRODUCTOS
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime
import sqlite3

def get_all(include_inactive=False):
    """Obtener todos los productos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if include_inactive:
            cursor.execute('SELECT * FROM products ORDER BY name')
        else:
            cursor.execute('SELECT * FROM products WHERE active = 1 ORDER BY name')
        
        products = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': products}

def get_by_id(product_id):
    """Obtener producto por ID"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM products WHERE id = ?', (product_id,))
        product = dict_from_row(cursor.fetchone())
        
        if product:
            return {'success': True, 'data': product}
        return {'success': False, 'error': 'Producto no encontrado'}

def get_by_code(code):
    """Obtener producto por código"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM products WHERE code = ? AND active = 1', (code,))
        product = dict_from_row(cursor.fetchone())
        
        if product:
            return {'success': True, 'data': product}
        return {'success': False, 'error': 'Producto no encontrado'}

def search(query, limit=20):
    """Buscar productos por código, nombre o número de parte"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        search_term = f'%{query}%'
        
        cursor.execute('''
            SELECT * FROM products 
            WHERE active = 1 AND (
                code LIKE ? OR 
                name LIKE ? OR 
                part_number LIKE ? OR
                brand LIKE ?
            )
            ORDER BY 
                CASE 
                    WHEN code = ? THEN 1
                    WHEN code LIKE ? THEN 2
                    ELSE 3
                END,
                name
            LIMIT ?
        ''', (search_term, search_term, search_term, search_term, 
              query, f'{query}%', limit))
        
        products = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': products}

def save(product_data):
    """Crear o actualizar producto"""
    
    # Validar campos requeridos
    if not product_data.get('code'):
        return {'success': False, 'error': 'El código es requerido'}
    if not product_data.get('name'):
        return {'success': False, 'error': 'El nombre es requerido'}

    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            product_id = product_data.get('id')
            
            try:
                if product_id:
                    # Actualizar producto existente
                    cursor.execute('''
                        UPDATE products SET
                            code = ?,
                            name = ?,
                            description = ?,
                            category = ?,
                            brand = ?,
                            part_number = ?,
                            supplier = ?,
                            location = ?,
                            stock = ?,
                            min_stock = ?,
                            max_stock = ?,
                            purchase_cost = ?,
                            public_price = ?,
                            unit = ?,
                            updated_at = ?
                        WHERE id = ?
                    ''', (
                        product_data.get('code'),
                        product_data.get('name'),
                        product_data.get('description', ''),
                        product_data.get('category', ''),
                        product_data.get('brand', ''),
                        product_data.get('part_number', ''),
                        product_data.get('supplier', ''),
                        product_data.get('location', ''),
                        product_data.get('stock', 0),
                        product_data.get('min_stock', 5),
                        product_data.get('max_stock', 100),
                        product_data.get('purchase_cost', 0),
                        product_data.get('public_price', 0),
                        product_data.get('unit', 'pieza'),
                        datetime.now().isoformat(),
                        product_id
                    ))
                    conn.commit()
                    return {'success': True, 'id': product_id, 'message': 'Producto actualizado'}
                
                else:
                    # Crear nuevo producto
                    cursor.execute('''
                        INSERT INTO products (
                            code, name, description, category, brand, part_number,
                            supplier, location, stock, min_stock, max_stock,
                            purchase_cost, public_price, unit
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        product_data.get('code'),
                        product_data.get('name'),
                        product_data.get('description', ''),
                        product_data.get('category', ''),
                        product_data.get('brand', ''),
                        product_data.get('part_number', ''),
                        product_data.get('supplier', ''),
                        product_data.get('location', ''),
                        product_data.get('stock', 0),
                        product_data.get('min_stock', 5),
                        product_data.get('max_stock', 100),
                        product_data.get('purchase_cost', 0),
                        product_data.get('public_price', 0),
                        product_data.get('unit', 'pieza')
                    ))
                    conn.commit()
                    new_id = cursor.lastrowid
                    return {'success': True, 'id': new_id, 'message': 'Producto creado'}
            
            except sqlite3.IntegrityError as e:
                print(f"ERROR integrity: {e}", file=sys.stderr)
                if 'UNIQUE constraint failed' in str(e):
                    return {'success': False, 'error': 'Ya existe un producto con ese código'}
                return {'success': False, 'error': str(e)}

    except Exception as e:
        print(f"ERROR saving product: {e}", file=sys.stderr)
        return {'success': False, 'error': str(e)}

def delete(product_id):
    """Eliminar producto (soft delete)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('UPDATE products SET active = 0 WHERE id = ?', (product_id,))
        conn.commit()
        
        if cursor.rowcount > 0:
            return {'success': True, 'message': 'Producto eliminado'}
        return {'success': False, 'error': 'Producto no encontrado'}

def update_stock(product_id, quantity_change, reason='', reference='', user='Sistema'):
    """Actualizar stock de un producto y registrar movimiento"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener stock actual
        cursor.execute('SELECT stock, code, name FROM products WHERE id = ?', (product_id,))
        product = cursor.fetchone()
        
        if not product:
            return {'success': False, 'error': 'Producto no encontrado'}
        
        current_stock = product['stock']
        new_stock = current_stock + quantity_change
        
        if new_stock < 0:
            return {'success': False, 'error': 'Stock insuficiente'}
        
        # Actualizar stock
        cursor.execute('UPDATE products SET stock = ?, updated_at = ? WHERE id = ?',
                      (new_stock, datetime.now().isoformat(), product_id))
        
        # Registrar movimiento
        movement_type = 'entry' if quantity_change > 0 else 'exit'
        cursor.execute('''
            INSERT INTO movements (product_id, type, quantity, reason, reference, user)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (product_id, movement_type, abs(quantity_change), reason, reference, user))
        
        conn.commit()
        
        return {
            'success': True, 
            'previous_stock': current_stock,
            'new_stock': new_stock,
            'message': f'Stock actualizado: {current_stock} → {new_stock}'
        }

def get_low_stock(threshold=None):
    """Obtener productos con stock bajo"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        if threshold:
            cursor.execute('''
                SELECT * FROM products 
                WHERE active = 1 AND stock <= ?
                ORDER BY stock ASC
            ''', (threshold,))
        else:
            cursor.execute('''
                SELECT * FROM products 
                WHERE active = 1 AND stock <= min_stock
                ORDER BY stock ASC
            ''')
        
        products = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': products, 'count': len(products)}

def get_categories():
    """Obtener lista de categorías únicas"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT category FROM products 
            WHERE category IS NOT NULL AND category != ''
            ORDER BY category
        ''')
        categories = [row['category'] for row in cursor.fetchall()]
        return {'success': True, 'data': categories}

def get_brands():
    """Obtener lista de marcas únicas"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT DISTINCT brand FROM products 
            WHERE brand IS NOT NULL AND brand != ''
            ORDER BY brand
        ''')
        brands = [row['brand'] for row in cursor.fetchall()]
        return {'success': True, 'data': brands}


def generate_internal_code():
    """Generar código interno único para productos sin código de barras"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Buscar el último código interno generado (empiezan con "2")
        cursor.execute('''
            SELECT code FROM products 
            WHERE code LIKE '2%' AND LENGTH(code) = 13
            ORDER BY code DESC
            LIMIT 1
        ''')
        
        last_code = cursor.fetchone()
        
        if last_code:
            # Extraer el número y aumentar en 1
            try:
                last_num = int(last_code['code'])
                new_num = last_num + 1
            except ValueError:
                new_num = 2000000000001
        else:
            # Primer código interno: 2000000000001
            new_num = 2000000000001
        
        # Usar bucle con límite en lugar de recursión
        max_attempts = 100
        for _ in range(max_attempts):
            new_code = str(new_num)
            
            # Verificar que no exista
            cursor.execute('SELECT id FROM products WHERE code = ?', (new_code,))
            if not cursor.fetchone():
                return {
                    'success': True, 
                    'code': new_code,
                    'message': 'Código interno generado'
                }
            new_num += 1
        
        return {
            'success': False, 
            'error': 'No se pudo generar código único después de 100 intentos'
        }

def search_catalog(query):
    """Buscar un producto en el catálogo histórico recuperado"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verificar si existe la tabla
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='product_catalog'")
        if not cursor.fetchone():
             return {'success': False, 'error': 'Catálogo no disponible', 'data': []}

        # Prioridad 1: Coincidencia exacta de código
        cursor.execute('SELECT * FROM product_catalog WHERE code = ?', (query,))
        exact = cursor.fetchone()
        if exact:
             return {'success': True, 'data': [dict_from_row(exact)]}

        # Prioridad 2: Búsqueda parcial (nombre/descripción)
        if len(query) < 3:
             return {'success': True, 'data': []}

        search_term = f'%{query}%'
        cursor.execute('''
            SELECT * FROM product_catalog 
            WHERE name LIKE ? OR description LIKE ?
            LIMIT 20
        ''', (search_term, search_term))
        
        results = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': results}

