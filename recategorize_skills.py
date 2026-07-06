"""Reassign skill-family categories from images the user provides. Each batch sets a list of skill
ids to a target category. Applied directly to data/mhfu.db with a backup (see canonize_names.py)."""
import sqlite3, shutil, time, sys

DB = "data/mhfu.db"

# Batch 1 — image set -> "Misc. (Untagged)". Skill family ids resolved from the activation names
# shown in the image (via skill_levels). ComradGuidance&Trade is a ComrdGuide level; Item Usage
# Improve is the Everlastng "Item Usage Improved" level.
BATCHES = [
    ("Misc. (Untagged)", [
        "alchemy", "bbq", "comradeatk", "comradedef", "comrdguide", "cooking", "gluttony",
        "hunger", "map", "mixsucrate", "psychicvis", "sneak", "speedsetup", "throw",
        "wide_area", "everlastng",
    ]),
]

con = sqlite3.connect(DB)
c = con.cursor()

# Verify every id exists before touching anything.
missing = []
for _, ids in BATCHES:
    for sid in ids:
        if not c.execute("SELECT 1 FROM skills WHERE id=?", (sid,)).fetchone():
            missing.append(sid)
if missing:
    print("ABORT — unknown skill ids:", missing); sys.exit(1)

ts = time.strftime("%Y%m%d-%H%M%S")
shutil.copy(DB, f"{DB}.bak-skillcat-{ts}")
print(f"backup -> {DB}.bak-skillcat-{ts}\n")

for cat, ids in BATCHES:
    print(f"=> '{cat}':")
    for sid in ids:
        name, old = c.execute("SELECT name, category FROM skills WHERE id=?", (sid,)).fetchone()
        c.execute("UPDATE skills SET category=? WHERE id=?", (cat, sid))
        print(f"   {name:<14} {old:<14} -> {cat}")
con.commit()

print("\nCategory counts now:")
for cat, n in c.execute("SELECT category, COUNT(*) FROM skills GROUP BY category ORDER BY category"):
    print(f"  {n:>3}  {cat}")
con.close()
