# =============================================================================
# EXTRACTOR DE PRODUCTOS - USANDO ISQL NATIVO
# Usa las herramientas nativas de 32-bit para exportar a CSV
# =============================================================================

import subprocess
import os
import csv
import json

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ABARROTES_DIR = r"C:\Users\_SATD3S_\Documents\AbarrotesPDV"
DB_PATH = os.path.join(ABARROTES_DIR, "db", "PDVDATA.FDB")

def run_isql_query(query, output_file=None):
    """Ejecutar query SQL usando isql nativo de 32-bit"""
    
    # Crear archivo temporal con el query
    sql_file = os.path.join(BASE_DIR, "temp_query.sql")
    with open(sql_file, 'w') as f:
        f.write(query + ";\n")
    
    # Construir comando
    isql_path = os.path.join(ABARROTES_DIR, "isql.exe")
    
    # Si no existe isql en Abarrotes, intentar usar el que tenemos en firebird64
    if not os.path.exists(isql_path):
        print(f"[WARN] No se encontro isql.exe en {ABARROTES_DIR}")
        return None
    
    cmd = f'"{isql_path}" -u SYSDBA -p masterkey "{DB_PATH}" -i "{sql_file}"'
    
    if output_file:
        cmd += f' -o "{output_file}"'
    
    print(f"[INFO] Ejecutando: {cmd}")
    
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            cwd=ABARROTES_DIR,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode != 0:
            print(f"[ERROR] {result.stderr}")
            return None
        
        return result.stdout
        
    except Exception as e:
        print(f"[ERROR] {e}")
        return None
    finally:
        if os.path.exists(sql_file):
            os.remove(sql_file)

def list_tables():
    """Listar todas las tablas de la base de datos"""
    query = """
    SELECT RDB$RELATION_NAME 
    FROM RDB$RELATIONS 
    WHERE RDB$SYSTEM_FLAG = 0 
    AND RDB$VIEW_BLR IS NULL
    """
    
    output_file = os.path.join(BASE_DIR, "tables.txt")
    result = run_isql_query(query, output_file)
    
    if os.path.exists(output_file):
        with open(output_file, 'r') as f:
            content = f.read()
            print(content)
        return content
    
    return result

def main():
    print("=" * 60)
    print("EXTRACTOR DE PRODUCTOS - ABARROTES PDV")
    print("=" * 60)
    
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] No se encontro la base de datos: {DB_PATH}")
        return
    
    print(f"[OK] Base de datos: {DB_PATH}")
    
    # Verificar herramientas
    isql_path = os.path.join(ABARROTES_DIR, "isql.exe")
    if not os.path.exists(isql_path):
        print(f"[ERROR] No se encontro isql.exe")
        print("Buscando alternativas...")
        
        # Listar ejecutables disponibles
        for f in os.listdir(ABARROTES_DIR):
            if f.endswith('.exe'):
                print(f"  - {f}")
        return
    
    print(f"[OK] isql.exe encontrado")
    print("\n" + "-" * 40)
    print("Listando tablas...")
    print("-" * 40)
    
    list_tables()

if __name__ == "__main__":
    main()
