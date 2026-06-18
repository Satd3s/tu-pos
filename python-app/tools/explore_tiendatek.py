import sqlite3
import os

db_path = r'c:\Users\_SATD3S_\Documents\InventorySystem\tiendatek\app.db'

print("=" * 60)
print("Explorando base de datos de Tiendatek")
print("=" * 60)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Listar tablas
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()

print(f"\nTablas encontradas ({len(tables)}):")
for t in tables:
    cursor.execute(f"SELECT COUNT(*) FROM [{t[0]}]")
    count = cursor.fetchone()[0]
    print(f"  - {t[0]}: {count} registros")

# Buscar tabla de productos
product_tables = [t[0] for t in tables if 'product' in t[0].lower() or 'articulo' in t[0].lower() or 'item' in t[0].lower()]

print(f"\nTablas que parecen contener productos: {product_tables}")

# Mostrar estructura de cada tabla de productos
for table in product_tables:
    print(f"\n{'=' * 60}")
    print(f"Estructura de tabla: {table}")
    print("=" * 60)
    cursor.execute(f"PRAGMA table_info([{table}])")
    columns = cursor.fetchall()
    for col in columns:
        print(f"  {col[1]} ({col[2]})")
    
    # Mostrar ejemplo de registros
    print(f"\nEjemplo de registros (primeros 3):")
    cursor.execute(f"SELECT * FROM [{table}] LIMIT 3")
    rows = cursor.fetchall()
    col_names = [c[1] for c in columns]
    for row in rows:
        print("-" * 40)
        for i, val in enumerate(row):
            if val and str(val).strip():
                print(f"  {col_names[i]}: {val}")

conn.close()
print("\n" + "=" * 60)
