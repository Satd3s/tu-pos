import sqlite3

conn = sqlite3.connect('inventory.db')
conn.row_factory = sqlite3.Row
c = conn.cursor()

print("TURNOS EN BASE DE DATOS:")
print("-" * 80)

c.execute('SELECT id, status, opened_at, closed_at, initial_fund, total_sales, sales_count FROM shifts ORDER BY id DESC LIMIT 10')
rows = c.fetchall()

for r in rows:
    print(f"ID:{r['id']} | Estado:{r['status']} | Abierto:{r['opened_at']} | Cerrado:{r['closed_at']} | Fondo:{r['initial_fund']} | Ventas:{r['sales_count']}")

# Contar turnos abiertos
c.execute("SELECT COUNT(*) FROM shifts WHERE status = 'open'")
open_count = c.fetchone()[0]
print(f"\n>>> TURNOS ABIERTOS: {open_count}")

conn.close()
