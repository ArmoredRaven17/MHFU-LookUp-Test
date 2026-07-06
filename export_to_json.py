"""
Export mhfu.db to web/public/data/*.json for the static web app.
Run from the repo root:  python export_to_json.py
"""
import json
import os
import sqlite3

DB   = os.path.join(os.path.dirname(__file__), 'data', 'mhfu.db')
OUT  = os.path.join(os.path.dirname(__file__), 'web', 'public', 'data')

os.makedirs(OUT, exist_ok=True)
con = sqlite3.connect(DB)
con.row_factory = sqlite3.Row


def save(filename: str, data):
    path = os.path.join(OUT, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))
    size_kb = os.path.getsize(path) / 1024
    print(f'  {filename:<30}  {len(data) if isinstance(data, list) else "obj":>6}  {size_kb:6.1f} KB')


# ── Monsters ─────────────────────────────────────────────────────────────────
print('Exporting monsters…')
rows = con.execute('SELECT id, name, type, doc_json FROM monsters ORDER BY name').fetchall()
monsters = []
for r in rows:
    doc = json.loads(r['doc_json'])
    doc.pop('id', None); doc.pop('name', None); doc.pop('type', None)
    monsters.append({'id': r['id'], 'name': r['name'], 'type': r['type'], **doc})
save('monsters.json', monsters)

# Curated list grouping/order (type -> ordered member ids), mirrors the desktop app.
mo = con.execute("SELECT value FROM app_meta WHERE key='monster_order'").fetchone()
save('monster_order.json', json.loads(mo['value']) if mo else {})

# Hunting Horn song catalogue + note-set -> song-ids map (for the HH weapon detail).
hs = con.execute("SELECT value FROM app_meta WHERE key='hh_songs'").fetchone()
hm = con.execute("SELECT value FROM app_meta WHERE key='hh_songmap'").fetchone()
save('hh_songs.json', {
    'songs': json.loads(hs['value']) if hs else [],
    'note_map': json.loads(hm['value']) if hm else {},
})

# ── Items ─────────────────────────────────────────────────────────────────────
print('Exporting items…')
rows = con.execute(
    'SELECT id, category, name, icon, rarity, capacity, value, pokke_value, description '
    'FROM items ORDER BY sort_order, name'
).fetchall()
save('items.json', [dict(r) for r in rows])

# ── Weapons ───────────────────────────────────────────────────────────────────
print('Exporting weapons…')
rows = con.execute(
    'SELECT weapon_pk, id, type, name, sort_order, doc_json FROM weapons ORDER BY type, sort_order'
).fetchall()
weapons = []
for r in rows:
    weapons.append({
        'weapon_pk': r['weapon_pk'],
        'id': r['id'],
        'type': r['type'],
        'name': r['name'],
        'sort_order': r['sort_order'],
        'doc': json.loads(r['doc_json']),
    })
save('weapons.json', weapons)

# ── Armor ─────────────────────────────────────────────────────────────────────
print('Exporting armor sets…')

_SLOT_ORDER = "CASE slot WHEN 'head' THEN 0 WHEN 'chest' THEN 1 WHEN 'arms' THEN 2 WHEN 'waist' THEN 3 WHEN 'legs' THEN 4 ELSE 5 END"

def parse_mat(s: str):
    parts = s.split(' ', 1)
    return {'qty': int(parts[0]), 'name': parts[1]} if len(parts) == 2 and parts[0].isdigit() else {'qty': 1, 'name': s}

sets = con.execute(
    'SELECT id, name, rank, rarity, class_split, gender_exclusive, has_paired_names '
    'FROM armor_sets ORDER BY rarity, sort_order, name'
).fetchall()
armor = []
for s in sets:
    sid = s['id']

    # Activated skills per class variant.
    act = {r['class_type']: json.loads(r['activated_skills_json'] or '[]')
           for r in con.execute('SELECT class_type, activated_skills_json FROM armor_variants WHERE set_id=?', (sid,))}
    # Class variants present in the pieces (Both / Blademaster / Gunner).
    class_types = [r['class_type'] for r in con.execute(
        f'SELECT DISTINCT class_type FROM armor_pieces WHERE set_id=? '
        f"ORDER BY CASE class_type WHEN 'Both' THEN 0 WHEN 'Blademaster' THEN 1 ELSE 2 END", (sid,))]

    variants = []
    for ct in class_types:
        pieces_raw = con.execute(
            f'''SELECT piece_id, slot, name_male, name_female, defense, max_defense,
                       fire_res, water_res, thunder_res, ice_res, dragon_res, deco_slots, cost
                FROM armor_pieces WHERE set_id=? AND class_type=? ORDER BY {_SLOT_ORDER}''',
            (sid, ct)).fetchall()
        pieces = []
        for p in pieces_raw:
            pid = p['piece_id']
            skills_rows = con.execute(
                'SELECT sp.skill_id, sk.name, sp.points FROM armor_piece_skill_points sp '
                'JOIN skills sk ON sk.id=sp.skill_id WHERE sp.piece_id=? ORDER BY sp.points DESC', (pid,)).fetchall()
            mat_rows = con.execute(
                'SELECT material FROM armor_piece_materials WHERE piece_id=? ORDER BY idx', (pid,)).fetchall()
            pieces.append({
                'slot': p['slot'],
                'name_male': p['name_male'], 'name_female': p['name_female'],
                'defense': p['defense'], 'max_defense': p['max_defense'],
                'fire_res': p['fire_res'], 'water_res': p['water_res'], 'thunder_res': p['thunder_res'],
                'ice_res': p['ice_res'], 'dragon_res': p['dragon_res'],
                'slots': p['deco_slots'], 'cost': p['cost'],
                'skills': [{'skill_id': r['skill_id'], 'skill_name': r['name'], 'points': r['points']} for r in skills_rows],
                'materials': [parse_mat(r['material']) for r in mat_rows],
            })
        variants.append({'class_type': ct, 'activated_skills': act.get(ct, []), 'pieces': pieces})

    armor.append({
        'id': sid,
        'name': s['name'],
        'rank': s['rank'],
        'rarity': s['rarity'],
        'class_split': s['class_split'],
        'gender_exclusive': s['gender_exclusive'],
        'has_paired_names': s['has_paired_names'],
        'variants': variants,
    })
save('armor_sets.json', armor)

# ── Armor Skills ──────────────────────────────────────────────────────────────
print('Exporting armor skills…')
skills_rows = con.execute('SELECT id, name, description FROM skills ORDER BY name').fetchall()
skill_cats = {}
for r in con.execute('SELECT skill_id, category FROM skill_categories'):
    skill_cats.setdefault(r['skill_id'], []).append(r['category'])
level_rows = con.execute(
    'SELECT skill_id, points, name, description FROM skill_levels ORDER BY skill_id, sort_order'
).fetchall()
levels_by_skill: dict = {}
for r in level_rows:
    levels_by_skill.setdefault(r['skill_id'], []).append({
        'points': r['points'], 'name': r['name'], 'description': r['description']
    })
armor_skills = []
for r in skills_rows:
    armor_skills.append({
        'id': r['id'],
        'name': r['name'],
        'description': r['description'] or '',
        'categories': skill_cats.get(r['id'], []),
        'levels': levels_by_skill.get(r['id'], []),
    })
save('armor_skills.json', armor_skills)

# ── Decorations ───────────────────────────────────────────────────────────────
print('Exporting decorations…')
deco_rows = con.execute('SELECT id, name, slot_cost, cost, color FROM decorations ORDER BY name').fetchall()
deco_effects: dict = {}
for r in con.execute('SELECT de.deco_id, de.skill_id, sk.name AS skill_name, de.points FROM decoration_skill_effects de JOIN skills sk ON sk.id=de.skill_id'):
    deco_effects.setdefault(r['deco_id'], []).append({
        'skill_id': r['skill_id'], 'skill_name': r['skill_name'], 'points': r['points']
    })
deco_recipes_map: dict = {}
for r in con.execute('SELECT deco_id, recipe_index, materials_json FROM decoration_recipes ORDER BY deco_id, recipe_index'):
    mats = json.loads(r['materials_json'])
    deco_recipes_map.setdefault(r['deco_id'], []).append(mats)
decos = []
for r in deco_rows:
    did = r['id']
    decos.append({
        'id': did,
        'name': r['name'],
        'slot_cost': r['slot_cost'],
        'cost': r['cost'],
        'color': r['color'],
        'skill_effects': deco_effects.get(did, []),
        'recipes': deco_recipes_map.get(did, []),
    })
save('decorations.json', decos)

# ── Quests ────────────────────────────────────────────────────────────────────
print('Exporting quests…')
quest_rows = con.execute('SELECT slug, category, sort_order, doc_json FROM quest_categories ORDER BY sort_order').fetchall()
quests = []
for r in quest_rows:
    doc = json.loads(r['doc_json'])
    quests.append({'slug': r['slug'], 'category': r['category'], 'ranks': doc.get('ranks', [])})
save('quests.json', quests)

# ── Gathering ─────────────────────────────────────────────────────────────────
print('Exporting gathering…')
ga_rows = con.execute('SELECT slug, area, sort_order, doc_json FROM gathering_areas ORDER BY sort_order').fetchall()
gathering = []
for r in ga_rows:
    doc = json.loads(r['doc_json'])
    gathering.append({'slug': r['slug'], 'area': r['area'], 'zones': doc.get('zones', [])})
save('gathering.json', gathering)

# ── Combos ────────────────────────────────────────────────────────────────────
print('Exporting combos…')
combo_rows = con.execute(
    'SELECT section, product AS result, item1 AS mat1, item2 AS mat2, pct, qty '
    'FROM combinations ORDER BY section, sort_order'
).fetchall()
save('combos.json', [dict(r) for r in combo_rows])

# ── Treasures ─────────────────────────────────────────────────────────────────
print('Exporting treasures…')
tr_rows = con.execute(
    'SELECT id, area, name, description, where_to_find, points, rarity, icon, is_award '
    'FROM treasures ORDER BY sort_order, name'
).fetchall()
save('treasures.json', [dict(r) for r in tr_rows])

# ── Kitchen ───────────────────────────────────────────────────────────────────
print('Exporting kitchen…')
# food_recipes: ingredient1/ingredient2 are names directly (no FK)
recipe_rows = con.execute(
    'SELECT chefs, ingredient1, ingredient2, effect FROM food_recipes ORDER BY sort_order'
).fetchall()
# food_ingredients: chefs, category, items (items = comma-sep names)
ingr_rows = con.execute(
    'SELECT chefs, category, items FROM food_ingredients ORDER BY sort_order'
).fetchall()
whim_rows = con.execute('SELECT name, description FROM felyne_whim_skills ORDER BY sort_order').fetchall()
save('kitchen.json', {
    'recipes': [dict(r) for r in recipe_rows],
    'ingredients': [dict(r) for r in ingr_rows],
    'whim_skills': [dict(r) for r in whim_rows],
})

# ── Trenya ────────────────────────────────────────────────────────────────────
print('Exporting Trenya…')
tr_rows = con.execute(
    'SELECT location, points, category, item FROM trenya_items ORDER BY location, sort_order'
).fetchall()
save('trenya.json', [dict(r) for r in tr_rows])

# ── Pokke Farm ────────────────────────────────────────────────────────────────
print('Exporting Pokke Farm…')
pk_rows = con.execute(
    'SELECT area, group_label, group_note, item, item_note FROM pokke_items ORDER BY sort_order'
).fetchall()
save('pokke.json', [dict(r) for r in pk_rows])

# ── Peddling Granny ───────────────────────────────────────────────────────────
print('Exporting Peddling Granny…')
gr_rows = con.execute(
    'SELECT inventory AS section, item, price FROM peddling_granny ORDER BY sort_order'
).fetchall()
save('granny.json', [dict(r) for r in gr_rows])

# ── Veggie Elder ──────────────────────────────────────────────────────────────
print('Exporting Veggie Elder…')
ve_rows = con.execute(
    'SELECT zone, item, common_trade, rare_trade FROM veggie_elder ORDER BY sort_order'
).fetchall()
save('veggie.json', [dict(r) for r in ve_rows])

# ── Felyne Comrades ───────────────────────────────────────────────────────────
print('Exporting Felyne Comrades…')
fc_sections  = con.execute('SELECT id, title, body, table_kind, sort_order FROM felyne_comrade_sections ORDER BY sort_order').fetchall()
fc_weapons   = con.execute('SELECT id, attack_power, slash, impact, divider FROM felyne_comrade_weapons ORDER BY sort_order').fetchall()
fc_skills    = con.execute('SELECT id, skill, cost, description, unlock FROM felyne_comrade_skills ORDER BY sort_order').fetchall()
fc_temps     = con.execute('SELECT id, character, attack_pref, healing, target FROM felyne_comrade_temperaments ORDER BY sort_order').fetchall()
save('comrades.json', {
    'sections':     [dict(r) for r in fc_sections],
    'weapons':      [dict(r) for r in fc_weapons],
    'skills':       [dict(r) for r in fc_skills],
    'temperaments': [dict(r) for r in fc_temps],
})

# ── Awards ────────────────────────────────────────────────────────────────────
print('Exporting awards…')
aw_rows = con.execute('SELECT id, name, description, condition, icon FROM awards ORDER BY sort_order').fetchall()
save('awards.json', [dict(r) for r in aw_rows])

con.close()
print('\nDone.')
