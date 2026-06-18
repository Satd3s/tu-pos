# =============================================================================
# SCRIPT DE IMPORTACIÓN DE PRODUCTOS DESDE FIREBIRD A SQLITE
# Importa productos desde pdvdata.fdb a inventory.db
# =============================================================================

import fdb
import sqlite3
import os

# Rutas
FIREBIRD_DB = '../pdvdata.fdb'
FIREBIRD_DLL = 'firebird64/fbembed.dll'
SQLITE_DB = 'inventory.db'

def import_products():
    print("=" * 60)
    print("IMPORTACIÓN DE PRODUCTOS FIREBIRD -> SQLITE")
    print("=" * 60)
    
    # Conectar a Firebird
    print("\n[1] Conectando a Firebird...")
    fb_conn = fdb.connect(
        database=os.path.abspath(FIREBIRD_DB),
        user='SYSDBA',
        password='masterkey',
        fb_library_name=os.path.abspath(FIREBIRD_DLL),
        charset='WIN1252'
    )
    fb_cursor = fb_conn.cursor()
    print("    [OK] Conectado a Firebird")
    
    # Conectar a SQLite
    print("\n[2] Conectando a SQLite...")
    sq_conn = sqlite3.connect(SQLITE_DB)
    sq_cursor = sq_conn.cursor()
    print("    [OK] Conectado a SQLite")
    
    # Obtener productos de Firebird
    print("\n[3] Leyendo productos de Firebird...")
    fb_cursor.execute('''
        SELECT CODIGO, DESCRIPCION, PCOSTO, PVENTA, DEPT, DINVENTARIO 
        FROM PRODUCTOS 
        ORDER BY DESCRIPCION
    ''')
    products = fb_cursor.fetchall()
    print(f"    Encontrados: {len(products)} productos")
    
    # Obtener departamentos para mapeo
    print("\n[4] Leyendo departamentos...")
    try:
        fb_cursor.execute('SELECT * FROM DEPARTAMENTOS')
        cols = [desc[0] for desc in fb_cursor.description]
        print(f"    Columnas: {cols}")
        depts = {}
        for row in fb_cursor.fetchall():
            # Usar primera columna como ID, segunda como nombre
            depts[row[0]] = row[1] if len(row) > 1 else f'Dept {row[0]}'
    except:
        depts = {}
    print(f"    Encontrados: {len(depts)} departamentos")
    
    # Importar productos
    print("\n[5] Importando productos a SQLite...")
    imported = 0
    skipped = 0
    errors = 0
    
    for codigo, descripcion, pcosto, pventa, dept_id, stock in products:
        try:
            # Limpiar código (quitar prefijos F, FF, etc.)
            clean_code = codigo.strip()
            if clean_code.startswith('FF'):
                clean_code = clean_code[2:]
            elif clean_code.startswith('F'):
                clean_code = clean_code[1:]
            
            # Obtener categoría
            category = depts.get(dept_id, 'General') if dept_id else 'General'
            
            # Limpiar descripción
            desc = (descripcion or '').strip()
            if not desc:
                desc = f'Producto {clean_code}'
            
            # Valores por defecto
            cost = float(pcosto or 0)
            price = float(pventa or 0)
            inventory = int(stock or 0)
            
            # Verificar si ya existe
            sq_cursor.execute('SELECT id FROM products WHERE code = ?', (clean_code,))
            existing = sq_cursor.fetchone()
            
            if existing:
                skipped += 1
                continue
            
            # Insertar producto
            sq_cursor.execute('''
                INSERT INTO products (code, name, description, category, purchase_cost, public_price, stock, min_stock, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            ''', (clean_code, desc, '', category, cost, price, inventory, 5))
            
            imported += 1
            
            if imported % 100 == 0:
                print(f"    Importados: {imported}...")
                
        except Exception as e:
            errors += 1
            print(f"    [ERROR] {codigo}: {e}")
    
    sq_conn.commit()
    
    # Resumen
    print("\n" + "=" * 60)
    print("RESUMEN DE IMPORTACION:")
    print("=" * 60)
    print(f"  [OK] Importados: {imported}")
    print(f"  [--] Omitidos (ya existian): {skipped}")
    print(f"  [X] Errores: {errors}")
    print(f"  Total procesados: {len(products)}")
    
    # Verificar total en SQLite
    sq_cursor.execute('SELECT COUNT(*) FROM products')
    total = sq_cursor.fetchone()[0]
    print(f"\n  Total productos en sistema: {total}")
    
    fb_conn.close()
    sq_conn.close()
    
    print("\n[OK] Importación completada!")

if __name__ == "__main__":
    import_products()
