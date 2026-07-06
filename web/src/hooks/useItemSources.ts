import { useEffect, useState } from 'react'
import { loadGathering, loadMonsters } from '../data/loaders'
import type { GatheringArea, GatherItem, Monster, RewardDrop } from '../types'

export interface GatherSource { location: string; area: string; rank: string; rate: string }
export interface MonsterSource { monster: string; monsterId: string; source: string; rank: string; rate: string }

export const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const ratePct = (rate: string) => { const n = parseInt(rate, 10); return isNaN(n) ? -1 : n }

// ── Gathered-from index (from the Gathering data; incl. the Treasure-Hunt rank) ─
const GATHER_RANKS = [['low', 'Low'], ['high', 'High'], ['g_rank', 'G'], ['treasure', 'Treasure']] as const

function buildGathered(areas: GatheringArea[]): { index: Map<string, GatherSource[]>; gatherable: Set<string> } {
  interface Row { locOrder: number; location: string; zoneSeq: number; area: string; rankOrder: number; rank: string; rate: string }
  const tmp = new Map<string, Row[]>()
  let zoneSeq = 0
  areas.forEach((loc, locOrder) => {
    for (const zone of loc.zones) {
      const zs = zoneSeq++
      for (const node of zone.nodes) {
        GATHER_RANKS.forEach(([key, rank], rankOrder) => {
          const raw = node[key] as (GatherItem | string)[] | undefined
          if (!raw) return
          for (const e of raw) {
            const item = typeof e === 'string' ? e : e.item
            if (!item) continue
            const rate = typeof e === 'string' ? '' : (e.rate !== undefined ? `${e.rate}%` : '')
            const k = normName(item)
            ;(tmp.get(k) ?? tmp.set(k, []).get(k)!).push({ locOrder, location: loc.area, zoneSeq: zs, area: zone.zone, rankOrder, rank, rate })
          }
        })
      }
    }
  })

  const out = new Map<string, GatherSource[]>()
  const gatherable = new Set<string>()   // green marker = normal gathering only (not Treasure-only)
  for (const [k, rows] of tmp) {
    if (rows.some(r => r.rank !== 'Treasure')) gatherable.add(k)
    const seen = new Set<string>()
    const uniq = rows.filter(r => { const key = `${r.location}|${r.area}|${r.rank}|${r.rate}`; if (seen.has(key)) return false; seen.add(key); return true })
    uniq.sort((a, b) => a.locOrder - b.locOrder || a.zoneSeq - b.zoneSeq || a.rankOrder - b.rankOrder || ratePct(b.rate) - ratePct(a.rate))
    let prevLoc: string | null = null
    out.set(k, uniq.map(r => { const location = r.location === prevLoc ? '' : r.location; prevLoc = r.location; return { location, area: r.area, rank: r.rank, rate: r.rate } }))
  }
  return { index: out, gatherable }
}

// ── Monster-source index (reverse of the monster loot tables) ────────────────
const TIERS: [string, string][] = [
  ['guild_low_12', 'Guild 1★~2★'], ['elder_guild_low', 'Elder/Guild Low'],
  ['nekoht_guild_high', 'Nekoht/Guild High'], ['g_rank', 'G Rank'],
  ['special', 'Special'], ['treasure_hunt', 'Treasure Hunt'],
]
const methodOrder = (m: string) => (m === 'Carve' ? 0 : m === 'Shiny' ? 1 : m === 'Capture' ? 2 : m === 'Break' ? 3 : 4)
function splitQty(s: string): [string, number] { const m = s.match(/^(.*?)\s*\((\d+)\)\s*$/); return m ? [m[1], parseInt(m[2], 10)] : [s, 1] }
function sourceLabel(method: string, part: string, qty: number) {
  const s = method === 'Shiny' ? (part || 'Shiny') : method === 'Capture' ? 'Capture' : (part ? `${method} · ${part}` : method)
  return qty > 1 ? `${s}  ×${qty}` : s
}

function buildMonsterSources(monsters: Monster[]): Map<string, MonsterSource[]> {
  interface Row { monster: string; monsterId: string; methodOrd: number; source: string; rankOrd: number; rank: string; pct: number }
  const tmp = new Map<string, Row[]>()
  const add = (item: string, monster: string, monsterId: string, method: string, part: string, qty: number, rankOrd: number, rank: string, pct: number) => {
    const k = normName(item)
    ;(tmp.get(k) ?? tmp.set(k, []).get(k)!).push({ monster, monsterId, methodOrd: methodOrder(method), source: sourceLabel(method, part, qty), rankOrd, rank, pct })
  }
  const scan = (part: Record<string, unknown>, monster: string, monsterId: string, method: string, partLabel: string) => {
    TIERS.forEach(([key, label], rankOrd) => {
      const arr = part[key] as RewardDrop[] | undefined
      if (!Array.isArray(arr)) return
      for (const e of arr) {
        if (!e.item) continue
        const [name, qty] = splitQty(e.item)
        add(name, monster, monsterId, method, partLabel, qty, rankOrd, label, e.pct ?? 0)
      }
    })
  }
  for (const m of monsters) {
    for (const part of m.carve ?? []) {
      const label = (part.label as string) ?? ''
      scan(part as Record<string, unknown>, m.name, m.id, label.startsWith('Shiny') ? 'Shiny' : 'Carve', label)
    }
    if (m.capture) scan(m.capture as Record<string, unknown>, m.name, m.id, 'Capture', '')
    for (const part of m.break ?? []) scan(part as Record<string, unknown>, m.name, m.id, 'Break', (part.label as string) ?? '')
  }

  const out = new Map<string, MonsterSource[]>()
  for (const [k, rows] of tmp) {
    const seen = new Set<string>()
    const uniq = rows.filter(r => { const key = `${r.monster}|${r.source}|${r.rank}`; if (seen.has(key)) return false; seen.add(key); return true })
    uniq.sort((a, b) => a.monster.localeCompare(b.monster) || a.methodOrd - b.methodOrd || a.source.localeCompare(b.source) || a.rankOrd - b.rankOrd)
    let prevMon: string | null = null
    out.set(k, uniq.map(r => { const monster = r.monster === prevMon ? '' : r.monster; prevMon = r.monster; return { monster, monsterId: r.monsterId, source: r.source, rank: r.rank, rate: `${r.pct}%` } }))
  }
  return out
}

// Items obtainable in Treasure Hunts: the gathering "treasure" rank + the monster treasure_hunt tier.
function buildTreasureHunt(areas: GatheringArea[], monsters: Monster[]): Set<string> {
  const set = new Set<string>()
  for (const area of areas) for (const zone of area.zones) for (const node of zone.nodes) {
    for (const e of (node.treasure as (GatherItem | string)[] | undefined) ?? []) {
      const it = typeof e === 'string' ? e : e.item
      if (it) set.add(normName(it))
    }
  }
  for (const m of monsters) {
    const groups = [...(m.carve ?? []), ...(m.break ?? []), ...(m.capture ? [m.capture] : [])] as Record<string, unknown>[]
    for (const grp of groups)
      for (const e of (grp.treasure_hunt as RewardDrop[] | undefined) ?? [])
        if (e.item) set.add(normName(splitQty(e.item)[0]))
  }
  return set
}

/** Reverse-lookup indices for where an item/treasure comes from (gathering + monster loot). */
export function useItemSources() {
  const [gathered, setGathered] = useState<Map<string, GatherSource[]>>(new Map())
  const [gatherable, setGatherable] = useState<Set<string>>(new Set())
  const [monsterSrc, setMonsterSrc] = useState<Map<string, MonsterSource[]>>(new Map())
  const [treasureHunt, setTreasureHunt] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([loadGathering(), loadMonsters()]).then(([areas, monsters]) => {
      const g = buildGathered(areas)
      setGathered(g.index)
      setGatherable(g.gatherable)
      setMonsterSrc(buildMonsterSources(monsters))
      setTreasureHunt(buildTreasureHunt(areas, monsters))
    })
  }, [])

  return { gathered, monsterSrc, gatherable, treasureHunt }
}
