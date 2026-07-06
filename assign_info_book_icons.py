"""Give every Info Book the same icon. In-game all the monster-info books look the same, so they
all use the white Book of Combos icon (MH4G-Book_Icon_White) regardless of rarity.
Applied directly to data/mhfu.db (the shipped artifact), with a backup (see canonize_names.py)."""
import sqlite3, shutil, time

DB = "data/mhfu.db"
INFO_BOOK_ICON = "MH4G-Book_Icon_White"   # Book of Combos 3 — all info books share this

ts = time.strftime("%Y%m%d-%H%M%S")
shutil.copy(DB, f"{DB}.bak-infoicons-{ts}")
print(f"backup -> {DB}.bak-infoicons-{ts}")

con = sqlite3.connect(DB)
c = con.cursor()
n = c.execute("UPDATE items SET icon=? WHERE category='Info Books'", (INFO_BOOK_ICON,)).rowcount
print(f"all info books -> {INFO_BOOK_ICON}: {n} items")
con.commit()

print("\nResult:")
for row in c.execute("SELECT rarity, icon, COUNT(*) FROM items WHERE category='Info Books' "
                     "GROUP BY rarity, icon ORDER BY rarity"):
    print(" ", row)
con.close()
