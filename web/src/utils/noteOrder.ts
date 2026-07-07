import { useEffect, useState } from 'react'
import {
  loadMonsters, loadMonsterOrder, loadWeapons, loadArmorSets, loadQuests,
} from '../data/loaders'
import type { NoteRecord } from '../hooks/useNotes'
import type { Monster, Weapon, ArmorSet, Quest } from '../types'

// Matches QuestsPage.tsx / TrainingSchoolPage.tsx category order, and Layout.tsx's
// NAV order (Quests tab before Training School tab).
const MAIN_CATEGORIES = [
  'village_low_rank_elder', 'guild_low_rank',
  'village_high_rank_nekoht', 'guild_high_rank', 'guild_g_rank',
]
const TRAINING_CATEGORIES = [
  'training_basic', 'training_weapon_mastery', 'training_battle',
  'training_special', 'training_g_lv', 'training_group',
]
const QUEST_CATEGORY_ORDER = [...MAIN_CATEGORIES, ...TRAINING_CATEGORIES]

// Matches WeaponsPage.tsx's curated TYPE_ORDER (not alphabetical).
const WEAPON_TYPE_ORDER = [
  'Great Sword', 'Long Sword', 'Sword & Shield', 'Dual Blades',
  'Hammer', 'Hunting Horn', 'Lance', 'Gunlance',
  'Light Bowgun', 'Heavy Bowgun', 'Bow',
]

interface OrderMaps {
  monster: Map<string, number>
  weapon: Map<string, number>
  armorset: Map<string, number>
  quest: Map<string, number>
}

interface EntityMaps {
  monster: Map<string, Monster>
  weapon: Map<string, Weapon>
  armorset: Map<string, ArmorSet>
  quest: Map<string, Quest>
}

/** What's needed to reconstruct a NoteTarget from a name found in an imported export. */
export interface ImportTarget { type: string; id: string; path: string }

interface NameMaps {
  monster: Map<string, ImportTarget>       // key: monster name
  weapon: Map<string, ImportTarget>        // key: `${type}::${name}`
  armorset: Map<string, ImportTarget>      // key: every gender/class-resolved display name
  quest: Map<string, ImportTarget>         // key: quest name (globally unique in practice)
}

interface NoteData { order: OrderMaps; entities: EntityMaps; names: NameMaps }

const EMPTY_MAPS: OrderMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}
const EMPTY_ENTITIES: EntityMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}
const EMPTY_NAMES: NameMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}
const EMPTY_DATA: NoteData = { order: EMPTY_MAPS, entities: EMPTY_ENTITIES, names: EMPTY_NAMES }

let cached: NoteData | null = null
let inFlight: Promise<NoteData> | null = null

// Resolve an armor set's display name for a gender/class combo — mirrors
// ArmorSetsPage.tsx's resolveSetName/stripFrom/classHalf (duplicated here since this
// is name-matching logic, not a UI render, so sharing a component isn't a good fit).
function resolveSetName(name: string, female: boolean, gunner: boolean) {
  const hasMale = name.includes('(Male)')
  const hasFemale = name.includes('(Female)')
  let side = name
  if (hasMale && hasFemale) {
    const m = name.match(/^(.*?)\s*\(Male\)\s*\/\s*(.*?)\s*\(Female\)$/)
    if (m) {
      const male = m[1].trim(), fem = m[2].trim()
      side = female ? fem : male
      if (!side) side = female ? male : fem
    }
  } else if (hasFemale) side = stripFrom(name, '(Female)')
  else if (hasMale) side = stripFrom(name, '(Male)')
  return classHalf(side, gunner)
}
function stripFrom(s: string, marker: string) {
  const i = s.indexOf(marker)
  return i < 0 ? s : s.slice(0, i).trimEnd()
}
function classHalf(side: string, gunner: boolean) {
  const i = side.indexOf(' / ')
  if (i < 0) return side.trim()
  const bm = side.slice(0, i).trim()
  const gn = side.slice(i + 3).trim()
  if (gunner) return gn
  for (const suf of [' Armor Set', ' Armor', ' Suit']) if (gn.endsWith(suf)) return bm + suf
  return bm
}

async function buildNoteData(): Promise<NoteData> {
  const [monsters, monsterOrder, weapons, armorSets, questCats] = await Promise.all([
    loadMonsters(), loadMonsterOrder(), loadWeapons(), loadArmorSets(), loadQuests(),
  ])

  // Monster: flatten monster_order.json's curated per-type id arrays, in file order
  // (mirrors MonstersPage.tsx). Leftovers not in that file are appended alphabetically.
  const monster = new Map<string, number>()
  const monsterEntities = new Map<string, Monster>()
  const monsterNames = new Map<string, ImportTarget>()
  for (const m of monsters) {
    monsterEntities.set(m.id, m)
    monsterNames.set(m.name, { type: 'monster', id: m.id, path: `/monsters/${m.id}` })
  }
  {
    let i = 0
    for (const [, ids] of Object.entries(monsterOrder)) {
      for (const mid of ids) monster.set(mid, i++)
    }
    const leftovers = monsters.filter(m => !monster.has(m.id)).sort((a, b) => a.name.localeCompare(b.name))
    for (const m of leftovers) monster.set(m.id, i++)
  }

  // Weapon: (type order, sort_order) packed into one number — exact type grouping,
  // sort_order as a close stand-in for the tree-walk position within a type.
  const weapon = new Map<string, number>()
  const weaponEntities = new Map<string, Weapon>()
  const weaponNames = new Map<string, ImportTarget>()
  for (const w of weapons) {
    weaponEntities.set(w.id, w)
    weaponNames.set(`${w.type}::${w.name}`, { type: 'weapon', id: w.id, path: `/weapons/${w.id}` })
    const t = WEAPON_TYPE_ORDER.indexOf(w.type)
    const typeIdx = t === -1 ? WEAPON_TYPE_ORDER.length : t
    weapon.set(w.id, typeIdx * 1_000_000 + w.sort_order)
  }

  // Armor set: armor_sets.json is already exported in final display order
  // (rarity, sort_order, name), so the array's own index is the display order.
  const armorset = new Map<string, number>()
  const armorsetEntities = new Map<string, ArmorSet>()
  const armorsetNames = new Map<string, ImportTarget>()
  armorSets.forEach((a, i) => {
    armorset.set(a.id, i)
    armorsetEntities.set(a.id, a)
    const target: ImportTarget = { type: 'armorset', id: a.id, path: `/armorsets/${a.id}` }
    for (const female of [false, true]) {
      for (const gunner of [false, true]) {
        const resolved = resolveSetName(a.name, female, gunner)
        if (!armorsetNames.has(resolved)) armorsetNames.set(resolved, target)
      }
    }
  })

  // Quest: flattened index across combined category order, then each category's
  // ranks/quests in quests.json file order. Keyed as `${slug}::${questName}` to
  // match a quest note's own `id` field directly (see QuestBrowser.tsx's questId).
  const quest = new Map<string, number>()
  const questEntities = new Map<string, Quest>()
  const questNames = new Map<string, ImportTarget>()
  {
    let i = 0
    const bySlug = new Map(questCats.map(c => [c.slug, c]))
    for (const slug of QUEST_CATEGORY_ORDER) {
      const cat = bySlug.get(slug)
      if (!cat) continue
      const routeBase = slug.startsWith('training_') ? '/training' : '/quests'
      for (const rank of cat.ranks) {
        for (const q of rank.quests) {
          const id = `${slug}::${q.name}`
          quest.set(id, i++)
          questEntities.set(id, q)
          if (!questNames.has(q.name)) {
            questNames.set(q.name, { type: 'quest', id, path: `${routeBase}/${encodeURIComponent(id)}` })
          }
        }
      }
    }
  }

  return {
    order: { monster, weapon, armorset, quest },
    entities: { monster: monsterEntities, weapon: weaponEntities, armorset: armorsetEntities, quest: questEntities },
    names: { monster: monsterNames, weapon: weaponNames, armorset: armorsetNames, quest: questNames },
  }
}

// Internal shared hook — both public hooks below call this, so buildNoteData() only ever runs once.
function useNoteData(): NoteData {
  const [data, setData] = useState<NoteData>(cached ?? EMPTY_DATA)

  useEffect(() => {
    if (cached) { setData(cached); return }
    if (!inFlight) inFlight = buildNoteData().then(d => { cached = d; return d })
    let cancelled = false
    inFlight.then(d => { if (!cancelled) setData(d) })
    return () => { cancelled = true }
  }, [])

  return data
}

/**
 * Returns a function mapping a NoteRecord to a sortable numeric key reflecting that
 * entity's position on its own in-app listing page. Notes for entities not found in
 * the current data (deleted/renamed, or not yet loaded) map to Infinity, so a stable
 * sort pushes them to the end without reordering them relative to each other.
 */
export function useNoteOrderIndex(): (note: NoteRecord) => number {
  const data = useNoteData()
  return (note: NoteRecord): number => {
    const map = data.order[note.type as keyof OrderMaps]
    if (!map) return Number.POSITIVE_INFINITY
    const idx = map.get(note.id)
    return idx === undefined ? Number.POSITIVE_INFINITY : idx
  }
}

/**
 * Returns a function mapping a NoteRecord to its full underlying entity (or undefined if the
 * entity was deleted/renamed since the note was made, the type is unrecognized, or data is
 * still loading). Shares the same cached fetch as useNoteOrderIndex — no duplicate network calls.
 */
export function useNoteEntity(): (note: NoteRecord) => Monster | Weapon | ArmorSet | Quest | undefined {
  const data = useNoteData()
  return (note: NoteRecord) => {
    const map = data.entities[note.type as keyof EntityMaps]
    return map?.get(note.id)
  }
}

/**
 * Returns a function that looks up an entity by (type, name, category) — used to reconstruct
 * a NoteTarget (id/path) from an imported export file, which only records the human-readable
 * name/category, not the id. `category` disambiguates weapon type; ignored for the other types
 * (monster/quest names are unique in practice, armor set names are matched against every
 * gender/class-resolved variant regardless of category).
 */
export function useNoteImportLookup(): (type: string, name: string, category: string) => ImportTarget | undefined {
  const data = useNoteData()
  return (type: string, name: string, category: string) => {
    if (type === 'weapon') return data.names.weapon.get(`${category}::${name}`)
    const map = data.names[type as keyof NameMaps]
    return map?.get(name)
  }
}
