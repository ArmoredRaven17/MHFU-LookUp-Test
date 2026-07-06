"""Populate the Felyne Comrades tables from the saved Fandom wiki page.
Parses the page's major sections (prose) plus its three data tables (recommended weapons,
trainable skills, temperaments). Applied directly to data/mhfu.db with a backup (mirrors
build_veggie_elder.py / build_peddling_granny.py)."""
import re, html, sqlite3, shutil, time

SRC = r"C:\Users\humph\Downloads\MHFU Armors\Processed - Reference\MHFU_ Felyne Comrade _ Monster Hunter Wiki _ Fandom.html"
DB = "data/mhfu.db"

raw = open(SRC, encoding="utf-8", errors="ignore").read()
# Article body = from mw-parser-output up to the Fandom footer (this save has no printfooter marker,
# so anchor the end on page-footer/global-footer to keep out the footer nav + category links).
start = re.search(r'<div class="mw-parser-output">', raw)
start = start.end() if start else 0
end = min([p for p in (raw.find('<div class="page-footer"'), raw.find('<div class="global-footer"'))
           if p != -1] or [len(raw)])
body = raw[start:end]


def strip(s):
    """Tags -> text, collapse whitespace, unescape entities, tidy spaces before punctuation."""
    t = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()
    return re.sub(r"\s+([,.;:!?)])", r"\1", t).replace("( ", "(")


def prose(htmlblock):
    """Ordered prose for a section: paragraphs and bulleted lists, plus h3 subsection titles."""
    out = []
    for mm in re.finditer(r"<(h3|p|ul)\b[^>]*>(.*?)</\1>", htmlblock, re.S):
        tag, inner = mm.group(1), mm.group(2)
        if tag == "h3":
            t = strip(inner)
            if t and "navigation" not in t.lower():
                out.append(t.upper())            # subsection header, on its own line
        elif tag == "p":
            t = strip(inner)
            if t:
                out.append(t)
        elif tag == "ul":
            for li in re.findall(r"<li\b[^>]*>(.*?)</li>", inner, re.S):
                t = strip(li)
                if t:
                    out.append("• " + t)     # • bullet
    return "\n".join(out)


# ── Major sections (h2), in reading order. Slice the body between consecutive h2s. ──
heads = [(mm.start(), strip(mm.group(1))) for mm in re.finditer(r"<h2\b[^>]*>(.*?)</h2>", body, re.S)]
heads = [(pos, t) for pos, t in heads if t and t.lower() not in ("contents",)]
SKIP = {"explore", "explore properties", "follow us", "community", "advertise",
        "fandom apps", "cookie preferences"}

# table_kind assignment by (original) section title.
KIND = {"weapon upgrade": "weapons", "points and skills": "skills", "during battle": "temperaments"}

# Friendlier display titles for the section picker (keyed off the original wiki headings).
RENAME = {
    "Hiring a Felyne Comrade": "Basic Info",
    "The Comrade Board": "Comrade Board",
    "Growth": "Growth",
    "Weapon Upgrade": "Weapons",
    "Points and Skills": "Points/Skills",
    "During Battle": "Hunting Behavior",
}

# Curated body overrides (keyed by display title) — replace the wiki prose with our own wording.
BODY_OVERRIDE = {
    "Basic Info": "\n".join([
        "• First Leader: Original Owner",
        "• Comrade LV: Max of 20, but training can increase stats still.",
        "• Attack: How strong your comrade is",
        "• Defense: How tough your comrade is",
        "• Fondness: This impacts behavior mid hunt",
        "• Coloration: Visual effect only",
        "• Slash/Strike: Determines the type of attack (Cutting vs Impact)",
        "• Temperament: This is a combination of factors that determine Hunting Behavior",
        "• Attack Pref: Determines how the comrade attacks, if they attack",
    ]),
    "Comrade Board": "\n".join([
        "• Growth: Assign a comrade to train; explained more in Growth section.",
        "• Comrade Skills: Assign up to 3 skills using the points the comrade has; explained more in Points/Skills.",
        "• Active/Res: Set Active Comrades, determines which one you bring on hunts with you",
        "• Armor: This is visual only like the Chef outfits",
        "• Change/Dismiss: Switches the job of a comrade. Dismiss removes a comrade from your roster.",
        "• Comrade Transfer: Give a comrade to a fellow hunter",
    ]),
    "Weapons": "",        # table only — no intro prose
    "Points/Skills": "",  # table only — no intro prose
    "Growth": "\n".join([
        "• Hand To Hand: Increases the Comrade's experience value.",
        "• Dumbbells: Increases Attack.",
        "• Situps: Increases Defense.",
        "• Forms: Increases Defense and Attack at the same time slowly.",
        "• Meditation: Increases the Comrade's points (used to acquire Skills).",
        "• Rest: The Comrade takes a break, slowly raising its Loyalty.",
    ]),
    "Hunting Behavior": "\n".join([
        "AID",
        "During a hunt, your comrade will attract and help divide the attention of the monster. A comrade "
        "also can assist you in various ways such as hitting you out of snowman, waking you up or hitting "
        "you out of a roar. This is based on the Fondness level.",
        "If your comrade uses bombs, they also behave the same way as those used by the hunter; they will "
        "behave like a Sonic Bomb.",
        "Some comrades are capable of deploying Shock Traps.",
        "GATHERING",
        "Comrades can interact with Gathering Points, the items collected by your comrades will be received "
        "in the reward screen after normal rewards.",
        "Some comrades refuse to gather, but that doesn't stop them from stealing with 'Rob 'Em Blind'. "
        "Stealing behaves like carving.",
        "FIGHTING STYLE",
        "How the comrade will attack, if they attack, during a hunt.",
        "• Bombs Only: Comrade will never directly attack and only use Bombs.",
        "• Weapon Only: Comrade will never use bombs and only attack directly.",
        "• Mainly Bombs: Comrade will mostly use bombs and occasionally use his weapon.",
        "• Mainly Weapon: Comrade will mostly use his weapons and occasionally use Bombs.",
        "• Balanced: Comrade will use Bombs and his weapon equally.",
        "• Doesn't Attack: Comrade never attacks (They will still attack you to shake off KO, sleep, etc.)",
        "TEMPERAMENTS",
    ]),
}

sections = []   # (title, body, table_kind, sort_order)
order = 0
for i, (pos, title) in enumerate(heads):
    if title.lower() in SKIP:
        continue
    end = heads[i + 1][0] if i + 1 < len(heads) else len(body)
    disp = RENAME.get(title, title)
    text = BODY_OVERRIDE[disp] if disp in BODY_OVERRIDE else prose(body[pos:end])
    sections.append((disp, text, KIND.get(title.lower(), ""), order))
    order += 1

# ── The three data tables (in document order: weapons, skills, temperaments). ──
tables = re.findall(r"<table.*?</table>", body, re.S)


def table_rows(t):
    rows = []
    for r in re.findall(r"<tr.*?</tr>", t, re.S):
        cells = [strip(c) for c in re.findall(r"<t[hd].*?</t[hd]>", r, re.S)]
        cells = [c for c in cells if c != "Divider"]
        if any(cells):
            rows.append(cells)
    return rows


weapons_raw = table_rows(tables[0])[1:]        # skip header
skills_raw = table_rows(tables[1])[1:]
temper_raw = table_rows(tables[2])[1:]

# Weapons: Attack Power | Slash | Impact | Weapon Divider. The Divider is the divisor in the Felyne
# Comrade damage formula: (Attack x Hitzone x Defense x Rage x Critical) / Weapon Divider.
weapons = [(r[0], r[1], r[2], r[3] if len(r) > 3 else "", i) for i, r in enumerate(weapons_raw)]
# Unlock text reads better as "hunt" than "fight" (whole word only — leaves "Felyne Fighter" alone).
skills = [(r[0], r[1], r[2], re.sub(r"\bfight\b", "hunt", r[3]), i) for i, r in enumerate(skills_raw)]
temper = [(r[0], r[1], r[2], r[3], i) for i, r in enumerate(temper_raw)]

ts = time.strftime("%Y%m%d-%H%M%S")
shutil.copy(DB, f"{DB}.bak-comrades-{ts}")
print(f"backup -> {DB}.bak-comrades-{ts}")
con = sqlite3.connect(DB)
c = con.cursor()
c.execute("DROP TABLE IF EXISTS felyne_comrade_sections")
c.execute("DROP TABLE IF EXISTS felyne_comrade_weapons")
c.execute("DROP TABLE IF EXISTS felyne_comrade_skills")
c.execute("DROP TABLE IF EXISTS felyne_comrade_temperaments")
c.execute("CREATE TABLE felyne_comrade_sections (id INTEGER PRIMARY KEY, title TEXT NOT NULL, "
          "body TEXT NOT NULL DEFAULT '', table_kind TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0)")
c.execute("CREATE TABLE felyne_comrade_weapons (id INTEGER PRIMARY KEY, attack_power TEXT NOT NULL, "
          "slash TEXT NOT NULL DEFAULT '', impact TEXT NOT NULL DEFAULT '', divider TEXT NOT NULL DEFAULT '', "
          "sort_order INTEGER NOT NULL DEFAULT 0)")
c.execute("CREATE TABLE felyne_comrade_skills (id INTEGER PRIMARY KEY, skill TEXT NOT NULL, cost TEXT NOT NULL DEFAULT '', "
          "description TEXT NOT NULL DEFAULT '', unlock TEXT NOT NULL DEFAULT '', sort_order INTEGER NOT NULL DEFAULT 0)")
c.execute("CREATE TABLE felyne_comrade_temperaments (id INTEGER PRIMARY KEY, character TEXT NOT NULL, "
          "attack_pref TEXT NOT NULL DEFAULT '', healing TEXT NOT NULL DEFAULT '', target TEXT NOT NULL DEFAULT '', "
          "sort_order INTEGER NOT NULL DEFAULT 0)")
c.executemany("INSERT INTO felyne_comrade_sections(title,body,table_kind,sort_order) VALUES(?,?,?,?)", sections)
c.executemany("INSERT INTO felyne_comrade_weapons(attack_power,slash,impact,divider,sort_order) VALUES(?,?,?,?,?)", weapons)
c.executemany("INSERT INTO felyne_comrade_skills(skill,cost,description,unlock,sort_order) VALUES(?,?,?,?,?)", skills)
c.executemany("INSERT INTO felyne_comrade_temperaments(character,attack_pref,healing,target,sort_order) VALUES(?,?,?,?,?)", temper)
con.commit()
print(f"sections={len(sections)} weapons={len(weapons)} skills={len(skills)} temperaments={len(temper)}")
print("\nsections:")
for title, text, kind, _ in sections:
    print(f"  - {title!r:30} kind={kind!r:14} prose_chars={len(text)}")
con.close()
