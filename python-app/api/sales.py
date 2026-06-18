# =============================================================================
# API DE VENTAS Y TURNOS DE CAJA
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime, date
from api import products
from core.config_manager import ConfigManager

def get_all(filters=None):
    """Obtener ventas con filtros opcionales"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = 'SELECT * FROM sales WHERE 1=1'
        params = []
        
        if filters:
            if filters.get('start_date'):
                query += ' AND DATE(created_at) >= ?'
                params.append(filters['start_date'])
            if filters.get('end_date'):
                query += ' AND DATE(created_at) <= ?'
                params.append(filters['end_date'])
            if filters.get('status'):
                query += ' AND status = ?'
                params.append(filters['status'])
            if filters.get('payment_method'):
                query += ' AND payment_method = ?'
                params.append(filters['payment_method'])
        
        query += ' ORDER BY created_at DESC'
        
        if filters and filters.get('limit'):
            query += ' LIMIT ?'
            params.append(filters['limit'])
        
        cursor.execute(query, params)
        sales = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Obtener items de cada venta
        for sale in sales:
            cursor.execute('SELECT * FROM sale_items WHERE sale_id = ?', (sale['id'],))
            sale['items'] = [dict_from_row(item) for item in cursor.fetchall()]
        
        return {'success': True, 'data': sales}

def get_by_id(sale_id):
    """Obtener venta por ID con sus items"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM sales WHERE id = ?', (sale_id,))
        sale = dict_from_row(cursor.fetchone())
        
        if not sale:
            return {'success': False, 'error': 'Venta no encontrada'}
        
        cursor.execute('SELECT * FROM sale_items WHERE sale_id = ?', (sale_id,))
        sale['items'] = [dict_from_row(item) for item in cursor.fetchall()]
        
        return {'success': True, 'data': sale}

def get_by_folio(folio):
    """Obtener venta por folio"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM sales WHERE folio = ?', (folio,))
        sale = dict_from_row(cursor.fetchone())
        
        if sale:
            cursor.execute('SELECT * FROM sale_items WHERE sale_id = ?', (sale['id'],))
            sale['items'] = [dict_from_row(item) for item in cursor.fetchall()]
            return {'success': True, 'data': sale}
        
        return {'success': False, 'error': 'Venta no encontrada'}

def get_next_folio():
    """Generar siguiente folio de venta"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener contador actual
        cursor.execute("SELECT value FROM settings WHERE key = 'folio_counter'")
        row = cursor.fetchone()
        current = int(row['value']) if row else 0
        
        # Incrementar
        next_num = current + 1
        cursor.execute("UPDATE settings SET value = ? WHERE key = 'folio_counter'", (str(next_num),))
        conn.commit()
        
        # Formato: V000001
        folio = f'V{next_num:06d}'
        return {'success': True, 'folio': folio, 'number': next_num}

def create(sale_data):
    """Crear una venta"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Obtener turno actual
            cursor.execute("SELECT id FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
            shift_row = cursor.fetchone()
            
            if not shift_row:
                return {'success': False, 'error': 'No hay un turno de caja abierto. Por favor inicie turno.'}
                
            shift_id = shift_row['id']
            
            items = sale_data.get('items', [])
            
            # Leer configuración de stock
            config = ConfigManager()
            check_stock = config.get('sales.check_stock', True)  # Por defecto verificar stock
            allow_negative_stock = config.get('sales.allow_negative_stock', False)
            
            # VALIDACIÓN DE STOCK: Solo verificar si check_stock está habilitado
            for item in items:
                cursor.execute('SELECT id, code, name, stock FROM products WHERE id = ?', (item['product_id'],))
                product = cursor.fetchone()
                if not product:
                    return {'success': False, 'error': f"Producto ID {item['product_id']} no encontrado"}
                
                # Solo validar stock si:
                # 1. check_stock está habilitado (True) Y
                # 2. allow_negative_stock está deshabilitado (False)
                if check_stock and not allow_negative_stock and product['stock'] < item['quantity']:
                    return {
                        'success': False, 
                        'error': f"Stock insuficiente para '{product['name']}' (Código: {product['code']}). Disponible: {product['stock']}, Solicitado: {item['quantity']}"
                    }
            
            # Generar folio
            folio_result = get_next_folio()
            folio = folio_result['folio']
            
            # Calcular totales
            subtotal = sum(item['quantity'] * item['unit_price'] for item in items)
            tax = sale_data.get('tax', subtotal * 0.16)
            discount = sale_data.get('discount', 0)
            total = subtotal + tax - discount
            
            # Insertar venta
            cursor.execute('''
                INSERT INTO sales (
                    folio, shift_id, subtotal, tax, discount, total,
                    payment_method, cash_received, card_received, change_given, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                folio,
                shift_id,
                subtotal,
                tax,
                discount,
                total,
                sale_data.get('payment_method', 'cash'),
                sale_data.get('cash_received', 0),
                sale_data.get('card_received', 0),
                sale_data.get('change_given', 0),
                sale_data.get('notes', '')
            ))
            
            sale_id = cursor.lastrowid
            
            # Insertar items y actualizar stock
            for item in items:
                cursor.execute('''
                    INSERT INTO sale_items (
                        sale_id, product_id, product_code, product_name,
                        quantity, unit_price, subtotal
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ''', (
                    sale_id,
                    item['product_id'],
                    item.get('product_code', ''),
                    item.get('product_name', ''),
                    item['quantity'],
                    item['unit_price'],
                    item['quantity'] * item['unit_price']
                ))
                
                # Descontar stock
                cursor.execute('''
                    UPDATE products SET stock = stock - ?, updated_at = ?
                    WHERE id = ?
                ''', (item['quantity'], datetime.now().isoformat(), item['product_id']))
                
                # Registrar movimiento
                cursor.execute('''
                    INSERT INTO movements (product_id, type, quantity, reason, reference, user)
                    VALUES (?, 'exit', ?, ?, ?, 'POS')
                ''', (item['product_id'], item['quantity'], f'Venta {folio}', folio))
            
            # Actualizar turno
            payment_method = sale_data.get("payment_method", "cash")
            
            if payment_method == 'mixed':
                cash_received = sale_data.get('cash_received', 0) or 0
                card_received = sale_data.get('card_received', 0) or 0
                change_given = sale_data.get('change_given', 0) or 0
                
                # EFECTIVO NETO: Lo recibido menos el cambio entregado
                # Si el cambio es mayor que lo recibido en efectivo (raro pero posible), 
                # la diferencia sale del fondo de caja, afectando total_cash negativamente.
                net_cash = cash_received - change_given
                
                cursor.execute('''
                    UPDATE shifts SET 
                        total_sales = total_sales + ?,
                        total_cash = total_cash + ?,
                        total_card = total_card + ?,
                        sales_count = sales_count + 1
                    WHERE id = ?
                ''', (total, net_cash, card_received, shift_id))
            else:
                # Pago simple (efectivo, tarjeta, transferencia o crédito)
                payment_field = f'total_{payment_method}'
                # Validar que el campo existe en la tabla shifts
                valid_fields = ['total_cash', 'total_card', 'total_transfer', 'total_credit']
                if payment_field not in valid_fields:
                    payment_field = 'total_cash'  # Fallback a efectivo si es desconocido
                
                # Para efectivo, restar el cambio
                if payment_method == 'cash':
                    amount_to_add = total # El total de la venta es lo que queda en caja neto
                else:
                    amount_to_add = total
                    
                cursor.execute(f'''
                    UPDATE shifts SET 
                        total_sales = total_sales + ?,
                        {payment_field} = {payment_field} + ?,
                        sales_count = sales_count + 1
                    WHERE id = ?
                ''', (total, amount_to_add, shift_id))
            
            conn.commit()
            
            return {
                'success': True,
                'id': sale_id,
                'folio': folio,
                'total': total,
                'message': f'Venta {folio} registrada correctamente'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def cancel(sale_id):
    """Cancelar/anular una venta"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Obtener venta
            cursor.execute('SELECT * FROM sales WHERE id = ?', (sale_id,))
            sale = dict_from_row(cursor.fetchone())
            
            if not sale:
                return {'success': False, 'error': 'Venta no encontrada'}
            
            if sale['status'] == 'cancelled':
                return {'success': False, 'error': 'La venta ya está cancelada'}
            
            # Obtener items
            cursor.execute('SELECT * FROM sale_items WHERE sale_id = ?', (sale_id,))
            items = [dict_from_row(item) for item in cursor.fetchall()]
            
            # Devolver stock
            for item in items:
                cursor.execute('''
                    UPDATE products SET stock = stock + ?, updated_at = ?
                    WHERE id = ?
                ''', (item['quantity'], datetime.now().isoformat(), item['product_id']))
                
                # Registrar movimiento de devolución
                cursor.execute('''
                    INSERT INTO movements (product_id, type, quantity, reason, reference, user)
                    VALUES (?, 'entry', ?, ?, ?, 'Supervisor')
                ''', (item['product_id'], item['quantity'], 
                      f'Anulación de venta {sale["folio"]}', sale['folio']))
            
            # Marcar venta como cancelada
            cursor.execute('''
                UPDATE sales SET status = 'cancelled', cancelled_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), sale_id))
            
            # Actualizar turno si aplica
            if sale['shift_id']:
                payment_method = sale.get("payment_method", "cash")
                
                if payment_method == 'mixed':
                    cash_received = sale.get('cash_received', 0) or 0
                    card_received = sale.get('card_received', 0) or 0
                    change_given = sale.get('change_given', 0) or 0
                    net_cash = cash_received - change_given
                    
                    cursor.execute('''
                        UPDATE shifts SET 
                            total_sales = total_sales - ?,
                            total_cash = total_cash - ?,
                            total_card = total_card - ?,
                            sales_count = sales_count - 1
                        WHERE id = ?
                    ''', (sale['total'], net_cash, card_received, sale['shift_id']))
                else:
                    payment_field = f'total_{payment_method}'
                    valid_fields = ['total_cash', 'total_card', 'total_transfer', 'total_credit']
                    if payment_field not in valid_fields:
                        payment_field = 'total_cash'
                        
                    cursor.execute(f'''
                        UPDATE shifts SET 
                            total_sales = total_sales - ?,
                            {payment_field} = {payment_field} - ?,
                            sales_count = sales_count - 1
                        WHERE id = ?
                    ''', (sale['total'], sale['total'], sale['shift_id']))
            
            conn.commit()
            
            return {
                'success': True,
                'message': f'Venta {sale["folio"]} anulada correctamente'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def get_today():
    """Obtener ventas del día"""
    today = date.today().isoformat()
    return get_all({'start_date': today, 'end_date': today, 'status': 'completed'})

# =============================================================================
# TURNOS DE CAJA
# =============================================================================

def start_shift(initial_fund, user_id=None, username=None):
    """Iniciar un turno de caja"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            # Verificar si hay turno abierto
            cursor.execute("SELECT id FROM shifts WHERE status = 'open'")
            if cursor.fetchone():
                return {'success': False, 'error': 'Ya hay un turno abierto'}
            
            cursor.execute('''
                INSERT INTO shifts (initial_fund, status, user_id, user)
                VALUES (?, 'open', ?, ?)
            ''', (initial_fund, user_id, username))
            
            conn.commit()
            shift_id = cursor.lastrowid
            
            return {
                'success': True,
                'id': shift_id,
                'initial_fund': initial_fund,
                'message': 'Turno iniciado correctamente'
            }
    except Exception as e:
        return {'success': False, 'error': f"Error al iniciar turno: {str(e)}"}

def end_shift():
    """Cerrar turno de caja actual"""
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
            shift = dict_from_row(cursor.fetchone())
            
            if not shift:
                return {'success': False, 'error': 'No hay turno abierto'}
            
            cursor.execute('''
                UPDATE shifts SET status = 'closed', closed_at = ?
                WHERE id = ?
            ''', (datetime.now().isoformat(), shift['id']))
            
            conn.commit()
            
            # Calcular resumen
            total_cash = shift['initial_fund'] + shift['total_cash']
            
            return {
                'success': True,
                'summary': {
                    'initial_fund': shift['initial_fund'],
                    'total_sales': shift['total_sales'],
                    'total_cash': shift['total_cash'],
                    'total_card': shift['total_card'],
                    'total_transfer': shift['total_transfer'],
                    'total_credit': shift.get('total_credit', 0),
                    'sales_count': shift['sales_count'],
                    'expected_cash': shift['initial_fund'] + shift['total_cash']
                },
                'message': 'Turno cerrado correctamente'
            }
    except Exception as e:
        return {'success': False, 'error': f"Error al cerrar turno: {str(e)}"}

def get_current_shift():
    """Obtener turno actual"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM shifts WHERE status = 'open' ORDER BY opened_at DESC LIMIT 1")
        shift = dict_from_row(cursor.fetchone())
        
        if shift:
            return {'success': True, 'data': shift, 'active': True}
        return {'success': True, 'data': None, 'active': False}

def get_shift_summary(shift_id):
    """Obtener resumen de un turno"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM shifts WHERE id = ?', (shift_id,))
        shift = dict_from_row(cursor.fetchone())
        
        if not shift:
            return {'success': False, 'error': 'Turno no encontrado'}
        
        # Obtener ventas del turno
        cursor.execute('SELECT * FROM sales WHERE shift_id = ? AND status = "completed"', (shift_id,))
        sales = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {
            'success': True,
            'shift': shift,
            'sales': sales
        }

def get_shift_history(limit=50):
    """Obtener historial de turnos cerrados"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM shifts 
            WHERE status = 'closed' 
            ORDER BY closed_at DESC 
            LIMIT ?
        ''', (limit,))
        shifts = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': shifts}
