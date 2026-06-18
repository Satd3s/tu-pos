# =============================================================================
# PARSER DE BACKUP FIREBIRD
# Extrae datos de productos del archivo .fbk
# =============================================================================

import os
import re
import json
import csv

def extract_strings_from_backup(filepath):
    """Extraer todas las cadenas legibles del archivo de backup"""
    
    with open(filepath, 'rb') as f:
        content = f.read()
    
    # Buscar patrones de texto legible
    # El backup tiene strings precedidos por su longitud
    
    strings = []
    i = 0
    while i < len(content) - 1:
        # Buscar secuencias de bytes imprimibles
        if 32 <= content[i] <= 126:  # ASCII imprimible
            start = i
            while i < len(content) and 32 <= content[i] <= 126:
                i += 1
            if i - start >= 4:  # Al menos 4 caracteres
                try:
                    s = content[start:i].decode('latin-1')
                    strings.append(s)
                except:
                    pass
        i += 1
    
    return strings

def find_product_patterns(strings):
    """Buscar patrones que parecen ser productos (codigo + descripcion)"""
    
    products = []
    
    # Patron de codigo de barras (13 digitos o formatos similares)
    barcode_pattern = re.compile(r'^\d{7,14}$')
    
    # Buscar patrones consecutivos
    for i, s in enumerate(strings):
        if barcode_pattern.match(s):
            # Encontramos un posible codigo de barras
            # La descripcion suele estar cerca
            context = strings[max(0,i-3):min(len(strings),i+5)]
            products.append({
                'codigo': s,
                'contexto': context
            })
    
    return products

def parse_backup_structured(filepath):
    """Parsear el backup buscando la estructura de tablas"""
    
    with open(filepath, 'rb') as f:
        content = f.read()
    
    print(f"Archivo: {filepath}")
    print(f"Tamano: {len(content)} bytes")
    print()
    
    # Buscar nombres de tablas (suelen estar en mayusculas seguidos de metadatos)
    tables = []
    table_pattern = re.compile(rb'\x02\x01(.{1,30}?)[\x00-\x0f]')
    
    for match in table_pattern.finditer(content):
        try:
            name = match.group(1).decode('latin-1').strip()
            if name.isalnum() or '_' in name:
                tables.append(name)
        except:
            pass
    
    # Filtrar nombres unicos que parecen tablas
    unique_tables = []
    for t in tables:
        if t not in unique_tables and len(t) > 2 and not t.startswith('RDB$'):
            unique_tables.append(t)
    
    print("Posibles tablas/tipos encontrados:")
    for t in unique_tables[:30]:
        print(f"  - {t}")
    
    return unique_tables

def extract_product_data(filepath):
    """Extraer datos que parecen ser productos"""
    
    with open(filepath, 'rb') as f:
        content = f.read()
    
    # Buscar registros de productos
    # Los productos suelen tener:
    # - Codigo de barras (numerico, 7-14 digitos)
    # - Descripcion (texto)
    # - Precio (numero decimal)
    
    # Buscar secuencias que parezcan codigos de barras seguidos de descripciones
    products = []
    
    # Patron: longitud + texto (formato tipico de strings en Firebird)
    i = 0
    current_record = {}
    
    while i < len(content) - 20:
        # Buscar codigos de barras (secuencia de digitos ASCII)
        if all(48 <= content[i+j] <= 57 for j in range(12) if i+j < len(content)):
            # Encontramos 12+ digitos consecutivos
            code_start = i
            while i < len(content) and 48 <= content[i] <= 57:
                i += 1
            code = content[code_start:i].decode('ascii')
            
            if len(code) >= 7 and len(code) <= 20:
                # Buscar la descripcion cercana
                # Avanzar un poco y buscar texto
                desc_start = i
                while i < len(content) and content[i] < 32:
                    i += 1
                    if i - desc_start > 50:
                        break
                
                if i < len(content) - 10:
                    # Intentar leer descripcion
                    desc_end = i
                    while desc_end < len(content) and desc_end - i < 200:
                        if content[desc_end] >= 32 and content[desc_end] < 127:
                            desc_end += 1
                        else:
                            break
                    
                    if desc_end > i + 3:
                        try:
                            desc = content[i:desc_end].decode('latin-1').strip()
                            if len(desc) >= 3 and not desc.startswith('RDB$'):
                                products.append({
                                    'codigo': code,
                                    'descripcion': desc
                                })
                        except:
                            pass
        i += 1
    
    return products

def main():
    import sys
    if len(sys.argv) > 1:
        backup_file = sys.argv[1]
    else:
        backup_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'pdv_backup.fbk')
    
    if not os.path.exists(backup_file):
        print(f"No se encontro: {backup_file}")
        return
    
    print("=" * 60)
    print("PARSER DE BACKUP FIREBIRD")
    print("=" * 60 + "\n")
    
    # Analizar estructura
    tables = parse_backup_structured(backup_file)
    
    print("\n" + "-" * 60)
    print("Extrayendo productos...")
    print("-" * 60 + "\n")
    
    # Extraer productos
    products = extract_product_data(backup_file)
    
    print(f"Productos encontrados: {len(products)}")
    
    if products:
        # Mostrar primeros 10
        print("\nPrimeros 10 productos:")
        for p in products[:10]:
            print(f"  {p['codigo']}: {p['descripcion'][:50]}")
        
        # Guardar a JSON
        output_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'productos_abarrotes.json')
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(products, f, ensure_ascii=False, indent=2)
        print(f"\nGuardado en: {output_file}")
        
        # Guardar a CSV
        csv_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'productos_abarrotes.csv')
        with open(csv_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['codigo', 'descripcion'])
            writer.writeheader()
            writer.writerows(products)
        print(f"Guardado en: {csv_file}")

if __name__ == "__main__":
    main()
