
import os
import re
import sys
import json
import csv


def extract_pascal_strings(content):
    strings = []
    i = 0
    size = len(content)
    
    while i < size - 2:
        # Try to read length (2 bytes little endian)
        try:
            length = content[i] + (content[i+1] << 8)
        except:
            i += 1
            continue
            
        # Sanity check on length
        if length < 3 or length > 255:
            i += 1
            continue
            
        # Check if next 'length' bytes are printable
        if i + 2 + length > size:
            break
            
        s_bytes = content[i+2 : i+2+length]
        
        # Fast filter: must contain at least one alphanumeric
        is_printable = True
        has_alnum = False
        
        for b in s_bytes:
            if not ((32 <= b <= 126) or (160 <= b <= 255)):
                is_printable = False
                break
            if 48 <= b <= 57 or 65 <= b <= 90 or 97 <= b <= 122:
                has_alnum = True
                
        if is_printable and has_alnum:
            # Found a string!
            try:
                s = s_bytes.decode('latin-1', errors='ignore')
                strings.append({
                    'offset': i,
                    'text': s,
                    'len': length,
                    'is_barcode': s.isdigit() and len(s) >= 4 and len(s) <= 15
                })
                # Skip the string
                i += 2 + length
                continue
            except:
                pass
                
        i += 1
    return strings

def correlate_products(strings):
    products = []
    
    # Sort by offset just in case
    strings.sort(key=lambda x: x['offset'])
    
    for i in range(len(strings) - 1):
        s1 = strings[i]
        
        # Require s1 to be a barcode-like string
        if not s1['is_barcode']:
            continue
            
        # Look ahead for description
        # Usually description comes AFTER barcode in the record text
        # But we need to be careful of distance
        
        for j in range(1, 5): # Look at next 4 strings
            if i + j >= len(strings):
                break
                
            s2 = strings[i+j]
            
            # Distance check (bytes between end of s1 and start of s2)
            dist = s2['offset'] - (s1['offset'] + 2 + s1['len'])
            
            if dist < 0: continue # Should not happen if sorted
            if dist > 300: break # Too far, next record probably
            
            # s2 Should be a description (not a barcode preferably, or a long text)
            if not s2['text'].startswith('RDB$') and len(s2['text']) > 3:
                # Good candidate
                products.append({
                    'code': s1['text'],
                    'description': s2['text'],
                    'dist': dist
                })
                break # Found a match for this barcode
                
    return products

def main():
    if len(sys.argv) < 2:
        print("Usage: python parse_fdb_raw.py <fdb_file>")
        return

    fdb_file = sys.argv[1]
    if not os.path.exists(fdb_file):
        print(f"File not found: {fdb_file}")
        return
        
    print(f"Parsing {fdb_file}...")
    with open(fdb_file, 'rb') as f:
        content = f.read()

    print("Extracting strings...")
    strings = extract_pascal_strings(content)
    print(f"Found {len(strings)} valid strings.")
    
    print("Correlating products...")
    products = correlate_products(strings)
    print(f"Found {len(products)} potential products.")
    
    # Dedup by code
    unique = {}
    for p in products:
        code = p['code']
        if code not in unique:
            unique[code] = p
        else:
            # Keep the longer description
            if len(p['description']) > len(unique[code]['description']):
                unique[code] = p
                
    final_list = list(unique.values())
    print(f"Unique products: {len(final_list)}")
    
    if final_list:
        csv_path = "products_recovered.csv"
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=['code', 'description'])
            writer.writeheader()
            for p in final_list:
                writer.writerow({'code': p['code'], 'description': p['description']})
        
        # Also JSON
        json_path = "products_recovered.json"
        with open(json_path, 'w', encoding='utf-8') as f:
             # Simplify list for JSON
             export_list = [{'code': p['code'], 'description': p['description']} for p in final_list]
             json.dump(export_list, f, indent=2, ensure_ascii=False)
             
        print(f"Saved to {csv_path} and {json_path}")



if __name__ == "__main__":
    main()
