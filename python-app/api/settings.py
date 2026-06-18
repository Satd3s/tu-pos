# =============================================================================
# API DE CONFIGURACIÓN
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime

def get_all():
    """Obtener toda la configuración"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT key, value FROM settings')
        
        settings = {}
        for row in cursor.fetchall():
            settings[row['key']] = row['value']
        
        return {'success': True, 'data': settings}

def get(key, default=None):
    """Obtener un valor de configuración"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT value FROM settings WHERE key = ?', (key,))
        row = cursor.fetchone()
        
        if row:
            return row['value']
        return default

def set(key, value):
    """Establecer un valor de configuración"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO settings (key, value, updated_at) 
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
        ''', (key, value, datetime.now().isoformat(), value, datetime.now().isoformat()))
        conn.commit()
        return {'success': True}

def save(settings_data):
    """Guardar múltiples valores de configuración"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        for key, value in settings_data.items():
            cursor.execute('''
                INSERT INTO settings (key, value, updated_at) 
                VALUES (?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?
            ''', (key, str(value), datetime.now().isoformat(), str(value), datetime.now().isoformat()))
        
        conn.commit()
        return {'success': True, 'message': 'Configuración guardada'}

def get_company_info():
    """Obtener información de la empresa"""
    settings = get_all()['data']
    
    return {
        'name': settings.get('company_name', 'Mi Empresa'),
        'phone': settings.get('company_phone', ''),
        'address': settings.get('company_address', ''),
        'email': settings.get('company_email', ''),
        'rfc': settings.get('company_rfc', ''),
        'logo': settings.get('company_logo', '')
    }

def get_appearance():
    """Obtener configuración de apariencia"""
    settings = get_all()['data']
    
    return {
        'theme': settings.get('theme', 'dark'),
        'accent_color': settings.get('accent_color', '#3b82f6'),
        'font_size': settings.get('font_size', 'medium')
    }


# =============================================================================
# FUNCIONES DE CATEGORÍAS/DEPARTAMENTOS
# =============================================================================

def get_categories():
    """Obtener todas las categorías con conteo de productos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener categorías de la tabla categories
        cursor.execute('''
            SELECT c.name, c.color, c.description as icon,
                   (SELECT COUNT(*) FROM products WHERE category = c.name AND active = 1) as count
            FROM categories c
            ORDER BY c.name
        ''')
        
        categories = []
        for row in cursor.fetchall():
            categories.append({
                'name': row['name'],
                'color': row['color'] or '#3b82f6',
                'icon': row['icon'] or '📦',
                'count': row['count'] or 0
            })
        
        return {'success': True, 'data': categories}


def save_category(data):
    """Guardar o actualizar una categoría"""
    name = data.get('name', '').strip()
    icon = data.get('icon', '📦')
    color = data.get('color', '#3b82f6')
    old_name = data.get('old_name')
    
    if not name:
        return {'success': False, 'error': 'El nombre es requerido'}
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            if old_name and old_name != name:
                # Actualizar categoría existente
                cursor.execute('''
                    UPDATE categories SET name = ?, description = ?, color = ?
                    WHERE name = ?
                ''', (name, icon, color, old_name))
                
                # Actualizar productos que tenían la categoría anterior
                cursor.execute('''
                    UPDATE products SET category = ? WHERE category = ?
                ''', (name, old_name))
            else:
                # Insertar o actualizar
                cursor.execute('''
                    INSERT INTO categories (name, description, color)
                    VALUES (?, ?, ?)
                    ON CONFLICT(name) DO UPDATE SET description = ?, color = ?
                ''', (name, icon, color, icon, color))
            
            conn.commit()
            return {'success': True, 'message': 'Categoría guardada'}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}


def delete_category(name):
    """Eliminar una categoría"""
    if not name:
        return {'success': False, 'error': 'Nombre requerido'}
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verificar si hay productos con esta categoría
        cursor.execute('SELECT COUNT(*) as count FROM products WHERE category = ? AND active = 1', (name,))
        count = cursor.fetchone()['count']
        
        if count > 0:
            return {'success': False, 'error': f'No se puede eliminar: hay {count} productos con esta categoría'}
        
        cursor.execute('DELETE FROM categories WHERE name = ?', (name,))
        conn.commit()
        
        return {'success': True, 'message': 'Categoría eliminada'}
