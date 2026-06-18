# =============================================================================
# IMPORTADOR DE PRODUCTOS DESDE BASE DE DATOS GRANDE (48MB)
# Importa los 1163 productos CON PRECIOS a nuestro sistema
# =============================================================================

import fdb
import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
FIREBIRD_DB = os.path.join(os.path.dirname(BASE_DIR), 'pdvdata.fdb')
FIREBIRD_DLL = os.path.join(BASE_DIR, 'firebird64', 'fbembed.dll')
SQLITE_DB = os.path.join(BASE_DIR, 'inventory.db')

def import_products():
    print("=" * 70)
    print("IMPORTACIÓN DE PRODUCTOS DESDE BASE DE DATOS DE 48MB")
    print("=" * 70)
    print(f"\nFirebird DB: {FIREBIRD_DB}")
    print(f"SQLite DB: {SQLITE_DB}")
    print(f"Tamaño: {os.path.getsize(FIREBIRD_DB) / 1024 / 1024:.2f} MB\n")
    
    # Conectar a Firebird
    print("[1] Conectando a Firebird...")
    fb_conn = fdb.connect(
        database=FIREBIRD_DB,
        user='SYSDBA',
        password='masterkey',
        fb_library_name=FIREBIRD_DLL,
        charset='WIN1252'
    )
    fb_cursor = fb_conn.cursor()
    print("    [OK] Conectado a Firebird")
    
    # Conectar a SQLite
    print("[2] Conectando a SQLite...")
    sq_conn = sqlite3.connect(SQLITE_DB)
    sq_cursor = sq_conn.cursor()
    print("    [OK] Conectado a SQLite")
    
    # Obtener departamentos para mapeo
    print("\n[3] Leyendo departamentos...")
    fb_cursor.execute('SELECT ID, NOMBRE FROM DEPARTAMENTOS')
    depts = {row[0]: row[1] for row in fb_cursor.fetchall()}
    print(f"    [OK] {len(depts)} departamentos encontrados")
    
    # También revisar DEPTS por si tiene más info
    fb_cursor.execute('SELECT * FROM DEPTS')
    depts_extra = {}
    cols = [desc[0] for desc in fb_cursor.description]
    print(f"    Columnas DEPTS: {cols}")
    for row in fb_cursor.fetchall():
        if len(row) >= 2:
            depts_extra[row[0]] = row[1] if row[1] else f'Dept {row[0]}'
    
    # Combinar departamentos
    all_depts = {**depts_extra, **depts}
    print(f"    [OK] Total departamentos combinados: {len(all_depts)}")
    
    # Obtener productos de Firebird
    print("\n[4] Leyendo productos de Firebird...")
    fb_cursor.execute('''
        SELECT CODIGO, DESCRIPCION, PCOSTO, PVENTA, DEPT, DINVENTARIO, DINVMINIMO
        FROM PRODUCTOS 
        ORDER BY DESCRIPCION
    ''')
    products = fb_cursor.fetchall()
    print(f"    [OK] {len(products)} productos encontrados")
    
    # Mostrar algunos ejemplos
    print("\n    Ejemplos de productos:")
    for p in products[:5]:
        codigo, desc, costo, precio, dept, inv, inv_min = p
        print(f"      {codigo}: {desc[:30]} - ${precio:.2f}")
    
    # Importar productos
    print("\n[5] Importando productos a SQLite...")
    imported = 0
    updated = 0
    skipped = 0
    errors = 0
    
    for codigo, descripcion, pcosto, pventa, dept_id, stock, min_stock in products:
        try:
            # Limpiar código (quitar prefijos F, FF, etc.)
            clean_code = str(codigo).strip()
            if clean_code.startswith('FF'):
                clean_code = clean_code[2:]
            elif clean_code.startswith('F'):
                clean_code = clean_code[1:]
            
            # Obtener categoría
            category = all_depts.get(dept_id, 'General') if dept_id else 'General'
            if category == '- Sin Departamento -':
                category = 'General'
            
            # Limpiar descripción
            desc = (descripcion or '').strip()
            if not desc:
                desc = f'Producto {clean_code}'
            
            # Valores por defecto
            cost = float(pcosto or 0)
            price = float(pventa or 0)
            inventory = int(stock or 0)
            min_inv = int(min_stock or 5)
            
            # Verificar si ya existe
            sq_cursor.execute('SELECT id, public_price FROM products WHERE code = ?', (clean_code,))
            existing = sq_cursor.fetchone()
            
            if existing:
                # Actualizar si el nuevo tiene precio y el actual no
                if price > 0 and (existing[1] == 0 or existing[1] is None):
                    sq_cursor.execute('''
                        UPDATE products 
                        SET name = ?, category = ?, purchase_cost = ?, public_price = ?, stock = ?, min_stock = ?
                        WHERE code = ?
                    ''', (desc, category, cost, price, inventory, min_inv, clean_code))
                    updated += 1
                else:
                    skipped += 1
                continue
            
            # Insertar producto nuevo
            sq_cursor.execute('''
                INSERT INTO products (code, name, description, category, purchase_cost, public_price, stock, min_stock, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (clean_code, desc, '', category, cost, price, inventory, min_inv))
            
            imported += 1
            
            if imported % 200 == 0:
                print(f"    Importados: {imported}...")
                
        except Exception as e:
            errors += 1
            if errors <= 5:
                print(f"    [X] Error en {codigo}: {e}")
    
    sq_conn.commit()
    
    # Resumen
    print("\n" + "=" * 70)
    print("RESUMEN DE IMPORTACIÓN")
    print("=" * 70)
    print(f"  [OK] Nuevos importados: {imported}")
    print(f"  [UPD] Actualizados: {updated}")
    print(f"  - Omitidos (ya existían): {skipped}")
    print(f"  [X] Errores: {errors}")
    print(f"  Total procesados: {len(products)}")
    
    # Verificar total en SQLite
    sq_cursor.execute('SELECT COUNT(*) FROM products')
    total = sq_cursor.fetchone()[0]
    
    sq_cursor.execute('SELECT COUNT(*) FROM products WHERE public_price > 0')
    with_price = sq_cursor.fetchone()[0]
    
    print(f"\n   Total productos en sistema: {total}")
    print(f"   Con precio asignado: {with_price}")
    
    # Mostrar distribución por categoría
    print("\n   Distribución por categoría:")
    sq_cursor.execute('''
        SELECT category, COUNT(*) as count 
        FROM products 
        GROUP BY category 
        ORDER BY count DESC 
        LIMIT 10
    ''')
    for cat, count in sq_cursor.fetchall():
        print(f"      {cat}: {count}")
    
    fb_conn.close()
    sq_conn.close()
    
    print("\n" + "=" * 70)
    print("[OK] IMPORTACIÓN COMPLETADA")
    print("=" * 70)

if __name__ == "__main__":
    import_products()
