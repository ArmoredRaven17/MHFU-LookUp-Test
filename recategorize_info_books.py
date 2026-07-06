"""Move the monster "Info" books (ids 930-958) out of the "Account Items" category into
their own "Info Books" category. One-off data fix applied directly to data/mhfu.db (the shipped
artifact), mirroring canonize_names.py's edit-with-backup pattern."""
import sqlite3, shutil, time

DB = "data/mhfu.db"
OLD, NEW = "Account Items", "Info Books"

ts = time.strftime("%Y%m%d-%H%M%S")
shutil.copy(DB, f"{DB}.bak-infobooks-{ts}")
print(f"backup -> {DB}.bak-infobooks-{ts}")

con = sqlite3.connect(DB)
c = con.cursor()
# The Info books are exactly the "Account Items" whose name contains "Info".
rows = list(c.execute(
    "SELECT id, name FROM items WHERE category=? AND name LIKE '%Info%' ORDER BY sort_order", (OLD,)))
print(f"moving {len(rows)} items to '{NEW}':")
for i, n in rows:
    print(f"  {i:>4}  {n}")
c.execute("UPDATE items SET category=? WHERE category=? AND name LIKE '%Info%'", (NEW, OLD))
con.commit()

print(f"\n'{OLD}' remaining: {c.execute('SELECT COUNT(*) FROM items WHERE category=?', (OLD,)).fetchone()[0]}")
print(f"'{NEW}' now:        {c.execute('SELECT COUNT(*) FROM items WHERE category=?', (NEW,)).fetchone()[0]}")
con.close()
