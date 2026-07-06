import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadGathering } from '../data/loaders'
import type { GatheringArea, GatherNode, GatherItem } from '../types'
import { locationIconUrl, locationColor } from '../utils/location'
import BookmarkButton from '../components/BookmarkButton'
import { BASE } from '../utils/assets'

const RANK_DEFS: [keyof GatherNode & string, string][] = [
  ['low', 'Low Rank'], ['high', 'High Rank'], ['g_rank', 'G Rank'],
  ['training', 'Training'], ['treasure', 'Treasure'],
]
const ALL_RANKS = 'All Ranks'
const ITEMS_RANK = 'Items'

type RankKey = 'low' | 'high' | 'g_rank' | 'training' | 'treasure'
interface Drop { name: string; rate: string }
interface Line { name: string; rate: string; isHeader: boolean }

function toDrops(raw: (GatherItem | string)[] | undefined): Drop[] {
  if (!raw) return []
  return raw.map(r => {
    if (typeof r === 'string') return { name: r, rate: '' }
    return { name: r.item, rate: r.rate !== undefined ? `${r.rate}%` : '' }
  }).filter(d => d.name.length > 0)
}

export default function GatheringPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [areas, setAreas] = useState<GatheringArea[]>([])

  useEffect(() => { loadGathering().then(a => setAreas([...a].sort((x, y) => x.area.localeCompare(y.area)))) }, [])

  const selected = useMemo(() => areas.find(a => a.slug === slug) ?? null, [areas, slug])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Area list ── */}
      <div style={{
        width: 220, minWidth: 220,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {areas.map(a => {
            const active = a.slug === slug
            return (
              <button key={a.slug} onClick={() => navigate(`/gathering/${a.slug}`)} style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '5px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <img src={locationIconUrl(a.area)} alt="" width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }}
                     onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                <span style={{ color: active ? 'var(--accent)' : locationColor(a.area) }}>{a.area}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'transparent' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', padding: 16, fontSize: 13 }}>Select an area from the list.</p>
          : <AreaDetail area={selected} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function AreaDetail({ area }: { area: GatheringArea }) {
  const [rank, setRank] = useState('')
  const [search, setSearch] = useState('')

  const nodes = useMemo(() => area.zones.flatMap(z => z.nodes.map(n => ({ zone: z.zone, n }))), [area])

  // Available ranks: rank-less areas (no Low/G data) → "Items"; else ranks with data (+ All Ranks).
  const ranks = useMemo(() => {
    const rankless = nodes.length > 0
      && nodes.every(({ n }) => toDrops(n.low).length === 0)
      && nodes.every(({ n }) => toDrops(n.g_rank).length === 0)
    if (rankless) return [ITEMS_RANK]
    const real = RANK_DEFS.filter(([k]) => nodes.some(({ n }) => toDrops(n[k as RankKey]).length > 0)).map(([, l]) => l)
    return real.length > 1 ? [ALL_RANKS, ...real] : real
  }, [nodes])

  const realRanks = ranks.filter(r => r !== ALL_RANKS)
  const effRank = ranks.includes(rank) ? rank : (realRanks[0] ?? '')

  const keyFor = (label: string) => RANK_DEFS.find(([, l]) => l === label)?.[0] as RankKey | undefined
  const mergedItems = (n: GatherNode) => RANK_DEFS.flatMap(([k]) => toDrops(n[k as RankKey]))

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (name: string) => !q || name.toLowerCase().includes(q)
    const out: { zone: string; node: string; type: string; lines: Line[] }[] = []

    for (const { zone, n } of nodes) {
      const base = { zone, node: String(n.node), type: n.type }
      if (effRank === ALL_RANKS) {
        const lines: Line[] = []
        for (const [k, label] of RANK_DEFS) {
          if (!ranks.includes(label)) continue
          const drops = toDrops(n[k as RankKey]).filter(d => match(d.name))
          if (drops.length === 0) continue
          lines.push({ name: label, rate: '', isHeader: true })
          for (const d of drops) lines.push({ name: d.name, rate: d.rate, isHeader: false })
        }
        if (lines.length) out.push({ ...base, lines })
      } else {
        const drops = effRank === ITEMS_RANK ? mergedItems(n) : toDrops(n[keyFor(effRank)!])
        if (drops.length === 0 || !drops.some(d => match(d.name))) continue
        out.push({ ...base, lines: drops.map(d => ({ name: d.name, rate: d.rate, isHeader: false })) })
      }
    }
    return out
  }, [nodes, ranks, effRank, search]) // eslint-disable-line react-hooks/exhaustive-deps

  const GRID = '110px 44px 72px 1fr'

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '10px 16px 6px' }}>
        <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 18, fontWeight: 600 }}>{area.area}</h2>
        <BookmarkButton bookmark={{ type: 'gathering', id: area.slug, name: area.area, path: `/gathering/${area.slug}`, icon: locationIconUrl(area.area) }} />
        {ranks.length > 1 && (
          <select value={effRank} onChange={e => setRank(e.target.value)} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '3px 6px', fontSize: 12,
          }}>
            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items in this area…"
          style={{
            flex: 1, maxWidth: 240, background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 4, color: 'var(--text)', padding: '3px 8px', fontSize: 12, outline: 'none',
          }} />
      </div>

      {/* Column header */}
      <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '0 16px 2px', fontSize: 11,
                    color: 'var(--accent)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        <span>Zone</span><span>Node</span><span>Type</span><span>{effRank}</span>
      </div>

      {/* Rows */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 16px' }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: GRID, borderBottom: '1px solid var(--border)', padding: '3px 0', fontSize: 12 }}>
            <span style={{ color: 'var(--muted)' }}>{r.zone}</span>
            <span style={{ color: 'var(--muted)' }}>{r.node}</span>
            <span style={{ color: 'var(--muted)' }}>{r.type}</span>
            <span>
              {r.lines.map((ln, j) => ln.isHeader ? (
                <span key={j} style={{ display: 'block', color: 'var(--accent)', fontSize: 11, fontWeight: 600, margin: '3px 0 1px' }}>{ln.name}</span>
              ) : (
                <span key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ color: 'var(--text)' }}>{ln.name}</span>
                  {ln.rate && <span style={{ color: 'var(--muted)', flexShrink: 0 }}>{ln.rate}</span>}
                </span>
              ))}
            </span>
          </div>
        ))}
        {rows.length === 0 && (
          <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No items found.</p>
        )}
      </div>
    </>
  )
}
