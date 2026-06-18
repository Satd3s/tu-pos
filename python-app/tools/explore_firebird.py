# =============================================================================
# EXPLORADOR DE BASE DE DATOS FIREBIRD (AbarrotesPDV)
# Script para explorar la estructura y extraer productos
# =============================================================================

import fdb
import os
import sys

# Directorio base del proyecto
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Ruta a la base de datos Firebird (en la carpeta padre de python-app)
DB_PATH = os.path.join(BASE_DIR, '..', 'AbarrotesPDV', 'db', 'PDVDATA.FDB')

# Ruta a las DLLs de Firebird 64-bit EMBEDDED
FIREBIRD_DLL = os.path.join(BASE_DIR, 'firebird64', 'fbembed.dll')

def explore_database():
    """Explorar la estructura de la base de datos Firebird"""
    print("=" * 60)
    print("EXPLORADOR DE BASE DE DATOS FIREBIRD - AbarrotesPDV")
    print("=" * 60)
    print(f"\nRuta DB: {os.path.abspath(DB_PATH)}")
    print(f"Ruta DLL: {os.path.abspath(FIREBIRD_DLL)}")
    
    if not os.path.exists(DB_PATH):
        print(f"\n[ERROR] No se encontro la base de datos en: {os.path.abspath(DB_PATH)}")
        return
    
    if not os.path.exists(FIREBIRD_DLL):
        print(f"\n[ERROR] No se encontro fbembed.dll en: {os.path.abspath(FIREBIRD_DLL)}")
        return
    
    try:
        # Conectar a la base de datos en modo embedded
        print("\n[INFO] Conectando a la base de datos (modo embedded)...")
        
        conn = fdb.connect(
            database=os.path.abspath(DB_PATH),
            user='SYSDBA',
            password='masterkey',
            fb_library_name=os.path.abspath(FIREBIRD_DLL),
            charset='WIN1252'
        )
        
        print("[OK] Conexion exitosa!\n")
        
        cursor = conn.cursor()
        
        # Obtener lista de tablas
        print("TABLAS EN LA BASE DE DATOS:")
        print("-" * 40)
        
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND RDB$VIEW_BLR IS NULL
            ORDER BY RDB$RELATION_NAME
        """)
        
        tables = []
        for row in cursor.fetchall():
            table_name = row[0].strip()
            tables.append(table_name)
            print(f"  - {table_name}")
        
        print(f"\nTotal: {len(tables)} tablas\n")
        
        # Mostrar estructura de TODAS las tablas con conteo
        print("=" * 60)
        print("ESTRUCTURA DE TABLAS:")
        print("=" * 60)
        
        for table in tables:
            print(f"\n>> {table}")
            cursor.execute(f"""
                SELECT RDB$FIELD_NAME 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = '{table}'
                ORDER BY RDB$FIELD_POSITION
            """)
            
            cols = [col[0].strip() for col in cursor.fetchall()]
            print(f"   Columnas: {', '.join(cols[:8])}")
            if len(cols) > 8:
                print(f"   ... y {len(cols) - 8} columnas mas")
            
            # Contar registros
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   Registros: {count}")
            except Exception as e:
                print(f"   (Error: {e})")
        
        conn.close()
        print("\n[OK] Exploracion completada!")
        
    except Exception as e:
        print(f"\n[ERROR] al conectar: {e}")
        print("\nPosibles soluciones:")
        print("1. Verificar que la base de datos no este siendo usada por otro programa")
        print("2. Cerrar el programa Abarrotes si esta abierto")
        print("3. Verificar credenciales (SYSDBA/masterkey es el default)")

if __name__ == "__main__":
    explore_database()
