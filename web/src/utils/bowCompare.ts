import type { WeaponDoc } from '../types'

// Port of the desktop app's BowDamage.cs / BowSimulator.cs — the "Compare Bows" Easter egg's
// damage-index math. Not a real per-monster damage prediction: hitzone, monster defense, rage,
// and range are all held at 1.0. It's a neutral index for comparing bows/loadouts directly.

export type BowShotType = 'Rapid' | 'Scatter' | 'Pierce'
export interface BowChargeShot { chargeLevel: number; shotType: BowShotType; shotLevel: number }

const BOW_CLASS_DIVISOR = 1.2
const ELEMENT_DIVISOR = 10.0
const POWER_COATING_MULT = 1.5

// index = charge level (1-4); index 0 unused.
const RAW_CHARGE_MOD = [0, 0.4, 1.0, 1.5, 1.7]
const ELEMENT_CHARGE_MOD = [0, 0.5, 0.75, 1.0, 1.125]

// index = shot level - 1 (levels are 1-5).
const RAPID_POWERS: number[][] = [[12], [12, 4], [12, 4, 3], [12, 4, 3, 2], [12, 4, 3, 3]]
const SCATTER_POWERS: number[][] = [[4, 5, 4], [5, 6, 5], [4, 5, 5, 5, 4], [4, 5, 6, 5, 4], [5, 5, 6, 5, 5]]
const PIERCE_HITS = [3, 4, 5, 5, 5]
const PIERCE_POWERS: number[][] = PIERCE_HITS.map(hits => Array(hits).fill(6))

export function arrowPowers(shotType: BowShotType, shotLevel: number): number[] {
  const idx = Math.min(Math.max(shotLevel, 1), 5) - 1
  if (shotType === 'Rapid') return RAPID_POWERS[idx]
  if (shotType === 'Scatter') return SCATTER_POWERS[idx]
  return PIERCE_POWERS[idx]
}

const rawChargeMod = (level: number) => RAW_CHARGE_MOD[Math.min(Math.max(level, 1), 4)]
const elementChargeMod = (level: number) => ELEMENT_CHARGE_MOD[Math.min(Math.max(level, 1), 4)]

// "Rapid 3" → { chargeLevel: <array position>, shotType: 'Rapid', shotLevel: 3 }. Array position
// (1-indexed) is the charge level; the string's own trailing number is the shot level — two
// different numbers indexing two different tables.
export function parseCharges(doc: WeaponDoc): BowChargeShot[] {
  const out: BowChargeShot[] = []
  const charges = doc.charges ?? []
  charges.forEach((raw, i) => {
    const parts = raw.trim().split(/\s+/)
    if (parts.length < 2) return
    const shotType = parts[0] as BowShotType
    if (shotType !== 'Rapid' && shotType !== 'Scatter' && shotType !== 'Pierce') return
    const shotLevel = parseInt(parts[1], 10)
    if (isNaN(shotLevel)) return
    out.push({ chargeLevel: i + 1, shotType, shotLevel })
  })
  return out
}

const ELEMENT_TOKENS = new Set(['Fir', 'Wtr', 'Thn', 'Ice', 'Drg'])

// Bows carry their element in `special` ("Fir 200", "Thn 180 / ParaC") rather than
// element_type/element_value — mirrors desktop's ParseElement.
export function parseBowElement(doc: WeaponDoc): { type: string | null; value: number } {
  const special = doc.special ?? ''
  for (const seg of special.split('/')) {
    const t = seg.trim().split(/\s+/).filter(Boolean)
    if (t.length >= 2 && ELEMENT_TOKENS.has(t[0])) {
      const v = parseInt(t[1], 10)
      if (!isNaN(v)) return { type: t[0], value: v }
    }
  }
  return { type: null, value: 0 }
}

export const hasPowerCoating = (doc: WeaponDoc): boolean =>
  (doc.coatings ?? []).some(c => c.toLowerCase() === 'pwr')

export interface SideEffects {
  powerCoating: boolean
  rapidUp: boolean
  pierceUp: boolean
  scatterUp: boolean
}

// The per-arrow-base multiplier from this side's toggled skill-up, if it matches the shot type.
// Rapid Up / Pierce Up = +10% (NormS Up / PierceS Up); Scatter Up = +30% (PelletS Up). Raw only —
// does not affect Element (an assumption, not ROM-verified — flagged to the user).
function skillUpMult(shotType: BowShotType, effects: SideEffects): number {
  if (shotType === 'Rapid' && effects.rapidUp) return 1.10
  if (shotType === 'Pierce' && effects.pierceUp) return 1.10
  if (shotType === 'Scatter' && effects.scatterUp) return 1.30
  return 1.0
}

export interface ChargeRow {
  chargeLevel: number; shotType: BowShotType; shotLevel: number; arrowCount: number
  rawMin: number; rawAvg: number; rawMax: number; element: number
}

export function computeChargeRow(doc: WeaponDoc, shot: BowChargeShot, effects: SideEffects): ChargeRow {
  const arrows = arrowPowers(shot.shotType, shot.shotLevel)
  const arrowSum = arrows.reduce((a, b) => a + b, 0) * 0.01
  const attack = doc.atk
  const affinity = doc.affinity ?? 0

  let rawBase = attack * rawChargeMod(shot.chargeLevel) * arrowSum / BOW_CLASS_DIVISOR
  if (effects.powerCoating && hasPowerCoating(doc)) rawBase *= POWER_COATING_MULT
  rawBase *= skillUpMult(shot.shotType, effects)

  const { type: elType, value: elValue } = parseBowElement(doc)
  const element = elType
    ? elValue * elementChargeMod(shot.chargeLevel) * arrows.length / ELEMENT_DIVISOR
    : 0

  return {
    chargeLevel: shot.chargeLevel, shotType: shot.shotType, shotLevel: shot.shotLevel,
    arrowCount: arrows.length,
    rawMin: rawBase * (affinity < 0 ? 0.75 : 1.0),
    rawAvg: rawBase * (1.0 + affinity / 100 * 0.25),
    rawMax: rawBase * (affinity > 0 ? 1.25 : 1.0),
    element,
  }
}

export const computeBowTable = (doc: WeaponDoc, effects: SideEffects): ChargeRow[] =>
  parseCharges(doc).map(shot => computeChargeRow(doc, shot, effects))

export interface SimShot { raw: number; crits: number; feebles: number }
export interface SimResult {
  shot: BowChargeShot
  shots: SimShot[]
  normalRaw: number
  avgRaw: number
  minRaw: number
  maxRaw: number
  arrows: number
  totalHits: number
  totalCrits: number
  totalFeebles: number
  element: number
}

function rollCrit(affinity: number, rng: () => number): number {
  if (affinity === 0) return 1.0
  const chance = Math.min(1.0, Math.abs(affinity) / 100)
  if (rng() < chance) return affinity > 0 ? 1.25 : 0.75
  return 1.0
}

// Rolls `shots` independent bursts; each burst rolls every arrow in the shot's power array
// independently for crit/feeble. `rng` is injected (pass Math.random at the call site) so this
// stays pure. Mirrors BowSimulator.Simulate.
export function simulateBurst(doc: WeaponDoc, shot: BowChargeShot, effects: SideEffects, shots: number, rng: () => number): SimResult {
  const arrows = arrowPowers(shot.shotType, shot.shotLevel)
  const attack = doc.atk
  const affinity = doc.affinity ?? 0
  const chargeMod = rawChargeMod(shot.chargeLevel)
  const coat = effects.powerCoating && hasPowerCoating(doc) ? POWER_COATING_MULT : 1.0
  const skillMult = skillUpMult(shot.shotType, effects)
  const arrowBase = (power: number) => attack * chargeMod * (power * 0.01) / BOW_CLASS_DIVISOR * coat * skillMult

  const normalRaw = arrows.reduce((sum, p) => sum + arrowBase(p), 0)
  const { type: elType, value: elValue } = parseBowElement(doc)
  const element = elType ? elValue * elementChargeMod(shot.chargeLevel) * arrows.length / ELEMENT_DIVISOR : 0

  const rolled: SimShot[] = []
  let totalCrits = 0, totalFeebles = 0, sum = 0
  let min = Infinity, max = -Infinity

  for (let s = 0; s < shots; s++) {
    let raw = 0, crits = 0, feebles = 0
    for (const power of arrows) {
      const m = rollCrit(affinity, rng)
      if (m > 1.0) crits++
      else if (m < 1.0) feebles++
      raw += arrowBase(power) * m
    }
    rolled.push({ raw, crits, feebles })
    totalCrits += crits; totalFeebles += feebles; sum += raw
    if (raw < min) min = raw
    if (raw > max) max = raw
  }
  if (shots === 0) { min = 0; max = 0 }

  return {
    shot, shots: rolled, normalRaw,
    avgRaw: shots === 0 ? 0 : sum / shots, minRaw: min, maxRaw: max,
    arrows: arrows.length, totalHits: arrows.length * shots, totalCrits, totalFeebles, element,
  }
}
