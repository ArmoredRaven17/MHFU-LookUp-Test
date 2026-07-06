import type { WeaponDoc } from '../types'

// Weapon filter state + matching — port of the desktop WeaponFilter.cs.

export interface WeaponFilterState {
  name: string
  elements: Set<string>            // Raw, Fir, Wtr, Thn, Ice, Drg, Poi, Par, Slp
  minAtk: number
  affinity: 'any' | 'positive' | 'negative'
  minSlots: number                 // 0=Any, 1, 2, 3
  defBonus: boolean
  minSharpness: string             // Any | Yellow | Green | Blue | White | Purple
  coatings: Set<string>
  shotTypes: Map<string, number>   // type -> min level
  shotChargeLevel: number          // 0=any (aggregate); 1..4 = at that charge slot
  ammoRaw: Set<string>
  ammoSupport: Set<string>
  ammoElement: Set<string>
  ammoOther: Set<string>
  notes: [string, string, string]  // HH note letters ("" = any)
  shellType: string                // "" | Normal | Long | Spread
  shellLevelMin: number
}

export function defaultWeaponFilter(): WeaponFilterState {
  return {
    name: '', elements: new Set(), minAtk: 0, affinity: 'any', minSlots: 0, defBonus: false,
    minSharpness: 'Any', coatings: new Set(), shotTypes: new Map(), shotChargeLevel: 0,
    ammoRaw: new Set(), ammoSupport: new Set(), ammoElement: new Set(), ammoOther: new Set(),
    notes: ['', '', ''], shellType: '', shellLevelMin: 0,
  }
}

export const MELEE_FILTER_TYPES = new Set(['Great Sword', 'Long Sword', 'Sword & Shield', 'Dual Blades', 'Hammer', 'Hunting Horn'])

export function isWeaponFilterActive(f: WeaponFilterState): boolean {
  return f.name.length > 0 || f.elements.size > 0 || f.minAtk > 0 || f.affinity !== 'any' || f.minSlots > 0
    || f.defBonus || f.minSharpness !== 'Any' || f.coatings.size > 0 || f.shotTypes.size > 0
    || f.ammoRaw.size > 0 || f.ammoSupport.size > 0 || f.ammoElement.size > 0 || f.ammoOther.size > 0
    || f.notes.some(n => n.length > 0) || f.shellType.length > 0 || f.shellLevelMin > 0
}

const SHARP_INDEX: Record<string, number> = { Yellow: 2, Green: 3, Blue: 4, White: 5, Purple: 6 }
const ELEMENT_TOKENS = new Set(['Fir', 'Wtr', 'Thn', 'Ice', 'Drg'])

// Bows carry their defense bonus as a "Def +N" segment of `special` rather than def_bonus.
function specialHasDef(doc: WeaponDoc): boolean {
  return (doc.special ?? '').split('/').some(s => s.trim().startsWith('Def'))
}

function weaponElements(doc: WeaponDoc): Set<string> {
  const e = new Set<string>()
  if (doc.element_type) e.add(doc.element_type)
  if (doc.element2_type) e.add(doc.element2_type)
  const es = doc.element ?? ''
  if (es) {
    const parts = es.split(/\s+/).filter(Boolean)
    for (let i = 0; i + 1 < parts.length; i += 2) e.add(parts[i])
  }
  // Bow `special` mixes elements with non-element tokens ("Def +20", coating boosts like "PoisonC").
  // Only true elements count — a coating-boost bow is Raw.
  const sp = doc.special ?? ''
  for (const seg of sp.split('/')) {
    const token = seg.trim().split(/\s+/)[0]
    if (token && ELEMENT_TOKENS.has(token)) e.add(token)
  }
  return e.size > 0 ? e : new Set(['Raw'])
}

function ammoMatches(set: Set<string>, ammo: Record<string, number | number[]> | undefined): boolean {
  if (!ammo) return false
  for (const key of set) {
    const v = ammo[key]
    if (Array.isArray(v)) { if (v.some(x => x > 0)) return true }
    else if (typeof v === 'number' && v > 0) return true
  }
  return false
}

function hasOverlap(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return true
  return false
}

export function matchesWeaponFilter(doc: WeaponDoc, type: string, name: string, f: WeaponFilterState): boolean {
  if (f.name.length > 0 && !name.toLowerCase().includes(f.name.toLowerCase())) return false
  if (f.elements.size > 0 && !hasOverlap(f.elements, weaponElements(doc))) return false
  if (f.minAtk > 0 && doc.atk < f.minAtk) return false
  if (f.affinity === 'positive' && doc.affinity <= 0) return false
  if (f.affinity === 'negative' && doc.affinity >= 0) return false
  if (doc.slots < f.minSlots) return false
  if (f.defBonus && !doc.def_bonus && !specialHasDef(doc)) return false

  if (MELEE_FILTER_TYPES.has(type) && f.minSharpness !== 'Any') {
    const idx = SHARP_INDEX[f.minSharpness]
    const sharp = doc.sharpness_plus1 ?? doc.sharpness
    let ok = false
    if (sharp) for (let i = idx; i < 7 && i < sharp.length; i++) if (sharp[i] > 0) { ok = true; break }
    if (!ok) return false
  }

  if (f.coatings.size > 0) {
    const cs = new Set(doc.coatings ?? [])
    if (!hasOverlap(f.coatings, cs)) return false
  }

  if (f.shotTypes.size > 0) {
    const charges = doc.charges ?? []
    if (f.shotChargeLevel > 0) {
      // Require the shot type AT a specific charge slot.
      const idx = f.shotChargeLevel - 1
      if (idx >= charges.length) return false
      const parts = charges[idx].split(/\s+/)
      const slotType = parts[0] ?? ''
      const slotLvl = parts.length === 2 ? parseInt(parts[1], 10) : 0
      const slotMin = f.shotTypes.get(slotType)
      if (slotMin === undefined || slotLvl < slotMin) return false
    } else {
      // Aggregate: each checked shot type must appear at/above its level across any slot.
      const weaponMax = new Map<string, number>()
      for (const c of charges) {
        const parts = c.split(/\s+/)
        if (parts.length === 2) {
          const lvl = parseInt(parts[1], 10)
          if (!isNaN(lvl) && lvl > (weaponMax.get(parts[0]) ?? 0)) weaponMax.set(parts[0], lvl)
        }
      }
      for (const [st, min] of f.shotTypes) if ((weaponMax.get(st) ?? 0) < min) return false
    }
  }

  if (f.ammoRaw.size > 0 && !ammoMatches(f.ammoRaw, doc.ammo_raw)) return false
  if (f.ammoSupport.size > 0 && !ammoMatches(f.ammoSupport, doc.ammo_support)) return false
  if (f.ammoElement.size > 0 && !ammoMatches(f.ammoElement, doc.ammo_element)) return false
  if (f.ammoOther.size > 0 && !ammoMatches(f.ammoOther, doc.ammo_other)) return false

  if (type === 'Hunting Horn' && f.notes.some(n => n.length > 0)) {
    const hh = (doc.notes ?? []).filter(Boolean)
    if (hh.length === 0) return false
    if (f.notes[0] && hh[0] !== f.notes[0]) return false
    const want = [f.notes[1], f.notes[2]].filter(Boolean)
    const others = hh.slice(1)
    const wantCounts = new Map<string, number>()
    for (const w of want) wantCounts.set(w, (wantCounts.get(w) ?? 0) + 1)
    for (const [letter, count] of wantCounts)
      if (others.filter(o => o === letter).length < count) return false
  }

  if (type === 'Gunlance' && (f.shellType.length > 0 || f.shellLevelMin > 0)) {
    const parts = (doc.shelling ?? '').split(/\s+/)
    const st = parts[0] ?? ''
    const lvl = parts.length > 1 ? parseInt(parts[1], 10) : 0
    if (f.shellType && st !== f.shellType) return false
    if (f.shellLevelMin > 0 && (isNaN(lvl) || lvl < f.shellLevelMin)) return false
  }

  return true
}
