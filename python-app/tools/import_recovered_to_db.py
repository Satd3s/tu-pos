
import sqlite3
import json
import os
import sys

# Setup paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, 'inventory.db')
JSON_PATH = os.path.join(BASE_DIR, 'products_recovered.json')

def import_catalog():
    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found.")
        return

    print(f"Loading products from {JSON_PATH}...")
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        products = json.load(f)

    print(f"Connecting to database {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Ensure table exists (in case migration didn't run yet)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS product_catalog (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            source TEXT DEFAULT 'imported'
        )
    ''')

    print("Importing products...")
    count = 0
    errors = 0
    
    # Use transaction for speed
    cursor.execute("BEGIN TRANSACTION")
    
    for p in products:
        try:
            code = p.get('code', '').strip()
            # Use description as name since it's the only field we have
            name = p.get('description', '').strip() 
            source = 'abarrotes_recovery'
            
            if not code or not name:
                continue
                
            # Clean up name/description
            # Some descriptions might be too short or garbage
            if len(name) < 3:
                continue

            cursor.execute('''
                INSERT OR IGNORE INTO product_catalog (code, name, description, source)
                VALUES (?, ?, ?, ?)
            ''', (code, name, name, source))
            
            if cursor.rowcount > 0:
                count += 1
                
        except Exception as e:
            errors += 1
            print(f"Error importing {p}: {e}")

    conn.commit()
    conn.close()
    
    print("-" * 40)
    print(f"Import complete.")
    print(f"Imported: {count}")
    print(f"Skipped/Errors: {errors}")
    print("-" * 40)

if __name__ == "__main__":
    import_catalog()
