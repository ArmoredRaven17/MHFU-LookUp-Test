"""Single source of truth for the Armor Skills category filter (skill_categories table).
Rebuilds the many-to-many table from the user's category lists. Skills may belong to several
categories (the app shows "All Skills" by default and filters to one category on demand).

Category lists are the in-game *skill (activation) names* the user provided per category; each is
resolved to its *skill-point family* via skill_levels (verified). A few entries are assigned
directly by family id where the activation name is truncated or the family wasn't in any image.
Applied directly to data/mhfu.db with a backup (mirrors canonize_names.py)."""
import sqlite3, re, shutil, time, sys

DB = "data/mhfu.db"

# Bow doesn't use bowgun-ammo "<shot> S <All/Lv1> Add" skills — omitted from the Bow list.
BOW_OMIT = {"Normal S All LV Add", "Pierce S All LV Add", "Pierce S LV1 Add",
            "Pellet S All LV Add", "Pellet S LV1 Add"}

# category -> activation names (from the user's images)
IMAGES = {
 "Offense": ["Sharpness +1","Art of Unsheathing","Stellar Hunter","NormalS/RapidBow Up","PierceS/PierceBow Up","PelletS/ScattrBow Up","Normal S All LV Add","Reckless Abandon+3","Reckless Abandon+2","Reckless Abandon+1","Abnormal Sts Atk Up","Element Attack Up","Adrenaline +2","Adrenaline +1","Gunnery King","Gunnery Master","Capacity Up","Emboldened","Bomber"],
 "Defense": ["Defense +40","Defense +30","Defense +20","Health +50","Health +30","Health +20","High Grade Earplug","Earplug","Dragon Wind Breaker","High Wind Res","Low Wind Res","Guard +2","Guard +1","Auto-Guard","Damage Rec Speed +2","Damage Rec Speed +1","Divine Protection","Guard Inc","Evade +2","Evade +1","Evade Distance Up","Guts","Emboldened","Runner","Constitution +2","Constitution +1","HealthRecItemsImprvd"],
 "Resistance": ["All Res +10","All Res +5","All Res +3","Ice Res +10","Ice Res +5","Water Res +10","Water Res +5","Thunder Res +10","Thunder Res +5","Dragon Res +10","Dragon Res +5","Fire Res +10","Fire Res +5","Faint Negated","Faint Prob Halved","Poison Negated","Poison Dur Halved","Paralysis Negated","Para Duration Halved","Sleep Negated","Sleep Dur Halved","Antiseptic","Fatigue Cancellation","Snow Res","Quake Res","Steal No Effect","Self-Defense","Metallic Protection","Frosty Protection"],
 "Blademaster": ["Sharpness +1","Sharp Sword","ESP","Sharpening Skl Inc","Art of Unsheathing","Stellar Hunter","Flute Expert"],
 "Bowgun": ["NormalS/RapidBow Up","PierceS/PierceBow Up","PelletS/ScattrBow Up","Normal S All LV Add","Pierce S All LV Add","Pierce S LV1 Add","Pellet S All LV Add","Pellet S LV1 Add","Crag S All LV Add","Crag S LV1 Add","Clust S All LV Add","Clust S LV1 Add","Reloading Speed +3","Reloading Speed +2","Reloading Speed +1","AutoReload","Recoil Reduction +2","Recoil Reduction +1","Shell Deviation Down","Straight & True","Capacity Up","Bullet Limit"],
 "Bow": [x for x in ["NormalS/RapidBow Up","PierceS/PierceBow Up","PelletS/ScattrBow Up","Normal S All LV Add","Pierce S All LV Add","Pierce S LV1 Add","Pellet S All LV Add","Pellet S LV1 Add","AutoReload","Poison Coating Add","Paralysis Coat Add","Sleep Coating Add","Power Coating Add","ClsRngCAdd","Capacity Up","Focus","Bullet Limit"] if x not in BOW_OMIT],
 "Treasure Hunting": ["Gathering +2","Gathering +1","Carving Celebrity","Carving Iron Man","High Speed Gathering","Backpacking Expert","Divine Whim","Spirit's Whim","Fishing Expert"],
 "Farming": ["Carving Celebrity","Carving Iron Man","Luck Booster","Good Luck","Tranquilizing Celeb","Tranquilizing Whiz","Tranquilizing Guru"],
}

# Assigned directly by skill-point family id (activation truncated, or family not in any image).
BY_ID = {
 "Misc. (Untagged)": ["alchemy","bbq","comradeatk","comradedef","comrdguide","cooking","gluttony",
                      "hunger","map","mixsucrate","psychicvis","sneak","speedsetup","throw",
                      "wide_area","everlastng","torso_inc"],
 "Offense": ["attack"],
 "Resistance": ["antichamel","cold_res","heat_res","terrain"],
}

con = sqlite3.connect(DB); c = con.cursor()
def nrm(s): return re.sub(r'[^a-z0-9]','', s.lower())
lvl = {}
for lname, sid in c.execute("SELECT sl.name, sl.skill_id FROM skill_levels sl"):
    lvl.setdefault(nrm(lname), set()).add(sid)
famname = {nrm(n): sid for sid, n in c.execute("SELECT id,name FROM skills")}

mem = set()       # (skill_id, category)
problems = []
for cat, names in IMAGES.items():
    for n in names:
        ids = lvl.get(nrm(n)) or ({famname[nrm(n)]} if nrm(n) in famname else set())
        if not ids: problems.append(f"{cat}: '{n}' (no match)")
        for sid in ids: mem.add((sid, cat))
for cat, ids in BY_ID.items():
    for sid in ids:
        if not c.execute("SELECT 1 FROM skills WHERE id=?", (sid,)).fetchone():
            problems.append(f"{cat}: id '{sid}' (unknown)")
        mem.add((sid, cat))

if problems:
    print("ABORT — unresolved entries:"); [print("  ", p) for p in problems]; sys.exit(1)

ts = time.strftime("%Y%m%d-%H%M%S"); shutil.copy(DB, f"{DB}.bak-skillcat-{ts}")
print(f"backup -> {DB}.bak-skillcat-{ts}")
c.execute("DROP TABLE IF EXISTS skill_categories")
c.execute("CREATE TABLE skill_categories (skill_id TEXT NOT NULL, category TEXT NOT NULL, PRIMARY KEY (skill_id, category))")
c.executemany("INSERT INTO skill_categories(skill_id,category) VALUES(?,?)", sorted(mem))
con.commit()

allsk = {s for (s,) in c.execute("SELECT id FROM skills")}
covered = {s for s,_ in mem}
print(f"memberships: {len(mem)} | skills covered: {len(covered)}/{len(allsk)}")
for cat, n in c.execute("SELECT category,COUNT(*) FROM skill_categories GROUP BY category ORDER BY category"):
    print(f"  {n:>3}  {cat}")
print("uncategorized:", sorted(allsk - covered) or "none")
con.close()
