
import os
import sys
import importlib
import sqlite3
import json

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def check_file(path, description):
    if os.path.exists(path):
        print(f"[OK] {description} found: {path}")
        return True
    else:
        print(f"[ERROR] {description} MISSING: {path}")
        return False

def check_module_import(module_name):
    try:
        importlib.import_module(module_name)
        print(f"[OK] Module {module_name} imported successfully")
        return True
    except ImportError as e:
        print(f"[ERROR] Failed to import {module_name}: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Error importing {module_name}: {e}")
        return False

def check_database():
    from database import get_db_connection
    try:
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT sqlite_version()")
            version = cursor.fetchone()[0]
            print(f"[OK] Database connection successful. SQLite version: {version}")
            
            # Check critical tables
            tables = ['products', 'sales', 'users', 'settings', 'movements']
            missing_tables = []
            for table in tables:
                cursor.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name='{table}'")
                if not cursor.fetchone():
                    missing_tables.append(table)
            
            if missing_tables:
                print(f"[ERROR] Missing critical tables: {', '.join(missing_tables)}")
                return False
            else:
                print(f"[OK] All critical tables found: {', '.join(tables)}")
                return True
    except Exception as e:
        print(f"[ERROR] Database check failed: {e}")
        return False

def scan_for_todos(root_dir):
    print("\nScanning for TODOs and FIXMEs...")
    count = 0
    for root, dirs, files in os.walk(root_dir):
        if 'venv' in root or '__pycache__' in root or '.git' in root:
            continue
        for file in files:
            if file.endswith('.py') or file.endswith('.js') or file.endswith('.html'):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        for i, line in enumerate(f, 1):
                            if 'FIXME' in line or 'TODO' in line:
                                # Filter out minor todos if necessary, but showing all for safety
                                print(f"  [{file}:{i}] {line.strip()}")
                                count += 1
                except:
                    pass
    if count == 0:
        print("[OK] No TODO/FIXME markers found.")
    else:
        print(f"[INFO] Found {count} TODO/FIXME markers (review if critical).")

def run_system_check():
    print("=== FINAL SYSTEM HEALTH CHECK ===\n")
    
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # 1. File Structure Check
    print("--- File Structure Check ---")
    critical_files = [
        ('main.py', 'Main Entry Point'),
        ('run_native.py', 'Native Launcher'),
        ('requirements.txt', 'Dependencies File'),
        (os.path.join('web', 'index-tabs.html'), 'Main HTML Interface'),
        (os.path.join('web', 'app.js'), 'Main JavaScript'),
        ('database.py', 'Database Module')
    ]
    
    all_files_ok = True
    for rel_path, desc in critical_files:
        if not check_file(os.path.join(root_dir, rel_path), desc):
            all_files_ok = False
            
    # 2. Module Import Check
    print("\n--- Python API Integrity Check ---")
    api_modules = [
        'api.products', 'api.sales', 'api.users', 'api.reports', 
        'api.movements', 'api.purchases', 'api.suppliers', 
        'api.customers', 'api.devices', 'api.settings'
    ]
    
    all_modules_ok = True
    for mod in api_modules:
        if not check_module_import(mod):
            all_modules_ok = False
            
    # 3. Database Check
    print("\n--- Database Check ---")
    db_ok = check_database()
    
    # 4. TODO Scan
    scan_for_todos(root_dir)
    
    # 5. Dependency Consistency (Basic)
    print("\n--- Dependency Check ---")
    try:
        import eel
        print(f"[OK] Eel installed (v{eel.__version__ if hasattr(eel, '__version__') else 'unknown'})")
    except ImportError:
        print("[ERROR] Eel is missing!")
        
    print("\n=== SUMMARY ===")
    if all_files_ok and all_modules_ok and db_ok:
        print("✅ SYSTEM READY FOR PRODUCTION BUILD")
        print("Required actions: None found by automated check.")
    else:
        print("❌ SYSTEM HAS ISSUES")
        print("Please resolve the errors above before building.")

if __name__ == "__main__":
    run_system_check()
