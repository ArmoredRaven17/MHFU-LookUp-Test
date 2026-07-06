"""Populate the veggie_elder table from the user's Veggie Elder Trades spreadsheet.
Each zone is a section with two side-by-side trade tables of (Item, Common Trade, Rare Trade);
we read the two 3-column blocks column-major so each table stays a continuous list, and assign a
global sort_order preserving zone + table + row order. Applied directly to data/mhfu.db with a
backup (mirrors build_peddling_granny.py)."""
import openpyxl, sqlite3, shutil, time

SRC = r"C:/Users/humph/OneDrive/Documents/Veggie Elder Trades.xlsx"
DB = "data/mhfu.db"

ws = openpyxl.load_workbook(SRC, data_only=True).active
rows = [[(str(c).strip() if c is not None else "") for c in r] for r in ws.iter_rows(values_only=True)]


def cell(r, i):
    return r[i] if i < len(r) else ""


sections = []      # {"zone": str, "rows": [row, ...]}
cur = None
for r in rows:
    # Zone header: text in col B (idx 1), trade columns (idx 2..6) all empty.
    if cell(r, 1) and not any(cell(r, i) for i in (2, 3, 4, 5, 6)):
        cur = {"zone": cell(r, 1), "rows": []}
        sections.append(cur)
        continue
    if cell(r, 1) == "Item":      # column-header row
        continue
    if cur is not None and any(cell(r, i) for i in range(1, 7)):
        cur["rows"].append(r)

records = []  # (zone, item, common, rare, sort_order)
order = 0
# The two trade tables live in column blocks B:D (idx 1-3) and E:G (idx 4-6).
for s in sections:
    for base in (1, 4):
        for r in s["rows"]:
            item = cell(r, base)
            if not item:
                continue
            common = cell(r, base + 1)
            rare = cell(r, base + 2)
            records.append((s["zone"], item, common, rare, order))
            order += 1

ts = time.strftime("%Y%m%d-%H%M%S")
shutil.copy(DB, f"{DB}.bak-veggie-{ts}")
print(f"backup -> {DB}.bak-veggie-{ts}")
con = sqlite3.connect(DB)
c = con.cursor()
c.execute("DROP TABLE IF EXISTS veggie_elder")
c.execute("CREATE TABLE veggie_elder (id INTEGER PRIMARY KEY, zone TEXT NOT NULL, item TEXT NOT NULL, "
          "common_trade TEXT NOT NULL DEFAULT '', rare_trade TEXT NOT NULL DEFAULT '', "
          "sort_order INTEGER NOT NULL DEFAULT 0)")
c.executemany("INSERT INTO veggie_elder(zone,item,common_trade,rare_trade,sort_order) VALUES(?,?,?,?,?)", records)
con.commit()
print(f"inserted {len(records)} rows")
for zone, n in c.execute("SELECT zone,COUNT(*) FROM veggie_elder GROUP BY zone ORDER BY MIN(sort_order)"):
    print(f"  {n:>3}  {zone}")
con.close()
