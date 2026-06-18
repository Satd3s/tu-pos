# =============================================================================
# API DE CLIENTES Y CRÉDITOS
# =============================================================================

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db_connection, dict_from_row
from datetime import datetime

# =============================================================================
# CLIENTES
# =============================================================================

def get_all():
    """Obtener todos los clientes activos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM customers WHERE active = 1 ORDER BY name')
        customers = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': customers}

def get_by_id(customer_id):
    """Obtener cliente por ID con su historial de crédito"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
        customer = dict_from_row(cursor.fetchone())
        
        if not customer:
            return {'success': False, 'error': 'Cliente no encontrado'}
        
        # Obtener historial de crédito
        cursor.execute('''
            SELECT cc.*, s.folio as sale_folio 
            FROM customer_credits cc
            LEFT JOIN sales s ON cc.sale_id = s.id
            WHERE cc.customer_id = ?
            ORDER BY cc.created_at DESC
            LIMIT 50
        ''', (customer_id,))
        customer['credit_history'] = [dict_from_row(row) for row in cursor.fetchall()]
        
        return {'success': True, 'data': customer}

def search(query):
    """Buscar clientes por nombre, teléfono o código"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        search_term = f'%{query}%'
        cursor.execute('''
            SELECT * FROM customers 
            WHERE active = 1 AND (
                name LIKE ? OR 
                phone LIKE ? OR 
                code LIKE ? OR
                rfc LIKE ?
            )
            ORDER BY name
            LIMIT 20
        ''', (search_term, search_term, search_term, search_term))
        customers = [dict_from_row(row) for row in cursor.fetchall()]
        return {'success': True, 'data': customers}

def get_next_code():
    """Generar siguiente código de cliente"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(CAST(SUBSTR(code, 2) AS INTEGER)) FROM customers WHERE code LIKE 'C%'")
        row = cursor.fetchone()
        next_num = (row[0] or 0) + 1
        return f'C{next_num:04d}'

def save(customer_data):
    """Guardar cliente (crear o actualizar)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            customer_id = customer_data.get('id')
            
            if customer_id:
                # Actualizar cliente existente
                cursor.execute('''
                    UPDATE customers SET 
                        name = ?, phone = ?, email = ?, address = ?, rfc = ?,
                        credit_limit = ?, allow_credit = ?, notes = ?,
                        updated_at = ?
                    WHERE id = ?
                ''', (
                    customer_data.get('name', ''),
                    customer_data.get('phone', ''),
                    customer_data.get('email', ''),
                    customer_data.get('address', ''),
                    customer_data.get('rfc', ''),
                    customer_data.get('credit_limit', 0),
                    1 if customer_data.get('allow_credit') else 0,
                    customer_data.get('notes', ''),
                    datetime.now().isoformat(),
                    customer_id
                ))
                conn.commit()
                return {'success': True, 'id': customer_id, 'message': 'Cliente actualizado'}
            else:
                # Crear nuevo cliente
                code = customer_data.get('code') or get_next_code()
                cursor.execute('''
                    INSERT INTO customers (
                        code, name, phone, email, address, rfc,
                        credit_limit, allow_credit, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    code,
                    customer_data.get('name', ''),
                    customer_data.get('phone', ''),
                    customer_data.get('email', ''),
                    customer_data.get('address', ''),
                    customer_data.get('rfc', ''),
                    customer_data.get('credit_limit', 0),
                    1 if customer_data.get('allow_credit') else 0,
                    customer_data.get('notes', '')
                ))
                conn.commit()
                return {'success': True, 'id': cursor.lastrowid, 'code': code, 'message': 'Cliente creado'}
                
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def delete(customer_id):
    """Desactivar cliente (soft delete)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Verificar si tiene saldo pendiente
        cursor.execute('SELECT current_balance FROM customers WHERE id = ?', (customer_id,))
        customer = cursor.fetchone()
        
        if customer and customer['current_balance'] > 0:
            return {'success': False, 'error': 'No se puede eliminar un cliente con saldo pendiente'}
        
        cursor.execute('UPDATE customers SET active = 0, updated_at = ? WHERE id = ?', 
                      (datetime.now().isoformat(), customer_id))
        conn.commit()
        return {'success': True, 'message': 'Cliente eliminado'}

# =============================================================================
# CRÉDITOS / CUENTAS POR COBRAR
# =============================================================================

def add_charge(customer_id, amount, sale_id=None, reference='', notes='', user=''):
    """Agregar cargo a la cuenta del cliente (venta a crédito)"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Verificar cliente y límite de crédito
            cursor.execute('SELECT * FROM customers WHERE id = ? AND active = 1', (customer_id,))
            customer = dict_from_row(cursor.fetchone())
            
            if not customer:
                return {'success': False, 'error': 'Cliente no encontrado'}
            
            if not customer['allow_credit']:
                return {'success': False, 'error': 'Este cliente no tiene crédito habilitado'}
            
            new_balance = customer['current_balance'] + amount
            
            if new_balance > customer['credit_limit']:
                return {'success': False, 'error': f'Excede el límite de crédito. Disponible: ${customer["credit_limit"] - customer["current_balance"]:.2f}'}
            
            # Registrar cargo
            cursor.execute('''
                INSERT INTO customer_credits (customer_id, type, amount, sale_id, reference, notes, user)
                VALUES (?, 'charge', ?, ?, ?, ?, ?)
            ''', (customer_id, amount, sale_id, reference, notes, user))
            
            # Actualizar saldo del cliente
            cursor.execute('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?',
                          (new_balance, datetime.now().isoformat(), customer_id))
            
            conn.commit()
            return {
                'success': True, 
                'new_balance': new_balance,
                'message': f'Cargo registrado. Nuevo saldo: ${new_balance:.2f}'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def add_payment(customer_id, amount, reference='', notes='', user=''):
    """Registrar abono del cliente"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        try:
            # Obtener cliente
            cursor.execute('SELECT * FROM customers WHERE id = ? AND active = 1', (customer_id,))
            customer = dict_from_row(cursor.fetchone())
            
            if not customer:
                return {'success': False, 'error': 'Cliente no encontrado'}
            
            if customer['current_balance'] <= 0:
                return {'success': False, 'error': 'Este cliente no tiene saldo pendiente'}
            
            new_balance = max(0, customer['current_balance'] - amount)
            
            # Registrar abono
            cursor.execute('''
                INSERT INTO customer_credits (customer_id, type, amount, reference, notes, user)
                VALUES (?, 'payment', ?, ?, ?, ?)
            ''', (customer_id, amount, reference, notes, user))
            
            # Actualizar saldo del cliente
            cursor.execute('UPDATE customers SET current_balance = ?, updated_at = ? WHERE id = ?',
                          (new_balance, datetime.now().isoformat(), customer_id))
            
            conn.commit()
            return {
                'success': True, 
                'new_balance': new_balance,
                'message': f'Abono registrado. Nuevo saldo: ${new_balance:.2f}'
            }
            
        except Exception as e:
            conn.rollback()
            return {'success': False, 'error': str(e)}

def get_statement(customer_id):
    """Obtener estado de cuenta del cliente"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Obtener cliente
        cursor.execute('SELECT * FROM customers WHERE id = ?', (customer_id,))
        customer = dict_from_row(cursor.fetchone())
        
        if not customer:
            return {'success': False, 'error': 'Cliente no encontrado'}
        
        # Obtener todos los movimientos
        cursor.execute('''
            SELECT cc.*, s.folio as sale_folio, s.total as sale_total
            FROM customer_credits cc
            LEFT JOIN sales s ON cc.sale_id = s.id
            WHERE cc.customer_id = ?
            ORDER BY cc.created_at DESC
        ''', (customer_id,))
        movements = [dict_from_row(row) for row in cursor.fetchall()]
        
        # Calcular totales
        total_charges = sum(m['amount'] for m in movements if m['type'] == 'charge')
        total_payments = sum(m['amount'] for m in movements if m['type'] == 'payment')
        
        return {
            'success': True,
            'customer': customer,
            'movements': movements,
            'summary': {
                'total_charges': total_charges,
                'total_payments': total_payments,
                'current_balance': customer['current_balance'],
                'credit_available': customer['credit_limit'] - customer['current_balance']
            }
        }

def get_debtors():
    """Obtener clientes con saldo pendiente"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            SELECT * FROM customers 
            WHERE active = 1 AND current_balance > 0
            ORDER BY current_balance DESC
        ''')
        debtors = [dict_from_row(row) for row in cursor.fetchall()]
        total_debt = sum(d['current_balance'] for d in debtors)
        return {
            'success': True, 
            'data': debtors, 
            'total_debt': total_debt,
            'count': len(debtors)
        }
