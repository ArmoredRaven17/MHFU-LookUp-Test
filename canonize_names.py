import json, sqlite3, re, sys, shutil, time

ROM = {x['id']: x['name'] for x in json.load(open('docs/rom_item_master.json'))}
ROMnames = set(ROM.values())
A2R = json.load(open('docs/app_to_rom_map.json'))
# semantic changes held back for the user (Shell<->Scale, different item)
HOLD = {'ThckWhtFatlisShl', 'Hunter Soul Ticket'}

def nrm(s): return ''.join(c for c in s.lower() if c.isalnum())
def plus_of(s): return s.count('+')
def skel(s):
    s = nrm(s); return (s[:1] + ''.join(c for c in s[1:] if c not in 'aeiou')) if s else ''
def name_eq(a, b):
    if plus_of(a) != plus_of(b): return False
    a2, b2 = nrm(a), nrm(b)
    if not a2 or not b2: return False
    if a2 == b2 or a2.startswith(b2) or b2.startswith(a2): return True
    sa, sb = skel(a), skel(b)
    return len(sa) >= 4 and (sa == sb or sa.startswith(sb) or sb.startswith(sa))

# explicit confident mappings for variants/typos the tight resolver can't reach safely
FORCE = {
 'Azur Rthlos Wng': 'Azur Rthlos Wing', 'Blk Blos Thoracic': 'Blk Blos Thracic',
 'Cenataur Pincer': 'Ceanataur Pincer', 'Elder Thank You+': 'Elder Thnk You+',
 'FireWyvern BrnStm': 'FireWyvrn BrnStm', 'FireWyvern Marrow': 'FireWyvrn Marrow',
 'FireWyrm BrnStm': 'FireWyvrn BrnStm', 'FireWyrm Marrow': 'FireWyvrn Marrow',
 'Grn Plesioth Fin+': 'Grn Plsioth Fin+', 'HrdCongalalaPelt+': 'HrdCongalalaPlt+',
 'HvenlyTigrexScale': 'HvnlyTigrexScale', 'HvyBlkGraviShl': 'HvyBlkGraviosShl',
 'HvySlvrRthlosShl': 'HvySlvrRthlsShl', 'Pitfall': 'Pitfall Trap',
 'Pur Gypceros Wing': 'Pur Gypceros Wng', 'Sonic': 'Sonic Bomb',
 'ThckPlesiothScale': 'ThckPlesiothScl', 'Twisted Bulldrome Tusk': 'Twstd Bldrm Tsk',
 'Velocidrome Claw+': 'Velocidrome Clw+', 'Velociprey Scale+': 'Velociprey Scle+',
 'Vespoid RazorWing': 'Vspoid Razorwing',
 'Wyvernfish (S)': 'Small Wyvernfish', 'Wyvernfish (M)': 'Med Wyvernfish', 'Wyvernfish (L)': 'Large Wyvernfish',
 'Flash': 'Flash Bomb', 'Shock': 'Shock Trap', 'Holed Shakalaka Mask': 'Holed Shaka Mask',
 'Bullfango Pelt+': 'ThkBullfangoPelt', 'Fire Sac': 'Blazing Fire Sac',
 'Sm Lao-Shan Claw': "Lao-Shan's Claw", "Lao-Shan's Scale+": 'Lao-Shan Scale+', 'Garuga Tail+': 'LethrGarugaTail',
}
_cache = {}
def rom_of(name):
    """Resolve a bare item name -> ROM canonical, or None if unresolved/ambiguous/held."""
    if name in _cache: return _cache[name]
    if name in FORCE: _cache[name] = FORCE[name]; return FORCE[name]
    r = None
    if name in ROMnames: r = name
    elif name in HOLD: r = None
    elif name in A2R and A2R[name][0] is not None:
        r = ROM.get(A2R[name][0])
    else:
        # tightest fallback: same +count AND nrm EXACT (de-space/de-case only), unique match
        nn = nrm(name)
        hits = [rn for rn in ROMnames if plus_of(name) == plus_of(rn) and nrm(rn) == nn]
        r = hits[0] if len(hits) == 1 else None
    _cache[name] = r; return r

QTY = re.compile(r'^(\d+\s+)(.*)$')
def ren_q(s):  # "qty Name" -> qty + renamed name
    m = QTY.match(s.strip())
    pre, nm = (m.group(1), m.group(2)) if m else ('', s.strip())
    r = rom_of(nm)
    return (pre + r) if (r and r != nm) else s
def ren_plain(s):
    r = rom_of(s)
    return r if (r and r != s) else s
APPQ = re.compile(r'\s*\(\d+\)\s*$')
def ren_reward(s):  # reward item name, may carry "(N)" qty suffix
    m = APPQ.search(s); suf = m.group(0) if m else ''; base = s[:m.start()] if m else s
    r = rom_of(base)
    return (r + suf) if (r and r != base) else s

def walk_doc(o):
    ch = 0
    if isinstance(o, dict):
        for k, v in o.items():
            if k == 'item' and isinstance(v, str):
                nv = ren_reward(v)
                if nv != v: o[k] = nv; ch += 1
            else: ch += walk_doc(v)
    elif isinstance(o, list):
        for x in o: ch += walk_doc(x)
    return ch

def run(mode):
    c = sqlite3.connect('data/mhfu.db')
    if mode == 'apply':
        ts = time.strftime('%Y%m%d-%H%M%S'); shutil.copy('data/mhfu.db', 'data/mhfu.db.bak-canon-' + ts)
        print('backup -> data/mhfu.db.bak-canon-%s\n' % ts)
    counts = {}
    # items.name
    n = 0
    for i, nm in c.execute('select id,name from items').fetchall():
        r = ren_plain(nm)
        if r != nm:
            n += 1
            if mode == 'apply': c.execute('update items set name=? where id=?', (r, i))
    counts['items.name'] = n
    # combinations product/item1/item2
    n = 0
    for rid, p, a, b in c.execute('select id,product,item1,item2 from combinations').fetchall():
        np, na, nb = ren_plain(p or ''), ren_plain(a or ''), ren_plain(b or '')
        if (np, na, nb) != (p, a, b):
            n += 1
            if mode == 'apply': c.execute('update combinations set product=?,item1=?,item2=? where id=?', (np, na, nb, rid))
    counts['combinations'] = n
    # weapons.doc_json materials (CSV)
    n = 0
    for wid, dj in c.execute('select id,doc_json from weapons').fetchall():
        if not dj: continue
        d = json.loads(dj); mats = d.get('materials')
        if isinstance(mats, str) and mats.strip():
            parts = mats.split(',')
            renp = [ren_q(x) for x in parts]
            if any(r.strip() != x.strip() for r, x in zip(renp, parts)):   # real name change only
                new = ', '.join(r.strip() for r in renp)
                d['materials'] = new; n += 1
                if mode == 'apply': c.execute('update weapons set doc_json=? where id=?', (json.dumps(d), wid))
    counts['weapons.materials'] = n
    # armor_piece_materials.material
    n = 0
    for pid, idx, mat in c.execute('select piece_id,idx,material from armor_piece_materials').fetchall():
        nm2 = ren_q(mat or '')
        if nm2 != mat:
            n += 1
            if mode == 'apply': c.execute('update armor_piece_materials set material=? where piece_id=? and idx=?', (nm2, pid, idx))
    counts['armor_piece_materials'] = n
    # decoration_recipes.materials_json (JSON list of "qty Name")
    n = 0
    for did, ridx, mj in c.execute('select deco_id,recipe_index,materials_json from decoration_recipes').fetchall():
        if not mj: continue
        lst = json.loads(mj); nl = [ren_q(x) for x in lst]
        if nl != lst:
            n += 1
            if mode == 'apply': c.execute('update decoration_recipes set materials_json=? where deco_id=? and recipe_index=?', (json.dumps(nl), did, ridx))
    counts['decoration_recipes'] = n
    # monsters.doc_json reward items
    n = 0
    for nm, dj in c.execute('select name,doc_json from monsters').fetchall():
        if not dj: continue
        d = json.loads(dj); ch = walk_doc(d)
        if ch:
            n += ch
            if mode == 'apply': c.execute('update monsters set doc_json=? where name=?', (json.dumps(d), nm))
    counts['monsters.doc_json'] = n
    if mode == 'apply': c.commit()
    print('%s: name changes per location:' % mode.upper())
    for k, v in counts.items(): print('   %-26s %d' % (k, v))
    print('   TOTAL', sum(counts.values()))

run(sys.argv[1] if len(sys.argv) > 1 else 'preview')
