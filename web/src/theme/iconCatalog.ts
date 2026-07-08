// EXPERIMENTAL — Tab Icon picker expanded from "any monster" to "any game-content icon",
// grouped by type. Self-contained so it's easy to roll back: revert the 3 call sites
// (SettingsPage.tsx, Layout.tsx) and delete this file.
import { BASE } from '../utils/assets'
import type { Monster, Item, Award } from '../types'

export interface IconEntry { value: string; label: string; src: string; group: string }

const WEAPON_TYPES: [string, string][] = [ // [label, filename stem]
  ['Great Sword', 'Great_Sword'], ['Long Sword', 'Long_Sword'], ['Sword & Shield', 'Sword_and_Shield'],
  ['Dual Blades', 'Dual_Blades'], ['Hammer', 'Hammer'], ['Hunting Horn', 'Hunting_Horn'],
  ['Lance', 'Lance'], ['Gunlance', 'Gunlance'], ['Light Bowgun', 'Light_Bowgun'],
  ['Heavy Bowgun', 'Heavy_Bowgun'], ['Bow', 'Bow'],
]
const ELEMENTS = ['Dragon', 'Fire', 'Ice', 'Paralysis', 'Poison', 'Sleep', 'Thunder', 'Water']
const LOCATIONS: [string, string][] = [ // [filename stem, label]
  ['arena', 'Arena'], ['battleground', 'Battleground'], ['castle_schrade', 'Castle Schrade'],
  ['desert', 'Desert'], ['forest_and_hills', 'Forest and Hills'], ['fortress', 'Fortress'],
  ['great_forest', 'Great Forest'], ['jungle', 'Jungle'], ['old_desert', 'Old Desert'],
  ['old_jungle', 'Old Jungle'], ['old_swamp', 'Old Swamp'], ['old_volcano', 'Old Volcano'],
  ['snowy_mountains', 'Snowy Mountains'], ['swamp', 'Swamp'], ['tower', 'Tower'],
  ['town', 'Town'], ['volcano', 'Volcano'],
]
// One representative (base/Rare-1) icon per slot — Armor has no untinted file like WeaponTypes
// does, so R1 stands in as the canonical look rather than listing all 8 rarity-tinted variants.
const ARMOR_SLOTS = ['Head', 'Chest', 'Arms', 'Waist', 'Legs']
const NOTE_COLORS = ['aqua', 'blue', 'green', 'purple', 'red', 'white', 'yellow']
const DECO_COLORS = ['blue', 'cyan', 'gray', 'green', 'orange', 'pink', 'red', 'slate', 'white', 'yellow']

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** category:id — resolves to the full asset URL. Bare/no-colon values are legacy monster ids. */
export function resolveIconSrc(value: string): string {
  const i = value.indexOf(':')
  if (i < 0) return `${BASE}/assets/Monsters/${value}.png`
  const cat = value.slice(0, i), id = value.slice(i + 1)
  switch (cat) {
    case 'monster': return `${BASE}/assets/Monsters/${id}.png`
    case 'weapon': return `${BASE}/assets/WeaponTypes/${id}.png`
    case 'element': return `${BASE}/assets/Elements/${id}.png`
    case 'location': return `${BASE}/assets/Locations/${id}.png`
    case 'note': return `${BASE}/assets/Notes/Note.${id}.png`
    case 'decocolor': return `${BASE}/assets/Decorations/${id}.png`
    case 'armor': return `${BASE}/assets/Armor/${id}.png`
    case 'award': return `${BASE}/assets/Awards/${id}.png`
    case 'item': return `${BASE}/assets/Items/${id}.png`
    default: return `${BASE}/assets/Monsters/${id}.png`
  }
}

const GROUP_BY_CATEGORY: Record<string, string> = {
  monster: 'Monsters', weapon: 'Weapon Types', element: 'Elements', location: 'Locations',
  armor: 'Armor', note: 'Hunting Horn Notes', decocolor: 'Decoration Colors', award: 'Awards', item: 'Items',
}

/** Best-effort label/group for a value that isn't in the built catalog — e.g. a saved default
 * referencing an armor rarity tier that's since been trimmed out of the picker's own option list.
 * Keeps an "orphaned" selection displaying correctly (right category, readable label) instead of
 * showing the raw `category:id` string. */
export function describeIconValue(value: string): { label: string; group: string } {
  const i = value.indexOf(':')
  if (i < 0) return { label: value, group: 'Monsters' }
  const cat = value.slice(0, i), id = value.slice(i + 1)
  const group = GROUP_BY_CATEGORY[cat] ?? 'Monsters'
  if (cat === 'armor') {
    const m = id.match(/^(\w+)_R(\d+)$/)
    if (m) return { label: `${cap(m[1])} (Rare ${m[2]})`, group }
  }
  if (cat === 'note') return { label: `${cap(id)} Note`, group }
  if (cat === 'decocolor') return { label: `${cap(id)} Jewel`, group }
  return { label: id, group }
}

export function buildIconCatalog(monsters: Monster[], items: Item[], awards: Award[]): IconEntry[] {
  const out: IconEntry[] = []

  for (const m of monsters) {
    out.push({ value: `monster:${m.id}`, label: m.name, src: resolveIconSrc(`monster:${m.id}`), group: 'Monsters' })
  }
  for (const [label, stem] of WEAPON_TYPES) {
    out.push({ value: `weapon:${stem}`, label, src: resolveIconSrc(`weapon:${stem}`), group: 'Weapon Types' })
  }
  for (const e of ELEMENTS) {
    out.push({ value: `element:${e}`, label: e, src: resolveIconSrc(`element:${e}`), group: 'Elements' })
  }
  for (const [stem, label] of LOCATIONS) {
    out.push({ value: `location:${stem}`, label, src: resolveIconSrc(`location:${stem}`), group: 'Locations' })
  }
  for (const slot of ARMOR_SLOTS) {
    const stem = `${slot.toLowerCase()}_R1`
    out.push({ value: `armor:${stem}`, label: slot, src: resolveIconSrc(`armor:${stem}`), group: 'Armor' })
  }
  for (const c of NOTE_COLORS) {
    out.push({ value: `note:${c}`, label: `${cap(c)} Note`, src: resolveIconSrc(`note:${c}`), group: 'Hunting Horn Notes' })
  }
  for (const c of DECO_COLORS) {
    out.push({ value: `decocolor:${c}`, label: `${cap(c)} Jewel`, src: resolveIconSrc(`decocolor:${c}`), group: 'Decoration Colors' })
  }
  for (const a of awards) {
    out.push({ value: `award:${a.icon}`, label: a.name, src: resolveIconSrc(`award:${a.icon}`), group: 'Awards' })
  }
  // Many items share the same icon sprite (e.g. every basic Potion variant) — dedupe by icon so
  // the list isn't full of visually-identical entries; keep the first item's name as the label.
  const seenItemIcons = new Set<string>()
  for (const it of items) {
    if (!it.icon || seenItemIcons.has(it.icon)) continue
    seenItemIcons.add(it.icon)
    out.push({ value: `item:${it.icon}`, label: it.name, src: resolveIconSrc(`item:${it.icon}`), group: 'Items' })
  }

  return out
}
