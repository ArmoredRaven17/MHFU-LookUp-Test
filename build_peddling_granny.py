"""Populate the peddling_granny table from the user's Granny spreadsheet.
The sheet lays each inventory out as repeating (Item, Price) column pairs; we read column-major so
related items stay grouped, and assign a global sort_order preserving inventory + item order.
Applied directly to data/mhfu.db with a backup (mirrors canonize_names.py)."""
import openpyxl, sqlite3, shutil, time

SRC = r"C:/Users/humph/OneDrive/Documents/Granny.csv.xlsx"
DB = "data/mhfu.db"

ws = openpyxl.load_workbook(SRC, data_only=True).active
rows = [[(c if c is not None else "") for c in r] for r in ws.iter_rows(values_only=True)]

sections = []; cur = None
for r in rows:
    cells = [str(x).strip() for x in r]
    nonempty = [x for x in cells if x]
    if len(nonempty) == 1 and nonempty[0].endswith(":"):
        cur = {"name": nonempty[0][:-1].strip(), "rows": []}; sections.append(cur); continue
    if not nonempty: continue
    if cells[:2] == ["Item", "Price"]: continue
    if cur is not None: cur["rows"].append(cells)

records = []  # (inventory, item, price, sort_order)
order = 0
for s in sections:
    width = max(len(r) for r in s["rows"])
    for p in range(0, width, 2):
        for r in s["rows"]:
            it = r[p].strip() if p < len(r) else ""
            pr = r[p + 1].strip() if p + 1 < len(r) else ""
            if it:
                records.append((s["name"], it, pr, order)); order += 1

ts = time.strftime("%Y%m%d-%H%M%S"); shutil.copy(DB, f"{DB}.bak-granny-{ts}")
print(f"backup -> {DB}.bak-granny-{ts}")
con = sqlite3.connect(DB); c = con.cursor()
c.execute("DROP TABLE IF EXISTS peddling_granny")
c.execute("CREATE TABLE peddling_granny (id INTEGER PRIMARY KEY, inventory TEXT NOT NULL, "
          "item TEXT NOT NULL, price TEXT NOT NULL, sort_order INTEGER NOT NULL DEFAULT 0)")
c.executemany("INSERT INTO peddling_granny(inventory,item,price,sort_order) VALUES(?,?,?,?)", records)
con.commit()
print(f"inserted {len(records)} rows")
for inv, n in c.execute("SELECT inventory,COUNT(*) FROM peddling_granny GROUP BY inventory ORDER BY MIN(sort_order)"):
    print(f"  {n:>3}  {inv}")
con.close()
