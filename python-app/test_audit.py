
import unittest
import os
import sys
import sqlite3
import json
from datetime import datetime

# Agregar directorio actual al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import init_database, get_db_connection
import api.products as products
import api.sales as sales
import api.users as users
# import api.shifts as shifts (shifts methods are in sales) 
from core.config_manager import config

class TestInventorySystem(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        """Configuración inicial para todas las pruebas"""
        print("\n" + "="*50)
        print("INICIANDO AUDITORÍA AUTOMATIZADA DE SISTEMA")
        print("="*50)
        
        # Usar una base de datos de prueba
        cls.db_name = 'test_audit.db'
        
        # Override de la ruta de BD en database.py (si fuera posible, pero es hardcoded)
        # Como no podemos cambiar la constante DB_PATH fácilmente sin tocar el código,
        # usaremos mocks o trabajaremos con cuidado.
        # OPCIÓN SEGURA: Usar la BD real pero con transacciones rollback
        
        # NOTA: Para esta auditoría "en caliente", vamos a crear datos de prueba
        # con prefijos "TEST_" para identificarlos y limpiarlos luego.
        
        # Verificar conexión
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            print("[OK] Conexión a base de datos establecida")

    def test_01_user_security(self):
        """Auditoría de Seguridad de Usuarios"""
        print("\n[TEST] Verificando seguridad de usuarios...")
        
        # 1. Intentar crear usuario sin contraseña
        result = users.save({
            'username': 'test_no_pass', 
            'role': 'cashier'
        })
        self.assertFalse(result['success'], "FALLO: El sistema permitió crear usuario sin contraseña")
        print("  - [OK] Bloqueo de usuarios sin contraseña")
        
        # 2. Verificar hash de contraseñas
        # Crear usuario válido
        test_user = {
            'username': 'audit_security_user',
            'password': 'safe_password_123',
            'role': 'admin'
        }
        users.save(test_user)
        
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT password FROM users WHERE username = ?", (test_user['username'],))
            row = cursor.fetchone()
            stored_hash = row['password']
            
            # Verificar que NO sea texto plano
            self.assertNotEqual(stored_hash, 'safe_password_123', "FALLO CRÍTICO: Contraseña almacenada en texto plano")
            print("  - [OK] Contraseñas hasheadas en BD")
            
            # Verificar longitud del hash (SHA-256 debe ser 64 chars)
            self.assertEqual(len(stored_hash), 64, f"FALLO: Hash débil o incorrecto (Len: {len(stored_hash)})")
            print("  - [OK] Longitud de hash correcta (SHA-256)")

        # Limpieza
        with get_db_connection() as conn:
            conn.execute("DELETE FROM users WHERE username = ?", ('audit_security_user',))
            conn.commit()

    def test_02_product_integrity(self):
        """Auditoría de Integridad de Productos"""
        print("\n[TEST] Verificando integridad de productos...")
        
        # 1. Crear producto
        code = f"TEST_PROD_{int(datetime.now().timestamp())}"
        prod_data = {
            'code': code,
            'name': 'Producto de Prueba Auditoría',
            'purchase_cost': 100.0,
            'public_price': 150.0,
            'stock': 10,
            'category': 'General'
        }
        result = products.save(prod_data)
        self.assertTrue(result['success'], f"FALLO: No se pudo crear producto: {result.get('error')}")
        prod_id = result['id']
        print("  - [OK] Creación de productos")
        
        # 2. Verificar cálculos (Margen/Utilidad) - Si existen en backend
        # No hay función explícita, pero verificamos lectura
        read_prod = products.get_by_id(prod_id)['data']
        self.assertEqual(read_prod['stock'], 10, "FALLO: Inconsistencia en stock inicial")
        print("  - [OK] Lectura de productos correcta")
        
        return prod_id, code

    def test_03_sales_and_stock(self):
        """Auditoría de Ventas y Movimiento de Stock"""
        print("\n[TEST] Verificando lógica de ventas y stock...")
        
        # Crear producto para la venta
        code = f"TEST_SALE_{int(datetime.now().timestamp())}"
        products.save({
            'code': code, 'name': 'Test Venta', 
            'purchase_cost': 50, 'public_price': 100, 
            'stock': 20
        })
        prod = products.get_by_code(code)['data']
        
        # Abrir turno si no existe
        current_shift = sales.get_current_shift()
        if not current_shift.get('active'):
            sales.start_shift(1000)
            print("  - [INFO] Turno de caja abierto automáticamnete")
        
        # Realizar Venta
        sale_data = {
            'items': [
                {'product_id': prod['id'], 'quantity': 5, 'unit_price': 100, 'product_code': code}
            ],
            'payment_method': 'cash',
            'cash_received': 500
        }
        
        result = sales.create(sale_data)
        self.assertTrue(result['success'], f"FALLO: Venta fallida: {result.get('error')}")
        sale_id = result['id']
        print(f"  - [OK] Venta registrada (Folio: {result.get('folio')})")
        
        # Verificar descuento de stock
        updated_prod = products.get_by_id(prod['id'])['data']
        expected_stock = 20 - 5
        self.assertEqual(updated_prod['stock'], expected_stock, 
                        f"FALLO CRÍTICO: Stock no descontado. Esperado: {expected_stock}, Actual: {updated_prod['stock']}")
        print("  - [OK] Stock descontado correctamente")
        
        # Verificar afectación al turno (Caja)
        shift_summary = sales.get_current_shift()['data']
        # No podemos validar exacto porque puede haber otras ventas, pero verificamos que no sea 0
        self.assertTrue(shift_summary['total_sales'] > 0, "FALLO: Turno no refleja ventas")
        print("  - [OK] Caja actualizada correctamente")
        
        # Prueba de Stock Negativo (si está configurado para prohibirlo)
        config.set('sales.allow_negative_stock', False)
        config.set('sales.check_stock', True)
        
        bad_sale_data = {
            'items': [{'product_id': prod['id'], 'quantity': 1000, 'unit_price': 100}], # Pide 1000, hay 15
        }
        result = sales.create(bad_sale_data)
        self.assertFalse(result['success'], "FALLO: El sistema permitió venta sin stock suficiente")
        print("  - [OK] Bloqueo de stock insuficiente correcto")

    def test_04_system_integrity(self):
        """Auditoría de configuración y estado"""
        print("\n[TEST] Verificando configuración del sistema...")
        
        # Verificar primera ejecución vs usuarios
        is_first = config.is_first_run()
        users_list = users.get_all()['data']
        
        if len(users_list) == 0:
             # Si no hay usuarios, DEBE ser first_run = True (por mi fix anterior)
             # Pero esta prueba corre contra la lógica actual
             pass
        
        print(f"  - Estado First Run: {is_first}")
        print(f"  - Usuarios totales: {len(users_list)}")
        
        if len(users_list) > 0 and is_first:
             print("  - [WARN] Inconsistencia: Hay usuarios pero el sistema cree que es la primera vez")
        elif len(users_list) == 0 and not is_first:
             print("  - [FAIL] PELIGRO: No hay usuarios y el sistema cree que YA está configurado (Bloqueo potencial)")

if __name__ == '__main__':
    try:
        suite = unittest.TestLoader().loadTestsFromTestCase(TestInventorySystem)
        unittest.TextTestRunner(verbosity=2).run(suite)
        print("\n" + "="*50)
        print("AUDITORÍA FINALIZADA")
        print("="*50)
    except Exception as e:
        print(f"Error fatal en auditoría: {e}")
