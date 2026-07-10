// ── Monsters ──────────────────────────────────────────────────────────
export interface Hitzone {
  part: string; cut: number; bash: number; shot: number;
  fire: number; water: number; thunder: number; ice: number; dragon: number; ko: number;
}
export interface StaggerLimit { part: string; limit: number; }
export interface AilmentTolerance {
  ailment: string
  initial?: string | number
  increase?: string | number
  max?: string | number
  duration?: string | number
  damage?: string | number
  recovery?: string | number
}
// A tool/trap the monster reacts to mid-fight (item + effect + notes).
export interface MonsterItem { item: string; effect?: string; duration?: number; notes?: string }
// The monster's quest metadata; `notes` holds the read-only "Monster Facts" lore.
export interface MonsterQuests { notes?: string; [key: string]: unknown }

// Reward drop: item name + percentage (from the ROM loot tables)
export interface RewardDrop { item: string; pct: number; }
// Each rank tier's drops, keyed by rank slug
export type RankedDrops = Record<string, RewardDrop[]>

// Carve group (e.g. Body, Tail): label + per-rank drops
export interface CarveGroup { label: string; carve_count?: number; [rank: string]: unknown; }
// Break reward group: label + condition + per-rank drops
export interface BreakGroup { label: string; condition?: string; [rank: string]: unknown; }

export interface Monster {
  id: string; name: string; type: string;
  hitzones?: Hitzone[];
  stagger_limits?: StaggerLimit[];
  ailment_tolerances?: AilmentTolerance[];
  items?: MonsterItem[];
  carve?: CarveGroup[];
  capture?: Record<string, unknown>;   // same shape as CarveGroup, but a single object
  break?: BreakGroup[];
  quests?: MonsterQuests;
}

// ── Items ──────────────────────────────────────────────────────────────
export interface Item {
  id: number; category: string; name: string; icon: string;
  rarity: string; capacity: string; value: string;
  pokke_value: string; description: string; point_exchange: string;
}

// ── Weapons ────────────────────────────────────────────────────────────
export interface ExternalUpgrade { name: string; type: string; }
export interface WeaponDoc {
  id: string; name: string; type: string;
  atk: number; affinity: number; slots: number; price: number;
  upgrades_from: string | null;
  sharpness?: number[]; sharpness_plus1?: number[]; sharpness_capacity?: number;
  materials?: string; materials_alt?: string; rarity?: number;
  def_bonus?: number;
  external_upgrades?: ExternalUpgrade[];
  element?: string; element_value?: number; element_type?: string;
  element2?: string; element2_value?: number; element2_type?: string;
  special?: string; special_value?: number;
  coating?: string; arc_shot?: string; rapid_fire?: string;
  capacity?: string; reload?: string; recoil?: string; deviation?: string;
  // Weapon-type-specific fields
  shelling?: string;
  notes?: string[];
  charges?: string[];
  coatings?: string[];
  rapid?: string;
  ammo_raw?: Record<string, number | number[]>;
  ammo_support?: Record<string, number | number[]>;
  ammo_element?: Record<string, number | number[]>;
  ammo_other?: Record<string, number | number[]>;
}
export interface Weapon {
  weapon_pk: number; id: string; type: string; name: string;
  sort_order: number; doc: WeaponDoc;
}

// Hunting Horn song catalogue (app_meta hh_songs/hh_songmap).
export interface HhSong {
  id: string; name: string; effect: string; duration: string
  encore_effect?: string | null; encore_duration?: string | null
  note_sequences: string[][]
}
export interface HhSongData { songs: HhSong[]; note_map: Record<string, string[]> }

// ── Armor ──────────────────────────────────────────────────────────────
export interface ArmorSkillPoint { skill_id: string; skill_name: string; points: number; }
export interface ArmorPiece {
  slot: string; name_male: string; name_female: string;
  defense: number; max_defense: number;
  fire_res: number; water_res: number;
  thunder_res: number; ice_res: number; dragon_res: number;
  slots: number; cost: number;
  skills: ArmorSkillPoint[];
  materials: { name: string; qty: number }[];
}
export interface ArmorVariant {
  class_type: 'Both' | 'Blademaster' | 'Gunner';
  activated_skills: string[];
  pieces: ArmorPiece[];
}
export interface ArmorSet {
  id: string; name: string; rank: string; rarity: number;
  class_split: number; gender_exclusive: string | null; has_paired_names: number;
  variants: ArmorVariant[];
}

// ── Armor Skills ───────────────────────────────────────────────────────
export interface SkillLevel { points: number; name: string; description: string; }
export interface Skill {
  id: string; name: string; description: string;
  categories: string[]; levels: SkillLevel[];
}

// ── Decorations ────────────────────────────────────────────────────────
export interface DecoSkillEffect { skill_id: string; skill_name: string; points: number; }
export interface Decoration {
  id: string; name: string; slot_cost: number; cost: number; color: string;
  skill_effects: DecoSkillEffect[];
  recipes: string[][];
}

// ── Quests ─────────────────────────────────────────────────────────────
export interface QuestLoadoutArmor { name: string; skills: string; decoration: string; }
export interface QuestLoadout {
  weapon_type: string; weapon: string; description: string;
  armor: QuestLoadoutArmor[];
  items: string[];
  active_skills: (string | { name: string; negative?: boolean })[];
}
export interface Quest {
  name: string; objective: string; area: string;
  time: string; fee: string; reward: string;
  monsters: string[]; rewards: string[];
  key: boolean; urgent: boolean;
  description?: string; environment?: string;
  // Training School quests
  danger?: string; notes?: string; unlock?: string;
  loadouts?: QuestLoadout[];
}
export interface QuestRank { stars: number; label: string; quests: Quest[]; }
export interface QuestCategory { slug: string; category: string; ranks: QuestRank[]; }

// ── Gathering ──────────────────────────────────────────────────────────
export interface GatherItem { item: string; rate?: number; points?: string; }
export interface GatherNode {
  node: number; type: string;
  low: (GatherItem | string)[]; high: (GatherItem | string)[];
  g_rank: (GatherItem | string)[];
  training: (GatherItem | string)[]; treasure: (GatherItem | string)[];
}
export interface GatherZone { zone: string; nodes: GatherNode[]; }
export interface GatheringArea { slug: string; area: string; zones: GatherZone[]; }

// ── Combos ─────────────────────────────────────────────────────────────
export interface Combo {
  section: string; result: string; mat1: string; mat2: string; pct: string; qty: string;
}

// ── Kitchen ────────────────────────────────────────────────────────────
export interface FoodRecipe {
  chefs: number; ingredient1: string; ingredient2: string; effect: string;
}
export interface WhimSkill { name: string; description: string; }
export interface FoodIngredient { chefs: number; category: string; items: string; }
export interface KitchenData { recipes: FoodRecipe[]; ingredients: FoodIngredient[]; whim_skills: WhimSkill[]; }

// ── Trenya ─────────────────────────────────────────────────────────────
export interface TrenyaItem { location: string; category: string; item: string; points: number; }

// ── Pokke Farm ─────────────────────────────────────────────────────────
export interface PokkeItem { area: string; group_label: string; group_note: string; item: string; item_note: string; }

// ── Peddling Granny ────────────────────────────────────────────────────
export interface GrannyItem { section: string; item: string; price: string; }

// ── Veggie Elder ───────────────────────────────────────────────────────
export interface VeggieItem { zone: string; item: string; common_trade: string; rare_trade: string; }

// ── Felyne Comrades ────────────────────────────────────────────────────
export interface ComradeSection { id: number; title: string; body: string; table_kind: string; sort_order: number; }
export interface ComradeWeapon { id: number; attack_power: string; slash: string; impact: string; divider: string; }
export interface ComradeSkill { id: number; skill: string; cost: string; description: string; unlock: string; }
export interface ComradeTemperament { id: number; character: string; attack_pref: string; healing: string; target: string; }
export interface ComradesData { sections: ComradeSection[]; weapons: ComradeWeapon[]; skills: ComradeSkill[]; temperaments: ComradeTemperament[]; }

// ── Awards ─────────────────────────────────────────────────────────────
export interface Award { id: number; name: string; description: string; condition: string; icon: string; }

// ── Treasures ─────────────────────────────────────────────────────────
export interface Treasure {
  id: number; name: string; area: string; description: string;
  where_to_find: string; points: string; rarity: string; icon: string; is_award: number;
}
