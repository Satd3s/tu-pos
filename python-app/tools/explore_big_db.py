# =============================================================================
# EXPLORADOR DE BASE DE DATOS GRANDE (48MB)
# =============================================================================

import fdb
import os

BASE_DIR = os.path.dirname(os.path.dirname(__file__))
DB_PATH = os.path.join(os.path.dirname(BASE_DIR), 'pdvdata.fdb')
DLL_PATH = os.path.join(BASE_DIR, 'firebird64', 'fbembed.dll')

def explore_database():
    print("=" * 60)
    print("EXPLORADOR DE BASE DE DATOS FIREBIRD (48MB)")
    print("=" * 60)
    print(f"\nBase de datos: {DB_PATH}")
    print(f"Tamaño: {os.path.getsize(DB_PATH) / 1024 / 1024:.2f} MB")
    print()
    
    try:
        conn = fdb.connect(
            database=DB_PATH,
            user='SYSDBA',
            password='masterkey',
            fb_library_name=DLL_PATH,
            charset='WIN1252'
        )
        cur = conn.cursor()
        
        # Listar tablas
        cur.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        
        tables = [row[0].strip() for row in cur.fetchall()]
        print(f"=== {len(tables)} TABLAS ENCONTRADAS ===\n")
        
        for table in tables:
            try:
                cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cur.fetchone()[0]
                print(f"  {table}: {count} registros")
            except Exception as e:
                print(f"  {table}: Error - {str(e)[:50]}")
        
        # Buscar tabla de productos
        print("\n" + "=" * 60)
        print("BUSCANDO TABLA DE PRODUCTOS...")
        print("=" * 60)
        
        product_tables = [t for t in tables if 'PROD' in t.upper() or 'ART' in t.upper() or 'ITEM' in t.upper()]
        
        for table in product_tables:
            print(f"\n--- Estructura de {table} ---")
            try:
                cur.execute(f'SELECT FIRST 1 * FROM "{table}"')
                cols = [desc[0] for desc in cur.description]
                print(f"Columnas: {cols}")
                
                cur.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cur.fetchone()[0]
                print(f"Total registros: {count}")
                
                if count > 0:
                    cur.execute(f'SELECT FIRST 5 * FROM "{table}"')
                    print("\nPrimeros 5 registros:")
                    for row in cur.fetchall():
                        print(f"  {row[:5]}...")  # Solo primeras 5 columnas
            except Exception as e:
                print(f"Error: {e}")
        
        conn.close()
        print("\n[OK] Exploración completada")
        
    except Exception as e:
        print(f"Error de conexión: {e}")

if __name__ == "__main__":
    explore_database()
