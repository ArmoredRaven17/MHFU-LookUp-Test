import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadWeapons, loadHhSongs } from '../data/loaders'
import type { Weapon, WeaponDoc, HhSong, HhSongData } from '../types'
import { BASE } from '../utils/assets'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import MaterialList from '../components/MaterialList'
import WeaponReference from '../components/WeaponReference'
import WeaponFilterModal from '../components/WeaponFilterModal'
import { defaultWeaponFilter, isWeaponFilterActive, matchesWeaponFilter } from '../utils/weaponFilter'

// ── Constants ────────────────────────────────────────────────────────────────

// Blademaster group, then Gunner bowguns, then Bow (matches the desktop order).
const TYPE_ORDER = [
  'Great Sword','Long Sword','Sword & Shield','Dual Blades',
  'Hammer','Hunting Horn','Lance','Gunlance',
  'Light Bowgun','Heavy Bowgun','Bow',
]

// DB type → asset filename stem
function typeKey(t: string) {
  return t.replace(/ /g, '_').replace(/&/g, 'and')
}

function rarityTier(r?: number) {
  if (!r || r <= 0) return 1
  if (r >= 4) return Math.min(r, 10)
  return 1
}

function typeIcon(type: string, rarity?: number) {
  const k = typeKey(type)
  const t = rarityTier(rarity)
  return `${BASE}/assets/WeaponTypes/${k}_R${t}.png`
}

// Sharpness segment colours (Red, Orange, Yellow, Green, Blue, White, Purple) — desktop palette.
const SHARP_COLORS = ['#D03030','#E08020','#E0C020','#40A040','#3060C0','#E8E8E8','#8040C0']

// Per-class "bloat" multiplier: displayed Attack = True Raw × this, so True Raw = Attack ÷ this.
const CLASS_MULT: Record<string, number> = {
  'Great Sword': 4.8, 'Long Sword': 4.8,
  'Sword & Shield': 1.4, 'Dual Blades': 1.4,
  'Hammer': 5.2, 'Hunting Horn': 5.2,
  'Lance': 2.3, 'Gunlance': 2.3,
  'Light Bowgun': 1.2, 'Heavy Bowgun': 1.2, 'Bow': 1.2,
}

// "912 (190)" — displayed Attack with True Raw (÷ class multiplier) in parentheses.
function attackDisplay(type: string, atk: number) {
  const m = CLASS_MULT[type]
  return m ? `${atk} (${Math.round(atk / m)})` : `${atk}`
}

// Element / status token → label, colour, and element-icon stem.
const ELEMENT_DEFS: Record<string, { label: string; hex: string; icon: string }> = {
  Fir: { label: 'Fire',    hex: '#FF4D2E', icon: 'Fire' },
  Wtr: { label: 'Water',   hex: '#4A9EFF', icon: 'Water' },
  Thn: { label: 'Thunder', hex: '#F5C400', icon: 'Thunder' },
  Ice: { label: 'Ice',     hex: '#7FD8F0', icon: 'Ice' },
  Drg: { label: 'Dragon',  hex: '#B060E0', icon: 'Dragon' },
  Poi: { label: 'Poison',  hex: '#B060E0', icon: 'Poison' },
  Par: { label: 'Para',    hex: '#F5C400', icon: 'Paralysis' },
  Slp: { label: 'Sleep',   hex: '#7FD8F0', icon: 'Sleep' },
  Sle: { label: 'Sleep',   hex: '#7FD8F0', icon: 'Sleep' },
}

// ── Weapon-tree name colours (port of the desktop WeaponColors) ───────────────
const TREE_ELEM: Record<string, string> = {
  Fir: '#FF4D2E', Wtr: '#4A9EFF', Thn: '#F5C400', Ice: '#7FD8F0',
  Drg: '#B060E0', Poi: '#C040C8', Par: '#D4960A', Slp: '#B0CCE8', Sle: '#B0CCE8',
}
const TREE_BOW: Record<string, string> = {
  Fir: '#FF4D2E', Wtr: '#4A9EFF', Thn: '#F5C400', Ice: '#7FD8F0', Drg: '#B060E0', Def: '#E87820',
}
const DEF_BONUS_COLOR = '#E87820'
const MELEE_TYPES = new Set(['Great Sword', 'Long Sword', 'Sword & Shield', 'Dual Blades', 'Hammer', 'Hunting Horn'])
const CROSS_NAV_COLOR = '#5588AA'   // navigable cross-type link
const CROSS_EXT_COLOR = '#888890'   // non-navigable external / source

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function meleeNameColors(d: WeaponDoc): [string?, string?] {
  let elem = d.element_type ?? ''
  let elem2 = d.element2_type ?? ''
  const es = d.element ?? ''
  if (!elem && es) elem = es.split(/\s+/)[0]
  if (!elem2 && es) { const p = es.split(/\s+/); if (p.length >= 4) elem2 = p[2] }
  const c1 = elem ? TREE_ELEM[elem] : undefined
  const c2 = elem2 ? TREE_ELEM[elem2] : undefined
  if (c1 && c2) return [c1, c2]
  if (c1) return [c1, undefined]
  return d.def_bonus ? [DEF_BONUS_COLOR, undefined] : [undefined, undefined]
}

// A weapon-name colour: element tint, dual-element gradient, or a defense-bonus orange.
function weaponNameStyle(doc: WeaponDoc, type: string): React.CSSProperties {
  let c1: string | undefined, c2: string | undefined
  if (type === 'Bow') {
    const sp = doc.special ?? ''
    if (sp) c1 = TREE_BOW[sp.split(' / ')[0].trim().split(/\s+/)[0]]
  } else if (type === 'Gunlance' || type === 'Lance') {
    const el = doc.element ?? ''
    c1 = el ? TREE_ELEM[el.split(/\s+/)[0]] : (doc.def_bonus ? DEF_BONUS_COLOR : undefined)
  } else if (MELEE_TYPES.has(type)) {
    [c1, c2] = meleeNameColors(doc)
  }
  // bowguns: uncoloured
  if (c1 && c2) return { background: `linear-gradient(90deg, ${c1}, ${c2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }
  if (c1) return { color: c1 }
  return {}
}

// ── Tree model ────────────────────────────────────────────────────────────────
interface TNode {
  key: string
  weapon: Weapon | null   // null for external / cross-type pseudo-nodes
  name: string
  type: string
  external?: boolean
  crossId?: string        // resolved navigation target (a weapon id), when navigable
  children: TNode[]
  guides: number[]        // one per depth level: 0=blank 1=│ 2=├ 3=└ (last cell = own connector)
  depth: number
}
const GUIDE_CHAR = [' ', '│', '├', '└']

// Assign each node its depth + branch-line guides (ancestor continuations + own connector).
function assignGuides(node: TNode, segs: number[]) {
  node.depth = segs.length
  node.guides = segs.slice()
  const kids = node.children
  if (!kids.length) return
  const prefix = segs.slice()
  if (prefix.length) prefix[prefix.length - 1] = prefix[prefix.length - 1] === 2 ? 1 : 0  // ├→│, └→blank
  kids.forEach((k, i) => assignGuides(k, [...prefix, i === kids.length - 1 ? 3 : 2]))
}

interface ElemChip { icon?: string; text: string; color: string }

// Element / status displayed value with its True Value (÷10) in parentheses, e.g. "290 (29)".
function withTrueValue(v: string) {
  const n = parseInt(v, 10)
  return !isNaN(n) && n !== 0 ? `${v} (${Math.round(n / 10)})` : v
}

// Bow `special` boost token → the coating it emphasises.
const SPECIAL_COATING: Record<string, string> = {
  PoisonC: 'Poi', ParaC: 'Par', SleepC: 'Slp', PowerC: 'Pwr', PaintC: 'Pnt', CloseC: 'Cls',
}

// Parse a weapon's element info from `element_type`/`element_value` (+ element2), the `element`
// string ("Poi 290"), or a bow's `special` ("Ice 200", "Def +10", "PoisonC") — returning element
// chips, a defense bonus, and coating boosts. Mirrors the desktop ParseElementInfo source order.
function parseElementInfo(doc: WeaponDoc): { elements: ElemChip[]; defense: string; boosts: Set<string> } {
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

  const elements: ElemChip[] = []
  const boosts = new Set<string>()
  let defense = ''
  for (const [token, value] of pairs) {
    if (fromSpecial && token === 'Def') { defense = value; continue }
    if (SPECIAL_COATING[token]) { boosts.add(SPECIAL_COATING[token]); continue }
    const def = ELEMENT_DEFS[token]
    const shown = withTrueValue(value)
    elements.push({
      icon: def?.icon ? `${BASE}/assets/Elements/${def.icon}.png` : undefined,
      text: def ? shown : (value ? `${token} ${shown}` : token),
      color: def?.hex ?? 'var(--text)',
    })
  }
  return { elements, defense, boosts }
}

// Bow shot-type charge colour: Rapid=blue, Scatter=green, Pierce=red, saturating with level.
function chargeColor(type: string, level: number) {
  const t = (Math.min(Math.max(level, 1), 5) - 1) / 4
  const off = Math.round(200 + (88 - 200) * t)
  if (type === 'Rapid')   return `rgb(${off},${off},255)`
  if (type === 'Scatter') return `rgb(${off},255,${off})`
  if (type === 'Pierce')  return `rgb(255,${off},${off})`
  return 'var(--text)'
}

// Bow coating token → label + colour (boosted ones are emphasised).
const COATING_DEFS: Record<string, { label: string; hex: string }> = {
  Pwr: { label: 'Pow', hex: '#FF5252' }, Poi: { label: 'Psn', hex: '#B060E0' },
  Par: { label: 'Par', hex: '#F5C400' }, Slp: { label: 'Slp', hex: '#7FD8F0' },
  Pnt: { label: 'Pnt', hex: '#FF7FBF' }, Cls: { label: 'Cls', hex: '#FFFFFF' },
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

// Rarity-tier colour (matches the blacksmith icon palette). 1–3 share white.
function rarityColor(r: number) {
  if (r >= 10) return '#AC5CC0'
  if (r === 9) return '#FFD65A'
  if (r === 8) return '#FF5A5A'
  if (r === 7) return '#FF9C5A'
  if (r === 6) return '#94B5FF'
  if (r === 5) return '#EF94A5'
  if (r === 4) return '#73CE8C'
  return '#EFEFEF'
}

// Gunlance shelling colour (Normal=blue, Long=red, Spread=green), saturating with shell level.
function shellingColor(value: string) {
  const [type, lvStr] = value.split(' ')
  const lv = Math.min(Math.max(parseInt(lvStr, 10) || 3, 1), 5)
  const off = Math.round(200 + (88 - 200) * ((lv - 1) / 4))
  if (type === 'Normal') return `rgb(${off},${off},255)`
  if (type === 'Long')   return `rgb(255,${off},${off})`
  if (type === 'Spread') return `rgb(${off},255,${off})`
  return 'var(--text)'
}

// Hunting Horn note letter → colour icon stem.
const NOTE_COLOR: Record<string, string> = {
  W: 'white', P: 'purple', B: 'blue', A: 'aqua', Y: 'yellow', R: 'red', G: 'green',
}

// Note-set lookup key: distinct, sorted, comma-joined (uppercase sort == desktop Ordinal).
function noteKey(notes: string[]) {
  return [...new Set(notes.filter(Boolean))].sort().join(',')
}

// The songs a horn with these notes can play, in the catalogue's map order.
function songsForHorn(cat: HhSongData, notes: string[]): HhSong[] {
  const ids = cat.note_map[noteKey(notes)] ?? []
  const byId = new Map(cat.songs.map(s => [s.id, s]))
  return ids.map(id => byId.get(id)).filter((s): s is HhSong => !!s)
}

// The sequence a horn actually plays: first sequence fully covered by its notes, else the first.
function playableSequence(song: HhSong, noteSet: Set<string>): string[] {
  for (const seq of song.note_sequences) if (seq.every(n => noteSet.has(n))) return seq
  return song.note_sequences[0] ?? []
}

// ── Bowgun ammo ────────────────────────────────────────────────────────────────

// Ammo (key, display group, data source), in display order — mirrors the desktop AmmoDefs.
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

const AMMO_COLORS: Record<string, string> = {
  Normal: '#6A9CFF', Pellet: '#66CC66', Pierce: '#FF6A6A',
  Flame: '#FF4D2E', Water: '#4A9EFF', Thndr: '#F5C400', Ice: '#7FD8F0', Drgon: '#B060E0',
  Poison: '#B060E0', Para: '#F5C400', Sleep: '#7FD8F0', Recov: '#5FB85F', Paint: '#FF7FBF',
  Tranq: '#FF5252', Demn: '#FF5252', Armor: '#FFA040', Crag: '#1FC8B4', Clust: '#7B68EE',
}
const ammoColor = (key: string) => AMMO_COLORS[key] ?? 'var(--text)'

const SOURCE_LEVELS: Record<string, number> = { ammo_raw: 3, ammo_support: 2, ammo_element: 1, ammo_other: 1 }

interface AmmoLine { name: string; color: string; cells: string[] }
interface AmmoGroup { header: string; lines: AmmoLine[] }

// Clip-size cells for one ammo: value, "—" if the level exists but isn't loadable, "" beyond its levels.
function ammoCells(doc: WeaponDoc, key: string, source: keyof WeaponDoc): string[] | null {
  const obj = doc[source] as Record<string, number | number[]> | undefined
  if (!obj || !(key in obj)) return null
  const raw = obj[key]
  const levels = Array.isArray(raw) ? raw : [raw]
  if (levels.every(v => v <= 0)) return null   // gun can't load this ammo
  const sl = SOURCE_LEVELS[source]
  const cell = (i: number) => i < sl && i < levels.length ? (levels[i] > 0 ? String(levels[i]) : '—') : ''
  return [cell(0), cell(1), cell(2)]
}

function buildAmmoGroups(doc: WeaponDoc): AmmoGroup[] {
  const groups: AmmoGroup[] = []
  let cur: AmmoGroup | null = null
  for (const [key, group, source] of AMMO_DEFS) {
    const cells = ammoCells(doc, key, source)
    if (!cells) continue
    if (!cur || cur.header !== group) { cur = { header: group, lines: [] }; groups.push(cur) }
    cur.lines.push({ name: ammoLabel(key), color: ammoColor(key), cells })
  }
  return groups
}

// LBG rapid-fire ammo name → loadout key, so each chip can be tinted its ammo colour.
const RAPID_AMMO_KEYS: Record<string, string> = {
  'Normal S': 'Normal', 'Pierce S': 'Pierce', 'Flaming S': 'Flame', 'Pellet S': 'Pellet', 'Water S': 'Water',
  'Thunder S': 'Thndr', 'Crag S': 'Crag', 'Freeze S': 'Ice', 'Dragon S': 'Drgon', 'Recov S': 'Recov',
  'Clust S': 'Clust', 'Poison S': 'Poison',
}

function parseRapid(str: string): { text: string; color: string }[] {
  return str.split('/').map(s => s.trim()).filter(Boolean).map(seg => {
    let cut = seg.indexOf(' Lv')
    const paren = seg.indexOf(' (')
    if (cut < 0 || (paren >= 0 && paren < cut)) cut = paren
    const name = (cut > 0 ? seg.slice(0, cut) : seg).trim()
    const key = RAPID_AMMO_KEYS[name]
    return { text: seg, color: key ? ammoColor(key) : 'var(--text)' }
  })
}

// Reload (slow→fast) / Recoil (strong→weak) worst→best scales; best = green, worst = red.
const RELOAD_SCALE = ['Slowest','SuperSlow','VerySlow','Slow','Normal','Fast','VeryFast','SuperFast','Fastest']
const RECOIL_SCALE = ['Strong','Moderate','Light','Weak','VeryWeak','Weakest']

function hsvToRgb(h: number, s: number, v: number) {
  h = ((h % 360) + 360) % 360
  const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x } else if (h < 120) { r = x; g = c } else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c } else if (h < 300) { r = x; b = c } else { r = c; b = x }
  return `rgb(${Math.round((r + m) * 255)},${Math.round((g + m) * 255)},${Math.round((b + m) * 255)})`
}

function scaleColor(scale: string[], value: string) {
  const v = value.replace(/ /g, '').toLowerCase()
  const idx = scale.findIndex(s => s.toLowerCase() === v)
  if (idx < 0) return 'var(--text)'
  const t = scale.length <= 1 ? 0 : idx / (scale.length - 1)
  return hsvToRgb(120 * t, 0.78, 0.92)   // hue 0 = red … 120 = green
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function WeaponsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [weapons, setWeapons] = useState<Weapon[]>([])
  const [hhSongs, setHhSongs] = useState<HhSongData | null>(null)
  const [type, setType] = useState('Great Sword')

  // Fixed tree panel width — wide enough that every weapon type's deepest tree
  // (longest names/nesting, e.g. Great Sword) shows in full without horizontal scrolling.
  const TREE_WIDTH = 420

  useEffect(() => {
    loadWeapons().then(setWeapons)
    loadHhSongs().then(setHhSongs)
  }, [])

  // When a weapon is selected that's a different type, sync the type panel
  const selected = useMemo(() => weapons.find(w => w.id === id) ?? null, [weapons, id])
  useEffect(() => { if (selected) setType(selected.type) }, [selected])

  // Weapons of current type, id→weapon map and tree structure
  const typeWeapons = useMemo(() =>
    weapons.filter(w => w.type === type).sort((a, b) => a.sort_order - b.sort_order),
    [weapons, type]
  )

  // Name search + multi-criteria filter (persists across type switches, like desktop).
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState(defaultWeaponFilter())
  const [filterOpen, setFilterOpen] = useState(false)
  const filterActive = isWeaponFilterActive(filter)
  const flatMode = search.trim().length > 0 || filterActive

  // Collapsed node keys (tree defaults to fully expanded).
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const toggle = (key: string) => setCollapsed(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })

  // All-weapons index for cross-type navigation, and the reverse "forged from" map.
  const byTypeName = useMemo(() => {
    const m = new Map<string, Weapon>()
    for (const w of weapons) m.set(`${w.type}|${normName(w.name)}`, w)
    return m
  }, [weapons])
  const incoming = useMemo(() => {
    const m = new Map<string, { name: string; type: string }[]>()
    for (const w of weapons) {
      for (const e of w.doc.external_upgrades ?? []) {
        if (!e?.name || !e?.type) continue
        const key = `${e.type}|${normName(e.name)}`
        ;(m.get(key) ?? m.set(key, []).get(key)!).push({ name: w.name, type: w.type })
      }
    }
    return m
  }, [weapons])

  const roots = useMemo<TNode[]>(() => {
    const ids = new Set(typeWeapons.map(w => w.id))
    const childrenByParent = new Map<string | null, Weapon[]>()
    for (const w of typeWeapons) {
      const parentId = (w.doc.upgrades_from && ids.has(w.doc.upgrades_from)) ? w.doc.upgrades_from : null
      ;(childrenByParent.get(parentId) ?? childrenByParent.set(parentId, []).get(parentId)!).push(w)
    }
    const resolve = (t: string, n: string) => byTypeName.get(`${t}|${normName(n)}`)?.id
    const build = (w: Weapon): TNode => {
      const node: TNode = { key: `w-${w.weapon_pk}`, weapon: w, name: w.name, type: w.type, children: [], guides: [], depth: 0 }
      for (const c of childrenByParent.get(w.id) ?? []) node.children.push(build(c))
      // External upgrades → other weapon types this can be forged into (navigable italic leaves).
      for (const e of w.doc.external_upgrades ?? []) {
        if (!e?.name || !e?.type) continue
        node.children.push({
          key: `x-${w.weapon_pk}-${e.type}-${e.name}`, weapon: null, name: `${e.name} (${e.type})`,
          type: e.type, external: true, crossId: resolve(e.type, e.name), children: [], guides: [], depth: 0,
        })
      }
      return node
    }
    const out: TNode[] = []
    for (const w of childrenByParent.get(null) ?? []) {
      const node = build(w)
      const sources = incoming.get(`${type}|${normName(w.name)}`)
      if (sources && sources.length) {
        // This tree's root was forged from another type — nest it under a pseudo-parent naming the origin(s).
        const navigable = sources.length === 1
        out.push({
          key: `o-${w.weapon_pk}`, weapon: null,
          name: sources.map(s => `${s.name} (${s.type})`).join(', '),
          type: sources[0].type, external: true,
          crossId: navigable ? resolve(sources[0].type, sources[0].name) : undefined,
          children: [node], guides: [], depth: 0,
        })
      } else out.push(node)
    }
    out.forEach(r => assignGuides(r, []))
    return out
  }, [typeWeapons, type, byTypeName, incoming])

  // Flat filtered/searched list — no tree structure, cross-type nesting, or collapse (matches desktop).
  const flatNodes = useMemo<TNode[]>(() => {
    if (!flatMode) return []
    const q = search.trim().toLowerCase()
    return typeWeapons
      .filter(w => (!q || w.name.toLowerCase().includes(q)) && matchesWeaponFilter(w.doc, type, w.name, filter))
      .map(w => ({ key: `w-${w.weapon_pk}`, weapon: w, name: w.name, type: w.type, children: [], guides: [], depth: 0 }))
  }, [typeWeapons, type, search, filter, flatMode])

  // Every node that has children (for Collapse All).
  const collapsibleKeys = useMemo(() => {
    const keys: string[] = []
    const walk = (n: TNode) => { if (n.children.length) { keys.push(n.key); n.children.forEach(walk) } }
    roots.forEach(walk)
    return keys
  }, [roots])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Left panel ── */}
      <div style={{
        width: TREE_WIDTH, minWidth: TREE_WIDTH,
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Type selector */}
        <div style={{
          padding: '6px 6px 4px',
          borderBottom: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3,
        }}>
          {TYPE_ORDER.map(t => (
            <button key={t} onClick={() => setType(t)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 6px', borderRadius: 3, cursor: 'pointer',
              background: type === t ? 'var(--header-bg)' : 'transparent',
              border: type === t ? '1px solid var(--accent)' : '1px solid transparent',
              color: type === t ? 'var(--accent)' : 'var(--muted)',
              fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              <img src={typeIcon(t)} alt="" width={16} height={16}
                   style={{ objectFit: 'contain', flexShrink: 0 }} />
              {t}
            </button>
          ))}
        </div>

        {/* Name search */}
        <div style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search weapons…" style={{
            width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text)', padding: '4px 8px', fontSize: 12,
          }} />
        </div>

        {/* Type-specific reference sheets for the selected weapon type */}
        <div style={{ padding: '6px', borderBottom: '1px solid var(--border)' }}>
          <WeaponReference type={type} hhSongs={hhSongs} />
        </div>

        {/* Expand / collapse / filter */}
        <div style={{ display: 'flex', gap: 6, padding: '4px 6px', borderBottom: '1px solid var(--border)' }}>
          {([['Expand All', () => setCollapsed(new Set())], ['Collapse All', () => setCollapsed(new Set(collapsibleKeys))]] as const).map(([label, fn]) => (
            <button key={label} onClick={fn} style={{
              flex: 1, padding: '3px 6px', fontSize: 11, cursor: 'pointer',
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 3, color: 'var(--muted)',
            }}>{label}</button>
          ))}
          <button onClick={() => setFilterOpen(true)} style={{
            flex: 1, padding: '3px 6px', fontSize: 11, cursor: 'pointer',
            background: filterActive ? 'var(--header-bg)' : 'var(--surface)',
            border: filterActive ? '1px solid var(--accent)' : '1px solid var(--border)',
            borderRadius: 3, color: filterActive ? 'var(--accent)' : 'var(--muted)', fontWeight: filterActive ? 600 : 400,
          }}>Filter…</button>
        </div>

        {/* Weapon tree (scrolls horizontally so long names stay fully readable).
            Searching or filtering flattens to a plain matching list (no tree/cross-type nesting),
            matching the desktop behaviour. */}
        <div style={{ overflow: 'auto', flex: 1, padding: '4px 0' }}>
          <div style={{ minWidth: 'max-content' }}>
            {(flatMode ? flatNodes : roots).map(n => (
              <TreeNode key={n.key} node={n} selectedId={id} collapsed={collapsed}
                        onToggle={toggle} onNavigate={wid => navigate(`/weapons/${wid}`)} />
            ))}
            {flatMode && flatNodes.length === 0 && (
              <p style={{ color: 'var(--muted)', padding: '8px 12px', fontSize: 12 }}>No weapons match.</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p className="text-muted" style={{ marginTop: 16 }}>Select a weapon from the tree.</p>
          : <WeaponDetail weapon={selected} allWeapons={weapons} hhSongs={hhSongs} onNavigate={id => navigate(`/weapons/${id}`)} />
        }
      </div>

      {filterOpen && (
        <WeaponFilterModal type={type} current={filter}
          onApply={f => { setFilter(f); setFilterOpen(false) }}
          onClose={() => setFilterOpen(false)} />
      )}
    </div>
  )
}

// ── Weapon tree node ──────────────────────────────────────────────────────────

function TreeNode({ node, selectedId, collapsed, onToggle, onNavigate }: {
  node: TNode
  selectedId?: string
  collapsed: Set<string>
  onToggle: (key: string) => void
  onNavigate: (weaponId: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.key)
  const active = !!node.weapon && node.weapon.id === selectedId
  const clickable = node.external ? !!node.crossId : true
  const nameStyle: React.CSSProperties = node.external
    ? { color: node.crossId ? CROSS_NAV_COLOR : CROSS_EXT_COLOR, fontStyle: 'italic' }
    : weaponNameStyle(node.weapon!.doc, node.type)

  const onClick = () => {
    if (node.external) { if (node.crossId) onNavigate(node.crossId) }
    else if (node.weapon) onNavigate(node.weapon.id)
  }

  return (
    <div>
      <div onClick={clickable ? onClick : undefined} style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px 3px 4px',
        background: active ? 'var(--header-bg)' : 'transparent',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: clickable ? 'pointer' : 'default', fontSize: 12,
      }}>
        {/* Branch-line guides */}
        {node.guides.map((g, i) => (
          <span key={i} style={{ width: 13, flexShrink: 0, textAlign: 'center', fontFamily: 'monospace', color: 'var(--border)' }}>
            {GUIDE_CHAR[g]}
          </span>
        ))}
        {/* Collapse toggle (or spacer, to keep names aligned) */}
        {hasChildren
          ? <span onClick={e => { e.stopPropagation(); onToggle(node.key) }}
                  title={isCollapsed ? 'Expand' : 'Collapse'}
                  style={{ width: 14, flexShrink: 0, textAlign: 'center', cursor: 'pointer', color: 'var(--muted)' }}>
              {isCollapsed ? '▸' : '▾'}
            </span>
          : <span style={{ width: 14, flexShrink: 0 }} />}
        {/* Rarity-coloured type icon (weapon rows only) */}
        {node.weapon
          ? <img src={typeIcon(node.type, node.weapon.doc.rarity)} alt="" width={16} height={16}
                 style={{ objectFit: 'contain', flexShrink: 0 }}
                 onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
          : <span style={{ width: 16, flexShrink: 0 }} />}
        <span style={{ whiteSpace: 'nowrap', color: active ? 'var(--accent)' : 'var(--text)', ...nameStyle }}>
          {node.name}
        </span>
      </div>
      {hasChildren && !isCollapsed && node.children.map(c => (
        <TreeNode key={c.key} node={c} selectedId={selectedId} collapsed={collapsed} onToggle={onToggle} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

// ── Weapon detail ─────────────────────────────────────────────────────────────

function WeaponDetail({ weapon: w, allWeapons, hhSongs, onNavigate }: {
  weapon: Weapon
  allWeapons: Weapon[]
  hhSongs: HhSongData | null
  onNavigate: (id: string) => void
}) {
  const doc = w.doc
  const isBowgun = w.type === 'Light Bowgun' || w.type === 'Heavy Bowgun'
  const isBow = w.type === 'Bow'
  const isMelee = !isBowgun && !isBow
  const isHH = w.type === 'Hunting Horn'

  // Hunting Horn: the songs this horn can play, and its note set (for the played sequence).
  const hornNotes = isHH && doc.notes ? doc.notes : []
  const noteSet = new Set(hornNotes)
  const songs = isHH && hhSongs ? songsForHorn(hhSongs, hornNotes) : []

  const parent = doc.upgrades_from ? allWeapons.find(x => x.id === doc.upgrades_from) : null
  const children = allWeapons.filter(x => x.doc.upgrades_from === w.id && x.type === w.type)
  const extUpgrades = doc.external_upgrades ?? []

  const info = parseElementInfo(doc)
  const elements = info.elements
  const defense = doc.def_bonus ? (doc.def_bonus > 0 ? `+${doc.def_bonus}` : `${doc.def_bonus}`) : info.defense
  // Non-HH weapons: the notes array is plain text; HH notes are colours shown below.
  const notesText = !isHH && doc.notes && doc.notes.length > 0 ? doc.notes.join(', ') : ''

  return (
    <div style={{ maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src={typeIcon(w.type, doc.rarity)} alt="" width={44} height={44}
             style={{ objectFit: 'contain' }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>{w.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>{w.type}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'weapon', id: w.id, name: w.name, path: `/weapons/${w.id}` }} />
      </div>

      {/* Core stats */}
      <Section title="Stats">
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <StatRow label="Attack" value={attackDisplay(w.type, doc.atk)} />
            {elements.length > 0 && (
              <StatRow label="Element" value={
                <span style={{ display: 'inline-flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {elements.map((e, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: e.color }}>
                      {e.icon && <img src={e.icon} alt="" width={16} height={16} style={{ objectFit: 'contain' }} />}
                      {e.text}
                    </span>
                  ))}
                </span>
              } />
            )}
            {doc.affinity !== 0 && (
              <StatRow label="Affinity"
                value={<span style={{ color: doc.affinity > 0 ? 'var(--positive)' : 'var(--negative)' }}>
                  {doc.affinity > 0 ? '+' : ''}{doc.affinity}%
                </span>} />
            )}
            {defense && <StatRow label="Defense" value={defense} />}
            {doc.shelling && (
              <StatRow label="Shelling"
                value={<span style={{ color: shellingColor(doc.shelling) }}>{doc.shelling}</span>} />
            )}
            <StatRow label="Slots" value={doc.slots > 0 ? '○'.repeat(doc.slots) : '—'} />
            {doc.rarity ? (
              <StatRow label="Rarity"
                value={<span style={{ color: rarityColor(doc.rarity) }}>Rare {doc.rarity}</span>} />
            ) : null}
            {notesText && <StatRow label="Notes" value={notesText} />}
            {isBowgun && (
              <>
                {doc.reload && <StatRow label="Reload"
                  value={<span style={{ color: scaleColor(RELOAD_SCALE, doc.reload) }}>{doc.reload}</span>} />}
                {doc.recoil && <StatRow label="Recoil"
                  value={<span style={{ color: scaleColor(RECOIL_SCALE, doc.recoil) }}>{doc.recoil}</span>} />}
              </>
            )}
            {doc.price > 0 && <StatRow label="Price" value={`${doc.price.toLocaleString()}z`} />}
          </tbody>
        </table>

        {/* Hunting Horn note colours */}
        {isHH && doc.notes && doc.notes.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
            <span style={{ color: 'var(--muted)', fontSize: 12, marginRight: 2 }}>Notes:</span>
            {doc.notes.map((n, i) => (
              <img key={i} src={`${BASE}/assets/Notes/Note.${NOTE_COLOR[n] ?? 'white'}.png`}
                   alt={n} title={n} width={20} height={20} style={{ objectFit: 'contain' }} />
            ))}
          </div>
        )}
      </Section>

      {/* Sharpness (melee only) */}
      {isMelee && doc.sharpness && (
        <Section title="Sharpness">
          <div style={{ marginBottom: 4 }}>
            <SharpBar values={doc.sharpness} />
          </div>
          {doc.sharpness_plus1 && (
            <div>
              <span style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2, display: 'block' }}>+1 Handicraft</span>
              <SharpBar values={doc.sharpness_plus1} />
            </div>
          )}
        </Section>
      )}

      {/* Hunting Horn songs */}
      {isHH && songs.length > 0 && (
        <Section title="Songs">
          {songs.map(s => {
            const seq = playableSequence(s, noteSet)
            return (
              <div key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', gap: 2 }}>
                    {seq.map((n, i) => (
                      <img key={i} src={`${BASE}/assets/Notes/Note.${NOTE_COLOR[n] ?? 'white'}.png`}
                           alt={n} title={n} width={16} height={16} style={{ objectFit: 'contain' }} />
                    ))}
                  </span>
                  <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{s.name}</span>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>— {s.effect} ({s.duration})</span>
                </div>
                {s.encore_effect && (
                  <p style={{ margin: '2px 0 0 4px', color: 'var(--muted)', fontSize: 11, fontStyle: 'italic' }}>
                    Encore: {s.encore_effect} ({s.encore_duration})
                  </p>
                )}
              </div>
            )
          })}
        </Section>
      )}

      {/* Bow charges & coatings */}
      {isBow && (doc.charges || doc.coatings) && (
        <Section title="Bow Details">
          {doc.charges && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Charges</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {doc.charges.map((c, i) => {
                  const [type, lvStr] = c.split(' ')
                  const lv = parseInt(lvStr, 10) || 0
                  return (
                    <span key={i} style={{
                      border: '1px solid var(--border)', borderRadius: 3, padding: '2px 8px',
                      fontSize: 12, fontWeight: 600, color: chargeColor(type, lv),
                    }}>{c}</span>
                  )
                })}
              </div>
            </div>
          )}
          {doc.coatings && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Coatings</p>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {doc.coatings.map((c, i) => {
                  const def = COATING_DEFS[c] ?? { label: c, hex: '#D4D4D4' }
                  const boosted = info.boosts.has(c)
                  return (
                    <span key={i} title={boosted ? 'Boosted' : undefined} style={{
                      border: `1px solid ${boosted ? def.hex : 'var(--border)'}`,
                      background: boosted ? hexToRgba(def.hex, 0.22) : 'transparent',
                      borderRadius: 3, padding: '2px 8px', fontSize: 12,
                      fontWeight: boosted ? 700 : 600, color: def.hex,
                    }}>{def.label}</span>
                  )
                })}
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Bowgun ammo */}
      {isBowgun && <BowgunAmmo doc={doc} />}

      {/* Materials */}
      {(doc.materials || doc.materials_alt) && (
        <Section title="Materials">
          {doc.materials && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ margin: '0 0 2px', color: 'var(--muted)', fontSize: 11 }}>Upgrade</p>
              <MaterialList csv={doc.materials} vertical />
            </div>
          )}
          {doc.materials_alt && (
            <div>
              <p style={{ margin: '0 0 2px', color: 'var(--muted)', fontSize: 11 }}>Create</p>
              <MaterialList csv={doc.materials_alt} vertical />
            </div>
          )}
        </Section>
      )}

      {/* Upgrade path */}
      {(parent || children.length > 0 || extUpgrades.length > 0) && (
        <Section title="Upgrade Path">
          {parent && (
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--muted)', fontSize: 11 }}>Upgrades from: </span>
              <button onClick={() => onNavigate(parent.id)} style={{
                background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600,
                cursor: 'pointer', fontSize: 13, padding: 0,
              }}>{parent.name}</button>
            </div>
          )}
          {children.length > 0 && (
            <div style={{ marginBottom: 6 }}>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Upgrades into:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 8 }}>
                {children.map(c => (
                  <button key={c.id} onClick={() => onNavigate(c.id)} style={{
                    background: 'none', border: 'none', color: 'var(--accent)', textDecoration: 'underline', fontWeight: 600,
                    cursor: 'pointer', fontSize: 13, padding: 0, textAlign: 'left',
                  }}>└ {c.name}</button>
                ))}
              </div>
            </div>
          )}
          {extUpgrades.length > 0 && (
            <div>
              <p style={{ color: 'var(--muted)', fontSize: 11, margin: '0 0 4px' }}>Cross-type upgrades:</p>
              {extUpgrades.map((e, i) => (
                <p key={i} style={{ margin: 0, fontSize: 12, color: 'var(--text)' }}>
                  {e.name} <span style={{ color: 'var(--muted)' }}>({e.type})</span>
                </p>
              ))}
            </div>
          )}
        </Section>
      )}

      <Section title="Notes">
        <NotesBox target={{ type: 'weapon', id: w.id, name: w.name, category: w.type, path: `/weapons/${w.id}`, icon: typeIcon(w.type, doc.rarity) }} />
      </Section>
    </div>
  )
}

// ── Helper components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="tbl-row">
      <td className="tbl-cell" style={{ color: 'var(--muted)', width: 110, verticalAlign: 'top' }}>{label}</td>
      <td className="tbl-cell">{value}</td>
    </tr>
  )
}

// Sharpness bar: each segment is (value × 2)px wide, coloured by tier — matches desktop.
function SharpBar({ values }: { values: number[] }) {
  return (
    <div style={{ display: 'flex', height: 12, borderRadius: 2, overflow: 'hidden',
                  border: '1px solid var(--border)', width: 'fit-content' }}>
      {values.map((v, i) => v > 0 && (
        <div key={i} style={{ width: v * 2, background: SHARP_COLORS[i], flexShrink: 0 }} />
      ))}
    </div>
  )
}

const AMMO_GRID = '150px 46px 46px 46px'

function BowgunAmmo({ doc }: { doc: WeaponDoc }) {
  const groups = buildAmmoGroups(doc)
  const rapid = doc.rapid ? parseRapid(doc.rapid) : []

  return (
    <>
      {/* Rapid Fire (Light Bowgun) — one colour-coded line per ammo */}
      {rapid.length > 0 && (
        <Section title="Rapid Fire">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {rapid.map((r, i) => (
              <span key={i} style={{ color: r.color, fontSize: 13, fontWeight: 600 }}>{r.text}</span>
            ))}
          </div>
        </Section>
      )}

      {/* Ammo loadout: colour-coded name + per-level clip sizes */}
      {groups.length > 0 && (
        <Section title="Ammo">
          <div style={{ display: 'grid', gridTemplateColumns: AMMO_GRID, fontSize: 11, color: 'var(--text)', marginBottom: 2 }}>
            <span />
            {['Lv1','Lv2','Lv3'].map(h => <span key={h} style={{ textAlign: 'center' }}>{h}</span>)}
          </div>
          {groups.map(g => (
            <div key={g.header} style={{ marginBottom: 6 }}>
              <p style={{ margin: '0 0 1px', color: 'var(--muted)', fontSize: 11, fontWeight: 600 }}>{g.header}</p>
              {g.lines.map((ln, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: AMMO_GRID, fontSize: 13 }}>
                  <span style={{ color: ln.color, fontWeight: 600 }}>{ln.name}</span>
                  {ln.cells.map((c, j) => (
                    <span key={j} style={{ textAlign: 'center', color: 'var(--text)' }}>{c}</span>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </Section>
      )}
    </>
  )
}
