# Script para analizar la base de datos de AbarrotesPDV
import firebirdsql
import json

# Ruta correcta
DB_PATH = r"C:\Program Files (x86)\AbarrotesPDV\db\PDVDATA.FDB"

def analyze_database():
    """Analizar la estructura de la base de datos de AbarrotesPDV"""
    
    configs = [
        {'host': 'localhost', 'port': 3050},
        {'host': '127.0.0.1', 'port': 3050},
        {'host': 'localhost', 'port': 3051},
        {'host': '127.0.0.1', 'port': 3051},
    ]
    
    con = None
    
    for cfg in configs:
        try:
            print(f"Intentando: {cfg['host']}:{cfg['port']}")
            con = firebirdsql.connect(
                host=cfg['host'],
                port=cfg['port'],
                database=DB_PATH,
                user='SYSDBA',
                password='masterkey',
                charset='WIN1252'
            )
            print("✅ Conexión exitosa!")
            break
        except Exception as e:
            print(f"  ❌ {str(e)[:50]}")
    
    if not con:
        print("\n⚠️ No se pudo conectar al servidor Firebird.")
        print("Asegúrate de que AbarrotesPDV esté abierto.")
        return
    
    cur = con.cursor()
    
    # Obtener todas las tablas
    print("\n" + "="*60)
    print("📊 ANÁLISIS DE BASE DE DATOS ABARROTESPDV")
    print("="*60)
    
    cur.execute("""
        SELECT RDB$RELATION_NAME 
        FROM RDB$RELATIONS 
        WHERE RDB$SYSTEM_FLAG = 0
        ORDER BY RDB$RELATION_NAME
    """)
    
    tables = [row[0].strip() for row in cur.fetchall()]
    
    # Categorizar tablas
    categories = {
        'Productos': [],
        'Ventas': [],
        'Compras': [],
        'Clientes': [],
        'Proveedores': [],
        'Inventario': [],
        'Caja': [],
        'Configuración': [],
        'Otros': []
    }
    
    for table in tables:
        t = table.upper()
        if any(x in t for x in ['PROD', 'ART', 'ITEM', 'MERCA']):
            categories['Productos'].append(table)
        elif any(x in t for x in ['VENT', 'SALE', 'TICKET']):
            categories['Ventas'].append(table)
        elif any(x in t for x in ['COMP', 'PURCH', 'ENTRA']):
            categories['Compras'].append(table)
        elif any(x in t for x in ['CLIENT', 'CUST']):
            categories['Clientes'].append(table)
        elif any(x in t for x in ['PROV', 'SUPP']):
            categories['Proveedores'].append(table)
        elif any(x in t for x in ['INVENT', 'STOCK', 'EXIST']):
            categories['Inventario'].append(table)
        elif any(x in t for x in ['CAJA', 'CASH', 'TURNO', 'CORTE']):
            categories['Caja'].append(table)
        elif any(x in t for x in ['CONFIG', 'PARAM', 'SETT']):
            categories['Configuración'].append(table)
        else:
            categories['Otros'].append(table)
    
    # Mostrar análisis
    for cat, tbl_list in categories.items():
        if tbl_list:
            print(f"\n📁 {cat.upper()}:")
            for t in tbl_list:
                try:
                    cur.execute(f"SELECT COUNT(*) FROM {t}")
                    count = cur.fetchone()[0]
                    
                    cur.execute(f"SELECT FIRST 1 * FROM {t}")
                    cols = [d[0] for d in cur.description]
                    
                    print(f"   • {t} ({count} registros)")
                    print(f"     Columnas: {', '.join(cols[:5])}{'...' if len(cols) > 5 else ''}")
                except Exception as e:
                    print(f"   • {t} (error: {str(e)[:30]})")
    
    # Buscar tabla de productos/catálogo
    print("\n" + "="*60)
    print("🔍 BUSCANDO CATÁLOGO DE PRODUCTOS")
    print("="*60)
    
    for table in tables:
        try:
            cur.execute(f"SELECT COUNT(*) FROM {table}")
            count = cur.fetchone()[0]
            
            if count > 100:  # Tablas con muchos registros
                cur.execute(f"SELECT FIRST 1 * FROM {table}")
                cols = [d[0].upper() for d in cur.description]
                
                # Buscar columnas típicas de productos
                if any(c in ' '.join(cols) for c in ['CODIGO', 'BARR', 'UPC', 'EAN', 'NOMBRE', 'DESCRIP', 'PRECIO']):
                    print(f"\n✅ Posible catálogo: {table} ({count} productos)")
                    print(f"   Columnas: {cols}")
                    
                    # Mostrar ejemplos
                    cur.execute(f"SELECT FIRST 5 * FROM {table}")
                    print("   Ejemplos:")
                    for row in cur.fetchall():
                        print(f"   {row[:4]}...")
        except:
            pass
    
    con.close()
    print("\n✨ Análisis completado!")

if __name__ == '__main__':
    analyze_database()
