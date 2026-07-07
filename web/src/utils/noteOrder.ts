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

interface NoteData { order: OrderMaps; entities: EntityMaps }

const EMPTY_MAPS: OrderMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}
const EMPTY_ENTITIES: EntityMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}
const EMPTY_DATA: NoteData = { order: EMPTY_MAPS, entities: EMPTY_ENTITIES }

let cached: NoteData | null = null
let inFlight: Promise<NoteData> | null = null

async function buildNoteData(): Promise<NoteData> {
  const [monsters, monsterOrder, weapons, armorSets, questCats] = await Promise.all([
    loadMonsters(), loadMonsterOrder(), loadWeapons(), loadArmorSets(), loadQuests(),
  ])

  // Monster: flatten monster_order.json's curated per-type id arrays, in file order
  // (mirrors MonstersPage.tsx). Leftovers not in that file are appended alphabetically.
  const monster = new Map<string, number>()
  const monsterEntities = new Map<string, Monster>()
  for (const m of monsters) monsterEntities.set(m.id, m)
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
  for (const w of weapons) {
    weaponEntities.set(w.id, w)
    const t = WEAPON_TYPE_ORDER.indexOf(w.type)
    const typeIdx = t === -1 ? WEAPON_TYPE_ORDER.length : t
    weapon.set(w.id, typeIdx * 1_000_000 + w.sort_order)
  }

  // Armor set: armor_sets.json is already exported in final display order
  // (rarity, sort_order, name), so the array's own index is the display order.
  const armorset = new Map<string, number>()
  const armorsetEntities = new Map<string, ArmorSet>()
  armorSets.forEach((a, i) => { armorset.set(a.id, i); armorsetEntities.set(a.id, a) })

  // Quest: flattened index across combined category order, then each category's
  // ranks/quests in quests.json file order. Keyed as `${slug}::${questName}` to
  // match a quest note's own `id` field directly (see QuestBrowser.tsx's questId).
  const quest = new Map<string, number>()
  const questEntities = new Map<string, Quest>()
  {
    let i = 0
    const bySlug = new Map(questCats.map(c => [c.slug, c]))
    for (const slug of QUEST_CATEGORY_ORDER) {
      const cat = bySlug.get(slug)
      if (!cat) continue
      for (const rank of cat.ranks) {
        for (const q of rank.quests) {
          const id = `${slug}::${q.name}`
          quest.set(id, i++)
          questEntities.set(id, q)
        }
      }
    }
  }

  return {
    order: { monster, weapon, armorset, quest },
    entities: { monster: monsterEntities, weapon: weaponEntities, armorset: armorsetEntities, quest: questEntities },
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
