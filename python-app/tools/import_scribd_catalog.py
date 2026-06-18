# Catálogo de productos extraídos de Scribd
# Agregará estos productos a la base de datos del catálogo del POS

import sqlite3
import os

# Ruta a la base de datos del catálogo
DB_PATH = r'c:\Users\_SATD3S_\Documents\InventorySystem\python-app\data\catalog.db'

# Lista de productos extraídos
PRODUCTOS = [
    # Productos Mexicanos (EAN-13, Prefijo 750)
    ("7501073427532", "CEREAL MINI TRIX"),
    ("7501204905212", "LAUREL"),
    ("7501005108102", "MANTEQUILLA MARGARINA"),
    
    # Bebidas
    ("7801610323236", "COCA COLA 3.0 LT"),
    ("7801610001615", "COCA COLA 2.0 LT"),
    ("7801610001196", "COCA COLA LATA 350 ML"),
    ("7801610250006", "COCA COLA 2.5 LT"),
    ("7801610005248", "SPRITE 2.0 LT"),
    ("7801610002247", "FANTA 2.0 LT"),
    ("7801610005194", "SPRITE LATA 350 ML"),
    ("7801610880104", "COCA COLA EXPRESS 237 ML"),
    ("7801610002193", "FANTA LATA 350 ML"),
    ("7801610203507", "NORDIC GINGER LATA 350 ML"),
    ("7801620006631", "AGUA CACHANTUN GRANADA 1.6 LT"),
    ("7801610484203", "AQUARIUS POMELO 1.5 LT"),
    
    # Higiene y Limpieza
    ("7804920015501", "SHAMPOO MANZANILLA 60 ML"),
    ("7804920041371", "ACONDICIONADOR MANZANILLA 60 ML"),
    ("7805000141271", "SUAVIZANTE SOFT CLASICO 1 LT"),
    ("7806500401414", "TOALLA NOVA CLASICA"),
    ("7804920015143", "SHAMPOO HIPOALERGENICO 60 ML"),
    ("7702626204208", "VANISH 30 GRS"),
    ("7791293020099", "JABON LE SANCY 90 GRS"),
    
    # Abarrotes
    ("7802600133217", "AVENA INSTANTANEA QUAKER 500 GRS"),
    ("7802600131121", "AVENA TRADICIONAL QUAKER 500 GRS"),
    ("7802950006827", "PURE DE PAPAS MAGGI 250 GRS"),
    ("7803000000857", "LEVADURA 10 GRS"),
    ("7801534001074", "CHAMPINONES DEYCO 400 GRS"),
    ("7801305001883", "PALMITOS RODAJAS 400 GRS"),
    
    # Maruchan
    ("41789001888", "MARUCHAN CARNE ASADA"),
    ("41789001956", "MARUCHAN CAMARON"),
    
    # Pastas
    ("7802575002235", "ESPIRALES CAROZZI 400 GRS"),
    ("7802575002433", "CARACOLES CAROZZI 400 GRS"),
    
    # Galletas y Snacks
    ("7802215511615", "SODA MINI"),
    ("7802215501968", "SODA COSTA GRANDE"),
    ("7802225683289", "GALLETA CRACKER MINI"),
    ("7613032464042", "GALLETA MINI TRITON"),
    ("7802408015241", "GALLETA SERRANITA"),
    ("7802215504655", "GALLETA NIK BOCADO"),
    ("7802225682930", "GALLETA MINI SELZ JAMON"),
    ("7802420003233", "MANI SALADO 300 GR"),
]

def crear_tabla_si_no_existe(conn):
    """Crea la tabla del catálogo si no existe"""
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS productos_catalogo (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT UNIQUE NOT NULL,
            nombre TEXT NOT NULL,
            categoria TEXT,
            fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

def agregar_productos(conn, productos):
    """Agrega los productos al catálogo"""
    cursor = conn.cursor()
    agregados = 0
    existentes = 0
    
    for codigo, nombre in productos:
        try:
            cursor.execute('''
                INSERT INTO productos_catalogo (codigo, nombre)
                VALUES (?, ?)
            ''', (codigo, nombre))
            agregados += 1
        except sqlite3.IntegrityError:
            # El producto ya existe
            existentes += 1
    
    conn.commit()
    return agregados, existentes

def main():
    # Crear directorio si no existe
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    # Conectar a la base de datos
    conn = sqlite3.connect(DB_PATH)
    
    try:
        # Crear tabla si no existe
        crear_tabla_si_no_existe(conn)
        
        # Agregar productos
        agregados, existentes = agregar_productos(conn, PRODUCTOS)
        
        print("=" * 50)
        print("IMPORTACION DE CATALOGO COMPLETADA")
        print("=" * 50)
        print(f"Productos agregados: {agregados}")
        print(f"Productos ya existentes: {existentes}")
        print(f"Total procesados: {len(PRODUCTOS)}")
        print("=" * 50)
        
        # Mostrar algunos productos como confirmacion
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM productos_catalogo")
        total = cursor.fetchone()[0]
        print(f"\nTotal de productos en el catalogo: {total}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    main()
