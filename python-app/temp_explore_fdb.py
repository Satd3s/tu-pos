# Script para intentar descifrar usando tabla de sustitución
import fdb
import os

DB_PATH = 'PDVDATA_RESTORED.FDB'
FIREBIRD_DLL = 'firebird64/fbembed.dll'

conn = fdb.connect(
    database=os.path.abspath(DB_PATH),
    user='SYSDBA',
    password='masterkey',
    fb_library_name=os.path.abspath(FIREBIRD_DLL),
    charset='WIN1252'
)

cursor = conn.cursor()

# Obtener varios productos
cursor.execute('SELECT FIRST 100 CODIGO, DESCRIPCION FROM PRODUCTOS_BASE')
products = cursor.fetchall()

# Analizar frecuencia de letras (en español la E es la más común)
from collections import Counter

all_text = ''.join([p[1] for p in products])
letter_freq = Counter(c.upper() for c in all_text if c.isalpha())

print("Frecuencia de letras cifradas (TOP 10):")
for letter, count in letter_freq.most_common(10):
    print(f"  {letter}: {count}")

# En texto español normal, el orden es: E A O S N R I L D T
# Intentar mapeo simple

print("\n\nBuscando patrones conocidos...")
# Buscar productos con códigos de Coca-Cola conocidos
cursor.execute("SELECT CODIGO, DESCRIPCION FROM PRODUCTOS_BASE WHERE CODIGO LIKE '75010553%' OR CODIGO LIKE '7501055%'")
for code, desc in cursor.fetchall()[:10]:
    print(f"{code}: {desc}")

# También buscar el código 11110032 (coca cola 1lt de tu sistema)
cursor.execute("SELECT CODIGO, DESCRIPCION FROM PRODUCTOS_BASE WHERE CODIGO = '11110032'")
result = cursor.fetchall()
if result:
    print(f"\nCódigo 11110032: {result[0][1]}")
else:
    print("\n11110032 no encontrado en catálogo base")

conn.close()
