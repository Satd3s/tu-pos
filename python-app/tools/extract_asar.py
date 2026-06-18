import json
import struct
import os
import shutil

asar_path = r'c:\Users\_SATD3S_\Documents\InventorySystem\ttweb\resources\app.asar'
output_dir = r'c:\Users\_SATD3S_\Documents\InventorySystem\ttweb_extracted'

print("Extrayendo app.asar...")

with open(asar_path, 'rb') as f:
    # Read header
    f.read(4)  # pickle object size
    header_size_bytes = f.read(4)
    header_size = struct.unpack('<I', header_size_bytes)[0]
    f.read(4)  # header string size
    f.read(4)  # header string size
    
    header_json = f.read(header_size - 8).decode('utf-8').rstrip('\x00')
    header = json.loads(header_json)
    
    data_start = f.tell()
    
    def extract_files(node, path=''):
        if 'files' in node:
            for name, info in node['files'].items():
                full_path = os.path.join(path, name)
                if 'files' in info:
                    # Es un directorio
                    extract_files(info, full_path)
                else:
                    # Es un archivo
                    offset = int(info.get('offset', 0))
                    size = int(info.get('size', 0))
                    
                    if size > 0:
                        dest = os.path.join(output_dir, full_path)
                        os.makedirs(os.path.dirname(dest), exist_ok=True)
                        
                        f.seek(data_start + offset)
                        data = f.read(size)
                        
                        with open(dest, 'wb') as out:
                            out.write(data)
    
    os.makedirs(output_dir, exist_ok=True)
    extract_files(header)

print(f"Extraido a: {output_dir}")

# Listar archivos importantes
for root, dirs, files in os.walk(output_dir):
    for file in files:
        if file.endswith(('.db', '.sqlite', '.json', '.sql', '.csv')):
            print(f"  Encontrado: {os.path.join(root, file)}")
