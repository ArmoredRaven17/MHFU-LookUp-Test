import type {
  Monster, Item, Weapon, ArmorSet, Skill,
  Decoration, QuestCategory, GatheringArea, Combo,
  KitchenData, TrenyaItem, PokkeItem, GrannyItem, VeggieItem,
  ComradeSection, ComradeWeapon, ComradeSkill, ComradeTemperament,
  Award, Treasure,
} from '../types'

const cache = new Map<string, unknown>()

async function load<T>(file: string): Promise<T> {
  if (cache.has(file)) return cache.get(file) as T
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const res = await fetch(`${base}/data/${file}`)
  if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`)
  const data: T = await res.json()
  cache.set(file, data)
  return data
}

export const loadMonsters    = () => load<Monster[]>('monsters.json')
export const loadItems       = () => load<Item[]>('items.json')
export const loadWeapons     = () => load<Weapon[]>('weapons.json')
export const loadArmorSets   = () => load<ArmorSet[]>('armor_sets.json')
export const loadSkills      = () => load<Skill[]>('armor_skills.json')
export const loadDecorations = () => load<Decoration[]>('decorations.json')
export const loadQuests      = () => load<QuestCategory[]>('quests.json')
export const loadGathering   = () => load<GatheringArea[]>('gathering.json')
export const loadCombos      = () => load<Combo[]>('combos.json')
export const loadTreasures   = () => load<Treasure[]>('treasures.json')
export const loadKitchen     = () => load<KitchenData>('kitchen.json')
export const loadTrenya      = () => load<TrenyaItem[]>('trenya.json')
export const loadPokke       = () => load<PokkeItem[]>('pokke.json')
export const loadGranny      = () => load<GrannyItem[]>('granny.json')
export const loadVeggie      = () => load<VeggieItem[]>('veggie.json')
export const loadComrades    = () => load<{
  sections: ComradeSection[]
  weapons: ComradeWeapon[]
  skills: ComradeSkill[]
  temperaments: ComradeTemperament[]
}>('comrades.json')
export const loadAwards      = () => load<Award[]>('awards.json')
