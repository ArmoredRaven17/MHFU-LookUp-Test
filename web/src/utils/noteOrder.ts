import { useEffect, useState } from 'react'
import {
  loadMonsters, loadMonsterOrder, loadWeapons, loadArmorSets, loadQuests,
} from '../data/loaders'
import type { NoteRecord } from '../hooks/useNotes'

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

const EMPTY_MAPS: OrderMaps = {
  monster: new Map(), weapon: new Map(), armorset: new Map(), quest: new Map(),
}

let cachedMaps: OrderMaps | null = null
let inFlight: Promise<OrderMaps> | null = null

async function buildOrderMaps(): Promise<OrderMaps> {
  const [monsters, monsterOrder, weapons, armorSets, questCats] = await Promise.all([
    loadMonsters(), loadMonsterOrder(), loadWeapons(), loadArmorSets(), loadQuests(),
  ])

  // Monster: flatten monster_order.json's curated per-type id arrays, in file order
  // (mirrors MonstersPage.tsx). Leftovers not in that file are appended alphabetically.
  const monster = new Map<string, number>()
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
  for (const w of weapons) {
    const t = WEAPON_TYPE_ORDER.indexOf(w.type)
    const typeIdx = t === -1 ? WEAPON_TYPE_ORDER.length : t
    weapon.set(w.id, typeIdx * 1_000_000 + w.sort_order)
  }

  // Armor set: armor_sets.json is already exported in final display order
  // (rarity, sort_order, name), so the array's own index is the display order.
  const armorset = new Map<string, number>()
  armorSets.forEach((a, i) => armorset.set(a.id, i))

  // Quest: flattened index across combined category order, then each category's
  // ranks/quests in quests.json file order. Keyed as `${slug}::${questName}` to
  // match a quest note's own `id` field directly (see QuestBrowser.tsx's questId).
  const quest = new Map<string, number>()
  {
    let i = 0
    const bySlug = new Map(questCats.map(c => [c.slug, c]))
    for (const slug of QUEST_CATEGORY_ORDER) {
      const cat = bySlug.get(slug)
      if (!cat) continue
      for (const rank of cat.ranks) {
        for (const q of rank.quests) quest.set(`${slug}::${q.name}`, i++)
      }
    }
  }

  return { monster, weapon, armorset, quest }
}

/**
 * Returns a function mapping a NoteRecord to a sortable numeric key reflecting that
 * entity's position on its own in-app listing page. Notes for entities not found in
 * the current data (deleted/renamed, or not yet loaded) map to Infinity, so a stable
 * sort pushes them to the end without reordering them relative to each other.
 */
export function useNoteOrderIndex(): (note: NoteRecord) => number {
  const [maps, setMaps] = useState<OrderMaps>(cachedMaps ?? EMPTY_MAPS)

  useEffect(() => {
    if (cachedMaps) { setMaps(cachedMaps); return }
    if (!inFlight) inFlight = buildOrderMaps().then(m => { cachedMaps = m; return m })
    let cancelled = false
    inFlight.then(m => { if (!cancelled) setMaps(m) })
    return () => { cancelled = true }
  }, [])

  return (note: NoteRecord): number => {
    const map = maps[note.type as keyof OrderMaps]
    if (!map) return Number.POSITIVE_INFINITY
    const idx = map.get(note.id)
    return idx === undefined ? Number.POSITIVE_INFINITY : idx
  }
}
