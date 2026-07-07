import type { NoteRecord } from '../hooks/useNotes'
import type {
  Monster, Hitzone, RewardDrop, Weapon, WeaponDoc, ArmorSet, ArmorPiece, Quest,
} from '../types'

export type ExportLevel = 'detailed' | 'simple' | 'notes'

export const EXPORT_SIGNATURE = '<!--MHFU-NOTES-EXPORT v=1-->'

// ── Monster ──────────────────────────────────────────────────────────────────
// Mirrors MonstersPage.tsx's TIER_ORDER/buildParts — kept in sync manually since this
// is a plain-text export, not a UI render, so sharing a component isn't a good fit.

const HITZONE_COLS: [keyof Hitzone, string][] = [
  ['cut', 'Cut'], ['bash', 'Bash'], ['shot', 'Shot'], ['fire', 'Fire'], ['water', 'Water'],
  ['thunder', 'Thunder'], ['ice', 'Ice'], ['dragon', 'Dragon'], ['ko', 'KO'],
]

const TIER_ORDER: [string, string][] = [
  ['guild_low_12', 'Guild 1★~2★'], ['elder_guild_low', 'Elder/Guild Low'],
  ['nekoht_guild_high', 'Nekoht/Guild High'], ['g_rank', 'G Rank'],
  ['special', 'Special'], ['treasure_hunt', 'Treasure Hunt'],
]

function formatLootSection(header: string, section: unknown, kind: 'list' | 'object'): string[] {
  const raw: Record<string, unknown>[] =
    kind === 'object' ? (section ? [section as Record<string, unknown>] : [])
                       : ((section as Record<string, unknown>[] | undefined) ?? [])
  const lines: string[] = []
  for (const part of raw) {
    const tiers = TIER_ORDER
      .map(([key, label]) => ({ label, rows: (part[key] as RewardDrop[] | undefined) ?? [] }))
      .filter(t => t.rows.length > 0)
    if (!tiers.length) continue
    let label = (part.label as string) || ''
    const cc = part.carve_count as number | undefined
    if (cc) label = label ? `${label} (${cc} carves)` : `(${cc} carves)`
    lines.push('', `${header}${label ? ` — ${label}` : ''}:`)
    const condition = part.condition as string | undefined
    if (condition) lines.push(`  Condition: ${condition}`)
    for (const t of tiers) {
      lines.push(`  ${t.label}:`)
      for (const r of t.rows) lines.push(`    ${r.item} — ${r.pct}%`)
    }
  }
  return lines
}

export function formatMonster(m: Monster, level: 'detailed' | 'simple'): string[] {
  const lines: string[] = []
  if (m.hitzones?.length) {
    lines.push('Hitzones:')
    for (const hz of m.hitzones) {
      const cells = HITZONE_COLS.map(([k, label]) => `${label} ${hz[k]}`).join('  ')
      lines.push(`  ${hz.part}: ${cells}`)
    }
  }

  if (level === 'simple') return lines

  if (m.stagger_limits?.length) {
    lines.push('', 'Stagger Limits:')
    for (const sl of m.stagger_limits) lines.push(`  ${sl.part}: ${sl.limit}`)
  }
  if (m.ailment_tolerances?.length) {
    lines.push('', 'Ailment Tolerances:')
    for (const a of m.ailment_tolerances) {
      const parts = (['initial', 'increase', 'max', 'duration', 'damage', 'recovery'] as const)
        .map(k => `${k} ${a[k] ?? '—'}`)
      lines.push(`  ${a.ailment}: ${parts.join('  ')}`)
    }
  }
  if (m.items?.length) {
    lines.push('', 'Items:')
    for (const it of m.items) {
      lines.push(`  ${it.item}${it.effect ? ` — ${it.effect}` : ''}${it.notes ? ` (${it.notes})` : ''}`)
    }
  }
  lines.push(...formatLootSection('Carve', m.carve, 'list'))
  lines.push(...formatLootSection('Capture', m.capture, 'object'))
  lines.push(...formatLootSection('Break', m.break, 'list'))
  if (m.quests?.notes) lines.push('', 'Monster Facts:', String(m.quests.notes))
  return lines
}

// ── Weapon ───────────────────────────────────────────────────────────────────
// Mirrors WeaponsPage.tsx's CLASS_MULT/attackDisplay/parseElementInfo/ammo-table logic —
// kept in sync manually, see the note above.

const CLASS_MULT: Record<string, number> = {
  'Great Sword': 4.8, 'Long Sword': 4.8,
  'Sword & Shield': 1.4, 'Dual Blades': 1.4,
  'Hammer': 5.2, 'Hunting Horn': 5.2,
  'Lance': 2.3, 'Gunlance': 2.3,
  'Light Bowgun': 1.2, 'Heavy Bowgun': 1.2, 'Bow': 1.2,
}
function attackDisplay(type: string, atk: number) {
  const mult = CLASS_MULT[type]
  return mult ? `${atk} (${Math.round(atk / mult)})` : `${atk}`
}

const ELEMENT_LABELS: Record<string, string> = {
  Fir: 'Fire', Wtr: 'Water', Thn: 'Thunder', Ice: 'Ice', Drg: 'Dragon',
  Poi: 'Poison', Par: 'Para', Slp: 'Sleep', Sle: 'Sleep',
}
const SPECIAL_COATING: Record<string, string> = {
  PoisonC: 'Poi', ParaC: 'Par', SleepC: 'Slp', PowerC: 'Pwr', PaintC: 'Pnt', CloseC: 'Cls',
}
function withTrueValue(v: string) {
  const n = parseInt(v, 10)
  return !isNaN(n) && n !== 0 ? `${v} (${Math.round(n / 10)})` : v
}
function parseElementInfo(doc: WeaponDoc): { elements: string[]; defense: string } {
  const pairs: [string, string][] = []
  let fromSpecial = false
  if (doc.element_type) {
    pairs.push([doc.element_type, doc.element_value != null ? String(doc.element_value) : ''])
    if (doc.element2_type) pairs.push([doc.element2_type, doc.element2_value != null ? String(doc.element2_value) : ''])
  } else if (doc.element) {
    const parts = doc.element.split(/\s+/).filter(Boolean)
    for (let i = 0; i + 1 < parts.length; i += 2) pairs.push([parts[i], parts[i + 1]])
  } else if (doc.special) {
    fromSpecial = true
    for (const seg of doc.special.split('/')) {
      const t = seg.trim().split(/\s+/).filter(Boolean)
      if (t[0]) pairs.push([t[0], t[1] ?? ''])
    }
  }
  const elements: string[] = []
  let defense = ''
  for (const [token, value] of pairs) {
    if (fromSpecial && token === 'Def') { defense = value; continue }
    if (SPECIAL_COATING[token]) continue   // coating boost, not an element — no export line needed
    const label = ELEMENT_LABELS[token]
    const shown = withTrueValue(value)
    elements.push(label ? `${label} ${shown}` : (value ? `${token} ${shown}` : token))
  }
  return { elements, defense }
}

const AMMO_DEFS: [string, string, keyof WeaponDoc][] = [
  ['Normal', 'Main Ammo', 'ammo_raw'], ['Pierce', 'Main Ammo', 'ammo_raw'], ['Pellet', 'Main Ammo', 'ammo_raw'],
  ['Crag', 'Main Ammo', 'ammo_raw'], ['Clust', 'Main Ammo', 'ammo_raw'],
  ['Poison', 'Status', 'ammo_support'], ['Para', 'Status', 'ammo_support'], ['Sleep', 'Status', 'ammo_support'],
  ['Flame', 'Elemental', 'ammo_element'], ['Water', 'Elemental', 'ammo_element'], ['Thndr', 'Elemental', 'ammo_element'],
  ['Ice', 'Elemental', 'ammo_element'], ['Drgon', 'Elemental', 'ammo_element'],
  ['Recov', 'Support', 'ammo_support'], ['Demn', 'Support', 'ammo_other'], ['Armor', 'Support', 'ammo_other'],
  ['Tranq', 'Misc', 'ammo_other'], ['Paint', 'Misc', 'ammo_other'],
]
const AMMO_NAMES: Record<string, string> = { Recov: 'Recovery', Thndr: 'Thunder', Drgon: 'Dragon', Demn: 'Demon' }
const ammoLabel = (key: string) => `${AMMO_NAMES[key] ?? key} S`
const SOURCE_LEVELS: Record<string, number> = { ammo_raw: 3, ammo_support: 2, ammo_element: 1, ammo_other: 1 }

function ammoCells(doc: WeaponDoc, key: string, source: keyof WeaponDoc): string[] | null {
  const obj = doc[source] as Record<string, number | number[]> | undefined
  if (!obj || !(key in obj)) return null
  const raw = obj[key]
  const levels = Array.isArray(raw) ? raw : [raw]
  if (levels.every(v => v <= 0)) return null
  const sl = SOURCE_LEVELS[source]
  const cell = (i: number) => i < sl && i < levels.length ? (levels[i] > 0 ? String(levels[i]) : '—') : ''
  return [cell(0), cell(1), cell(2)]
}

function formatAmmoTable(doc: WeaponDoc): string[] {
  const lines: string[] = []
  let curHeader: string | null = null
  for (const [key, group, source] of AMMO_DEFS) {
    const cells = ammoCells(doc, key, source)
    if (!cells) continue
    if (curHeader !== group) { lines.push(`  ${group}:`); curHeader = group }
    const shown = cells.filter(Boolean).join(' / ') || '—'
    lines.push(`    ${ammoLabel(key)}: ${shown}`)
  }
  return lines
}

const SHARPNESS_COLORS = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'White', 'Purple']
function sharpnessLine(values: number[]): string {
  return SHARPNESS_COLORS.map((c, i) => values[i] ? `${c} ${values[i]}` : null).filter(Boolean).join(' ')
}

export function formatWeapon(w: Weapon, level: 'detailed' | 'simple', allWeapons: Weapon[]): string[] {
  const doc = w.doc
  const lines: string[] = []
  if (doc.rarity) lines.push(`Rarity: ${doc.rarity}`)
  lines.push(`Attack: ${attackDisplay(w.type, doc.atk)}`)

  const info = parseElementInfo(doc)
  if (info.elements.length) lines.push(`Element/Status: ${info.elements.join(', ')}`)
  if (doc.affinity) lines.push(`Affinity: ${doc.affinity > 0 ? '+' : ''}${doc.affinity}%`)
  const defense = doc.def_bonus ? (doc.def_bonus > 0 ? `+${doc.def_bonus}` : `${doc.def_bonus}`) : info.defense
  if (defense) lines.push(`Defense Bonus: ${defense}`)
  lines.push(`Slots: ${doc.slots}`)

  if (level === 'simple') return lines

  const isBowgun = w.type === 'Light Bowgun' || w.type === 'Heavy Bowgun'
  const isBow = w.type === 'Bow'
  const isMelee = !isBowgun && !isBow
  const isHH = w.type === 'Hunting Horn'

  if (doc.shelling) lines.push(`Shelling: ${doc.shelling}`)
  if (doc.price > 0) lines.push(`Price: ${doc.price.toLocaleString()}z`)

  if (isMelee && doc.sharpness) {
    lines.push('', `Sharpness: ${sharpnessLine(doc.sharpness)}`)
    if (doc.sharpness_plus1) lines.push(`Sharpness (+1 Handicraft): ${sharpnessLine(doc.sharpness_plus1)}`)
  }
  if (isHH && doc.notes?.length) lines.push('', `Notes (colours): ${doc.notes.join(', ')}`)
  if (!isHH && doc.notes?.length) lines.push('', `Notes: ${doc.notes.join(', ')}`)

  if (isBow) {
    if (doc.charges?.length) lines.push('', `Charges: ${doc.charges.join(', ')}`)
    if (doc.coatings?.length) lines.push(`Coatings: ${doc.coatings.join(', ')}`)
  }

  if (isBowgun) {
    if (doc.reload) lines.push(`Reload: ${doc.reload}`)
    if (doc.recoil) lines.push(`Recoil: ${doc.recoil}`)
    if (doc.rapid_fire) lines.push(`Rapid Fire: ${doc.rapid_fire}`)
    const ammo = formatAmmoTable(doc)
    if (ammo.length) lines.push('', 'Ammo (Lv1 / Lv2 / Lv3):', ...ammo)
  }

  if (doc.materials) lines.push('', `Materials (Upgrade): ${doc.materials}`)
  if (doc.materials_alt) lines.push(`Materials (Create): ${doc.materials_alt}`)

  const parent = doc.upgrades_from ? allWeapons.find(x => x.id === doc.upgrades_from) : null
  const children = allWeapons.filter(x => x.doc.upgrades_from === w.id && x.type === w.type)
  const extUpgrades = doc.external_upgrades ?? []
  if (parent || children.length || extUpgrades.length) {
    lines.push('', 'Upgrade Path:')
    if (parent) lines.push(`  Upgrades from: ${parent.name}`)
    for (const c of children) lines.push(`  Upgrades into: ${c.name}`)
    for (const e of extUpgrades) lines.push(`  Cross-type upgrade: ${e.name} (${e.type})`)
  }

  return lines
}

// ── Armor Set ────────────────────────────────────────────────────────────────
// Mirrors ArmorSetsPage.tsx's totals reducer/defRange/pieceName/signed helpers.

const SLOTS_ORDER = ['head', 'chest', 'arms', 'waist', 'legs']
const cap = (s: string) => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1))
const defRange = (init: number, max: number) => (max > init ? `${init}~${max}` : `${init}`)
const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`)
function pieceName(p: ArmorPiece) {
  return p.name_male || p.name_female
}

function resTotals(pieces: ArmorPiece[]) {
  const t = { def: 0, defMax: 0, fire: 0, water: 0, thunder: 0, ice: 0, dragon: 0 }
  for (const p of pieces) {
    t.def += p.defense; t.defMax += p.max_defense
    t.fire += p.fire_res; t.water += p.water_res; t.thunder += p.thunder_res
    t.ice += p.ice_res; t.dragon += p.dragon_res
  }
  return t
}

export function formatArmorSet(set: ArmorSet, level: 'detailed' | 'simple'): string[] {
  const lines: string[] = [`Rank: ${set.rank}`, `Rarity: ${set.rarity}`]
  const labelVariants = set.class_split === 1

  for (const v of set.variants) {
    if (labelVariants) lines.push('', `[${v.class_type}]`)
    const totals = resTotals(v.pieces)

    if (level === 'simple') {
      lines.push(`Defense: ${defRange(totals.def, totals.defMax)}`)
      lines.push(`Resistances: Fire ${totals.fire}  Water ${totals.water}  Thunder ${totals.thunder}  Ice ${totals.ice}  Dragon ${totals.dragon}`)
      if (v.activated_skills.length) lines.push(`Activated Skills: ${v.activated_skills.join(', ')}`)
      continue
    }

    // Detailed: full per-piece breakdown
    for (const slot of SLOTS_ORDER) {
      const p = v.pieces.find(pc => pc.slot === slot)
      if (!p) continue
      lines.push(`${cap(slot)} — ${pieceName(p)}: Def ${defRange(p.defense, p.max_defense)}, Slots ${p.slots}, ` +
        `Fire ${p.fire_res}  Water ${p.water_res}  Thunder ${p.thunder_res}  Ice ${p.ice_res}  Dragon ${p.dragon_res}`)
      for (const sk of p.skills) lines.push(`    ${sk.skill_name}: ${signed(sk.points)}`)
    }
    lines.push(`Total: Def ${defRange(totals.def, totals.defMax)}, Fire ${totals.fire}  Water ${totals.water}  Thunder ${totals.thunder}  Ice ${totals.ice}  Dragon ${totals.dragon}`)
    if (v.activated_skills.length) lines.push(`Activated Skills: ${v.activated_skills.join(', ')}`)
    for (const p of v.pieces) {
      if (!p.materials.length) continue
      lines.push(`${pieceName(p)} Materials: ${p.materials.map(m => `${m.qty} ${m.name}`).join(', ')}`)
    }
  }
  return lines
}

// ── Quest ────────────────────────────────────────────────────────────────────
// Mirrors QuestBrowser.tsx's splitArea helper and LoadoutCard rendering.

function splitArea(area: string): { location: string; timeOfDay: string } {
  const m = area.match(/^(.*?)\s*\(([^)]*)\)\s*$/)
  return m ? { location: m[1].trim(), timeOfDay: m[2].trim() } : { location: area.trim(), timeOfDay: '' }
}

export function formatQuest(q: Quest, level: 'detailed' | 'simple'): string[] {
  const { location, timeOfDay } = splitArea(q.area)
  const lines: string[] = [
    `Objective: ${q.objective}`,
    `Location: ${location}${timeOfDay ? `  Time of Day: ${timeOfDay}` : ''}`,
    `Time Limit: ${q.time}`,
    `Contract Fee: ${q.fee}`,
    `Reward: ${q.reward}`,
  ]
  if (q.monsters.length) lines.push(`Monsters: ${q.monsters.join(', ')}`)

  if (level === 'simple') return lines

  if (q.environment) lines.push(`Environment: ${q.environment}`)
  if (q.description && q.description !== ':') lines.push('', 'Description:', q.description)
  if (q.rewards.length) lines.push('', 'Rewards:', ...q.rewards.map(r => `  ${r}`))
  if (q.danger) lines.push('', `Danger: ${q.danger}`)
  if (q.unlock) lines.push(`Unlock: ${q.unlock}`)
  if (q.loadouts?.length) {
    lines.push('', 'Loadouts:')
    for (const lo of q.loadouts) {
      lines.push(`  ${lo.weapon_type}${lo.weapon ? ` — ${lo.weapon}` : ''}`)
      if (lo.description) lines.push(`    ${lo.description}`)
      const armorNames = lo.armor.filter(a => a.name && a.name.toLowerCase() !== 'nothing').map(a => a.name)
      if (armorNames.length) lines.push(`    Set: ${armorNames.join(', ')}`)
      const skillNames = lo.active_skills.map(s => typeof s === 'string' ? s : s.name)
      if (skillNames.length) lines.push(`    Active Skills: ${skillNames.join(', ')}`)
      if (lo.items.length) lines.push(`    Items: ${lo.items.join(', ')}`)
    }
  }
  if (q.notes) lines.push('', 'Quest Notes:', q.notes)
  return lines
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

export function formatEntityBlock(
  note: NoteRecord,
  entity: Monster | Weapon | ArmorSet | Quest | undefined,
  level: 'detailed' | 'simple',
  allWeapons: Weapon[],
): string[] {
  if (!entity) return ['(entity data unavailable)']
  switch (note.type) {
    case 'monster': return formatMonster(entity as Monster, level)
    case 'weapon': return formatWeapon(entity as Weapon, level, allWeapons)
    case 'armorset': return formatArmorSet(entity as ArmorSet, level)
    case 'quest': return formatQuest(entity as Quest, level)
    default: return []
  }
}

// ── Import parsing ────────────────────────────────────────────────────────────
// Reads back only what an export written by this app can produce: a per-note metadata
// comment (type/id/name/category/path/icon) followed by a >>> NOTE >>> / <<< NOTE <<<
// delimited block holding the user's own note text, verbatim. Ignores everything else
// (banner, group headers, human-readable entity-info blocks) — those aren't reconstructed.

const META_RE = /^<!--MHFU-NOTE (.*)-->$/
const ATTR_RE = /(\w+)="([^"]*)"/g
const unescapeAttr = (s: string) => s.replace(/&quot;/g, '"')

export function parseImportedNotes(text: string): NoteRecord[] | null {
  if (!text.includes(EXPORT_SIGNATURE)) return null

  const lines = text.split(/\r?\n/)
  const notes: NoteRecord[] = []
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(META_RE)
    if (!m) continue
    const attrs: Record<string, string> = {}
    for (const am of m[1].matchAll(ATTR_RE)) attrs[am[1]] = unescapeAttr(am[2])
    if (!attrs.type || !attrs.id) continue

    // Find the note-text delimiters somewhere after this metadata line.
    let start = -1, end = -1
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j] === '>>> NOTE >>>') { start = j + 1; continue }
      if (start !== -1 && lines[j] === '<<< NOTE <<<') { end = j; break }
    }
    if (start === -1 || end === -1) continue

    notes.push({
      type: attrs.type, id: attrs.id, name: attrs.name ?? attrs.id,
      category: attrs.category ?? '', path: attrs.path ?? '',
      icon: attrs.icon || undefined,
      note: lines.slice(start, end).join('\n'),
    })
    i = end
  }
  return notes
}
