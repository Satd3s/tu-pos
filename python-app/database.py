# =============================================================================
# MÓDULO DE BASE DE DATOS SQLite
# =============================================================================

import sqlite3
import os
import shutil
import hashlib
from datetime import datetime
from contextlib import contextmanager

# Ruta de la base de datos
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inventory.db')
BACKUP_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backups')

@contextmanager
def get_db_connection():
    """Context manager para conexiones a la base de datos con soporte concurrente WAL"""
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row  # Permite acceder a columnas por nombre
    conn.execute("PRAGMA foreign_keys = ON")  # Habilitar foreign keys
    conn.execute("PRAGMA journal_mode = WAL")  # Habilitar modo WAL
    conn.execute("PRAGMA synchronous = NORMAL")  # Optimizar sincronización en WAL
    try:
        yield conn
    finally:
        conn.close()

def dict_from_row(row):
    """Convertir sqlite3.Row a diccionario"""
    if row is None:
        return None
    return dict(row)

def run_migrations_early(cursor):
    """Migraciones para actualizar tablas existentes (ejecutar antes de crear tablas nuevas)"""
    # Verificar si la tabla movements existe antes de intentar modificarla
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='movements'")
    if cursor.fetchone():
        # Intentar agregar columnas nuevas (ignorar si ya existen)
        migrations = [
            "ALTER TABLE movements ADD COLUMN purchase_id INTEGER",
            "ALTER TABLE movements ADD COLUMN unit_cost REAL DEFAULT 0",
        ]
        for sql in migrations:
            try:
                cursor.execute(sql)
            except:
                pass  # Columna ya existe
    
    # Verificar tabla suppliers
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='suppliers'")
    if cursor.fetchone():
        try:
            cursor.execute("ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMP")
        except:
            pass  # Columna ya existe

    # Verificar tabla products para agregar campo unit
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
    if cursor.fetchone():
        try:
            cursor.execute("ALTER TABLE products ADD COLUMN unit TEXT DEFAULT 'pieza'")
        except:
            pass  # Columna ya existe


def init_database():
    """Inicializar la base de datos con todas las tablas"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        # Primero ejecutar migraciones para bases de datos existentes
        run_migrations_early(cursor)
        
        # ===== TABLA: Productos =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                category TEXT,
                brand TEXT,
                part_number TEXT,
                supplier TEXT,
                location TEXT,
                stock INTEGER DEFAULT 0,
                min_stock INTEGER DEFAULT 5,
                max_stock INTEGER DEFAULT 100,
                purchase_cost REAL DEFAULT 0,
                public_price REAL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        ''')
        
        # ===== TABLA: Categorías =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                color TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ===== TABLA: Proveedores =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                contact TEXT,
                phone TEXT,
                email TEXT,
                address TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        ''')
        
        # ===== TABLA: Movimientos de Inventario =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('entry', 'exit', 'adjustment')),
                quantity INTEGER NOT NULL,
                reason TEXT,
                reference TEXT,
                purchase_id INTEGER,
                unit_cost REAL DEFAULT 0,
                user TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (purchase_id) REFERENCES purchases(id)
            )
        ''')
        
        # ===== TABLA: Compras (cabecera) =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio TEXT,
                supplier_id INTEGER,
                supplier_name TEXT,
                purchase_date DATE,
                subtotal REAL DEFAULT 0,
                tax REAL DEFAULT 0,
                total REAL DEFAULT 0,
                status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled', 'pending')),
                notes TEXT,
                user TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
            )
        ''')
        
        # ===== TABLA: Detalle de Compras =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS purchase_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                purchase_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_code TEXT,
                product_name TEXT,
                quantity INTEGER NOT NULL,
                unit_cost REAL NOT NULL,
                subtotal REAL NOT NULL,
                FOREIGN KEY (purchase_id) REFERENCES purchases(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        
        # ===== TABLA: Ventas =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio TEXT UNIQUE NOT NULL,
                shift_id INTEGER,
                subtotal REAL NOT NULL,
                tax REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                total REAL NOT NULL,
                payment_method TEXT DEFAULT 'cash',
                cash_received REAL,
                change_given REAL,
                status TEXT DEFAULT 'completed' CHECK(status IN ('completed', 'cancelled', 'pending')),
                cancelled_at TIMESTAMP,
                cancelled_reason TEXT,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (shift_id) REFERENCES shifts(id)
            )
        ''')
        
        # ===== TABLA: Detalle de Ventas =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS sale_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sale_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                product_code TEXT,
                product_name TEXT,
                quantity INTEGER NOT NULL,
                unit_price REAL NOT NULL,
                subtotal REAL NOT NULL,
                FOREIGN KEY (sale_id) REFERENCES sales(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
        ''')
        
        # ===== TABLA: Turnos de Caja =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                initial_fund REAL DEFAULT 0,
                total_sales REAL DEFAULT 0,
                total_cash REAL DEFAULT 0,
                total_card REAL DEFAULT 0,
                total_transfer REAL DEFAULT 0,
                total_credit REAL DEFAULT 0,
                sales_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed')),
                opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                closed_at TIMESTAMP,
                user_id INTEGER,
                user TEXT,
                notes TEXT,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        # ===== TABLA: Usuarios =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'cashier',
                full_name TEXT,
                pin TEXT,
                active INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Usuario Admin por defecto
        cursor.execute("SELECT count(*) FROM users")
        count = cursor.fetchone()[0]
        
        # Verificar si existe el usuario admin especificamente
        cursor.execute("SELECT id FROM users WHERE username='admin'")
        admin_exists = cursor.fetchone() is not None
        
        # Crear admin si la base de datos está vacía o si no existe admin (y hay pocos usuarios, asumiendo instalación nueva/rota)
        if count == 0:
            # Hash password like in api/users.py
            password_hash = hashlib.sha256('admin123'.encode('utf-8')).hexdigest()
            
            cursor.execute('''
                INSERT INTO users (username, password, role, full_name, pin, active, permissions) 
                VALUES ('admin', ?, 'admin', 'Administrador', '1234', 1, '{"all": true}')
            ''', (password_hash,))
            print(f"Usuario admin creado por defecto: admin / admin123 (Hash: {password_hash[:8]}...)")

        
        # ===== TABLA: Configuración =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # ===== TABLA: Clientes =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                address TEXT,
                rfc TEXT,
                credit_limit REAL DEFAULT 0,
                current_balance REAL DEFAULT 0,
                allow_credit INTEGER DEFAULT 0,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                active INTEGER DEFAULT 1
            )
        ''')
        
        # ===== TABLA: Movimientos de Crédito de Clientes =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customer_credits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INTEGER NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('charge', 'payment')),
                amount REAL NOT NULL,
                sale_id INTEGER,
                reference TEXT,
                notes TEXT,
                user TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES customers(id),
                FOREIGN KEY (sale_id) REFERENCES sales(id)
            )
        ''')

        # ===== TABLA: Catálogo Global de Productos (Importado) =====
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS product_catalog (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source TEXT DEFAULT 'imported'
            )
        ''')

        
        # ===== ÍNDICES para búsquedas rápidas =====
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_movements_product ON movements(product_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_movements_date ON movements(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_movements_purchase ON movements(purchase_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sales_folio ON sales(folio)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id)')
        
        # ===== Configuración inicial =====
        default_settings = [
            ('company_name', 'Refaccionaria SMIP'),
            ('company_phone', ''),
            ('company_address', ''),
            ('tax_rate', '16'),
            ('currency', 'MXN'),
            ('theme', 'dark'),
            ('accent_color', '#3b82f6'),
            ('folio_counter', '0'),
        ]
        
        for key, value in default_settings:
            cursor.execute('''
                INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)
            ''', (key, value))
        
        conn.commit()
        print("Base de datos inicializada correctamente")
        
        # Ejecutar migraciones para bases de datos existentes
        run_migrations(conn)

def run_migrations(conn):
    """Ejecutar migraciones para actualizar schema de bases de datos existentes"""
    cursor = conn.cursor()
    
    migrations = [
        # Migración 1: Agregar columnas nuevas a movements
        ("ALTER TABLE movements ADD COLUMN purchase_id INTEGER", "movements.purchase_id"),
        ("ALTER TABLE movements ADD COLUMN unit_cost REAL DEFAULT 0", "movements.unit_cost"),
        
        # Migración 2: Agregar columna updated_at a suppliers (si no existe)
        ("ALTER TABLE suppliers ADD COLUMN updated_at TIMESTAMP", "suppliers.updated_at"),
        
        # Migración 3: Agregar columna permissions a users
        ("ALTER TABLE users ADD COLUMN permissions TEXT", "users.permissions"),
        
        # Migración 4: Agregar columna card_received a sales para pagos mixtos
        ("ALTER TABLE sales ADD COLUMN card_received REAL DEFAULT 0", "sales.card_received"),

        # Migración 5: Agregar columna total_credit a shifts
        ("ALTER TABLE shifts ADD COLUMN total_credit REAL DEFAULT 0", "shifts.total_credit"),

        # Migracion 6: Crear tabla de catalogo si no existe
        ('''
            CREATE TABLE IF NOT EXISTS product_catalog (
                code TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                source TEXT DEFAULT 'imported'
            )
        ''', "table.product_catalog"),
    ]
    
    for sql, description in migrations:
        try:
            cursor.execute(sql)
            print(f"Migración aplicada: {description}")
        except Exception as e:
            if "duplicate column" in str(e).lower() or "already exists" in str(e).lower():
                pass
            else:
                pass
    
    # Asegurar permisos de admin
    try:
        cursor.execute("UPDATE users SET permissions = '{\"all\": true}' WHERE username = 'admin' AND (permissions IS NULL OR permissions = '')")
        conn.commit()
    except:
        pass
    
    conn.commit()

def backup_db():
    """Create a consistent backup of the database using SQLite's native backup API"""
    try:
        # Create backup folder if it doesn't exist
        if not os.path.exists(BACKUP_FOLDER):
            os.makedirs(BACKUP_FOLDER)
        
        # Backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f'inventory_backup_{timestamp}.db'
        backup_path = os.path.join(BACKUP_FOLDER, backup_name)
        
        # Use native SQLite backup API for consistent copies under active WAL mode
        with get_db_connection() as src_conn:
            # Force a full checkpoint to consolidate WAL transactions
            try:
                src_conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
            except Exception as checkpoint_err:
                print(f"[WARN] Error running checkpoint before backup: {checkpoint_err}")
            
            # Perform native page-by-page database copy
            dst_conn = sqlite3.connect(backup_path)
            try:
                src_conn.backup(dst_conn)
            finally:
                dst_conn.close()
        
        # Clean up older backups (keep last 10)
        backups = sorted([f for f in os.listdir(BACKUP_FOLDER) if f.endswith('.db')])
        while len(backups) > 10:
            old_backup = backups.pop(0)
            try:
                os.remove(os.path.join(BACKUP_FOLDER, old_backup))
            except Exception as rm_err:
                print(f"[WARN] Could not remove old backup {old_backup}: {rm_err}")
        
        return {'success': True, 'path': backup_path, 'message': f'Respaldo creado: {backup_name}'}
    
    except Exception as e:
        return {'success': False, 'error': str(e)}

def get_db_stats():
    """Obtener estadísticas de la base de datos"""
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        stats = {}
        
        # Contar registros en cada tabla
        tables = ['products', 'categories', 'suppliers', 'movements', 'sales', 'sale_items', 'shifts']
        for table in tables:
            cursor.execute(f'SELECT COUNT(*) FROM {table}')
            stats[table] = cursor.fetchone()[0]
        
        # Tamaño de la base de datos
        stats['db_size_mb'] = round(os.path.getsize(DB_PATH) / (1024 * 1024), 2)
        
        return stats
