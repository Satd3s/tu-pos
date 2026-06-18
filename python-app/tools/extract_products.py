# =============================================================================
# EXTRACTOR DE PRODUCTOS DE ABARROTES PDV
# Extrae productos de la BD Firebird y los exporta a CSV/JSON
# =============================================================================

import os
import sys
import json
import csv

# Intentar con fdb primero (mas compatible)
try:
    import fdb
    USE_FDB = True
except ImportError:
    USE_FDB = False

# Directorio base del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Rutas posibles de la base de datos
DB_PATHS = [
    os.path.join(BASE_DIR, 'PDVDATA_RESTORED.FDB'),  # Archivo restaurado local (Prioridad 1)
    r"C:\Users\_SATD3S_\Documents\AbarrotesPDV\db\PDVDATA.FDB",  # Nueva instalacion
    os.path.join(BASE_DIR, '..', 'AbarrotesPDV', 'db', 'PDVDATA.FDB'),  # Copia en proyecto
]

# DLLs de Firebird 
FIREBIRD_DLLS = [
    os.path.join(BASE_DIR, 'firebird64', 'fbclient.dll'),  # Client 64-bit (Prioridad 1)
    os.path.join(BASE_DIR, 'firebird64', 'fbembed.dll'),  # Embedded 64-bit
    r"C:\Users\_SATD3S_\Documents\AbarrotesPDV\fbclient.dll",  # Original 32-bit
]

def find_valid_paths():
    """Encontrar rutas validas de BD y DLL"""
    db_path = None
    dll_path = None
    
    for path in DB_PATHS:
        if os.path.exists(path):
            db_path = os.path.abspath(path)
            print(f"[OK] Base de datos encontrada: {db_path}")
            break
    
    for path in FIREBIRD_DLLS:
        if os.path.exists(path):
            dll_path = os.path.abspath(path)
            print(f"[OK] DLL Firebird encontrada: {dll_path}")
            break
    
    return db_path, dll_path

def extract_products_fdb(db_path, dll_path):
    """Extraer productos usando la libreria fdb"""
    print("\n[INFO] Intentando conexion con fdb...")
    
    try:
        conn = fdb.connect(
            database=db_path,
            user='SYSDBA',
            password='masterkey',
            fb_library_name=dll_path,
            charset='WIN1252'
        )
        
        print("[OK] Conexion exitosa!")
        cursor = conn.cursor()
        
        # Primero, listar todas las tablas para encontrar la de productos
        print("\n[INFO] Buscando tablas...")
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND RDB$VIEW_BLR IS NULL
            ORDER BY RDB$RELATION_NAME
        """)
        
        tables = [row[0].strip() for row in cursor.fetchall()]
        print(f"Tablas encontradas: {', '.join(tables)}")
        
        # Buscar tabla de productos (nombres comunes)
        product_table = None
        for name in ['PRODUCTOS', 'ARTICULOS', 'ITEMS', 'PRODUCTO', 'ARTICULO']:
            if name in tables:
                product_table = name
                break
        
        if not product_table:
            # Mostrar todas las tablas y sus columnas para identificar
            print("\n[INFO] No se encontro tabla de productos obvia.")
            print("Mostrando estructura de todas las tablas:\n")
            
            for table in tables:
                cursor.execute(f"""
                    SELECT RDB$FIELD_NAME 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = '{table}'
                    ORDER BY RDB$FIELD_POSITION
                """)
                cols = [col[0].strip() for col in cursor.fetchall()]
                
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                
                print(f">> {table} ({count} registros)")
                print(f"   Columnas: {', '.join(cols[:6])}")
                if len(cols) > 6:
                    print(f"   ... y {len(cols) - 6} mas")
                print()
            
            conn.close()
            return None
        
        # Extraer productos
        print(f"\n[INFO] Extrayendo productos de tabla: {product_table}")
        
        # Obtener columnas
        cursor.execute(f"""
            SELECT RDB$FIELD_NAME 
            FROM RDB$RELATION_FIELDS 
            WHERE RDB$RELATION_NAME = '{product_table}'
            ORDER BY RDB$FIELD_POSITION
        """)
        columns = [col[0].strip() for col in cursor.fetchall()]
        print(f"Columnas: {columns}")
        
        # Extraer todos los productos
        cursor.execute(f"SELECT * FROM {product_table}")
        products = []
        
        for row in cursor.fetchall():
            product = {}
            for i, col in enumerate(columns):
                value = row[i]
                if isinstance(value, bytes):
                    try:
                        value = value.decode('latin-1')
                    except:
                        value = str(value)
                product[col] = value
            products.append(product)
        
        print(f"\n[OK] {len(products)} productos extraidos!")
        
        conn.close()
        return products
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return None

def save_products(products, output_dir):
    """Guardar productos en CSV y JSON"""
    if not products:
        return
    
    # CSV
    csv_path = os.path.join(output_dir, 'productos_abarrotes.csv')
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=products[0].keys())
        writer.writeheader()
        writer.writerows(products)
    print(f"[OK] CSV guardado: {csv_path}")
    
    # JSON
    json_path = os.path.join(output_dir, 'productos_abarrotes.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(products, f, ensure_ascii=False, indent=2, default=str)
    print(f"[OK] JSON guardado: {json_path}")

def main():
    print("=" * 60)
    print("EXTRACTOR DE PRODUCTOS - ABARROTES PDV")
    print("=" * 60)
    
    db_path, dll_path = find_valid_paths()
    
    if not db_path:
        print("\n[ERROR] No se encontro la base de datos!")
        return
    
    if not dll_path:
        print("\n[ERROR] No se encontro la DLL de Firebird!")
        return
    
    products = extract_products_fdb(db_path, dll_path)
    
    if products:
        save_products(products, BASE_DIR)
        print("\n" + "=" * 60)
        print(f"EXITO! Se extrajeron {len(products)} productos")
        print("=" * 60)

if __name__ == "__main__":
    main()
