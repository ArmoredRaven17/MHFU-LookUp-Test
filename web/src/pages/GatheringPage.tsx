import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadGathering } from '../data/loaders'
import type { GatheringArea, GatherNode, GatherItem } from '../types'
import SearchBox from '../components/SearchBox'

const RANK_KEYS = ['low', 'high', 'g_rank', 'training', 'treasure'] as const
const RANK_LABELS: Record<string, string> = {
  low: 'Low Rank', high: 'High Rank', g_rank: 'G Rank',
  training: 'Training', treasure: 'Treasure Hunt',
}

type RankKey = typeof RANK_KEYS[number]

function toItems(raw: (GatherItem | string)[]): { item: string; rate?: number; points?: string }[] {
  return raw.map(r => typeof r === 'string' ? { item: r } : r)
}

export default function GatheringPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [areas, setAreas] = useState<GatheringArea[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { loadGathering().then(setAreas) }, [])

  const filtered = useMemo(() => {
    if (!search) return areas
    const q = search.toLowerCase()
    return areas.filter(a => a.area.toLowerCase().includes(q))
  }, [areas, search])

  const selected = useMemo(() => areas.find(a => a.slug === slug) ?? null, [areas, slug])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 200, minWidth: 200,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search areas…" />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(a => {
            const active = a.slug === slug
            return (
              <button key={a.slug} onClick={() => navigate(`/gathering/${a.slug}`)} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                {a.area}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select an area from the list.</p>
          : <AreaDetail area={selected} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function AreaDetail({ area }: { area: GatheringArea }) {
  // Determine which rank keys actually have data across all nodes
  const availableRanks = useMemo(() => {
    const present = new Set<RankKey>()
    for (const zone of area.zones) {
      for (const node of zone.nodes) {
        for (const key of RANK_KEYS) {
          if ((node[key] as unknown[]).length > 0) present.add(key)
        }
      }
    }
    return RANK_KEYS.filter(k => present.has(k))
  }, [area])

  const [rank, setRank] = useState<RankKey>('high')
  const activeRank = availableRanks.includes(rank) ? rank : (availableRanks[0] ?? 'high')

  return (
    <div style={{ maxWidth: 820 }}>
      <h2 style={{ margin: '0 0 10px', color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>
        {area.area}
      </h2>

      {/* Rank tabs */}
      {availableRanks.length > 1 && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 14, flexWrap: 'wrap' }}>
          {availableRanks.map(k => (
            <button key={k} onClick={() => setRank(k)} style={{
              padding: '3px 10px', fontSize: 12, border: '1px solid var(--border)',
              borderRadius: 3, cursor: 'pointer',
              background: activeRank === k ? 'var(--accent)' : 'var(--surface)',
              color: activeRank === k ? '#111' : 'var(--muted)',
              fontWeight: activeRank === k ? 600 : 400,
            }}>
              {RANK_LABELS[k]}
            </button>
          ))}
        </div>
      )}

      {area.zones.map((zone, zi) => {
        const nodesWithData = zone.nodes.filter(n => (n[activeRank] as unknown[]).length > 0)
        if (nodesWithData.length === 0) return null
        return (
          <div key={zi} style={{ marginBottom: 20 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--accent)', fontSize: 13,
                         fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {zone.zone}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px,1fr))', gap: 10 }}>
              {nodesWithData.map((node, ni) => (
                <NodeCard key={ni} node={node} rank={activeRank} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function NodeCard({ node, rank }: { node: GatherNode; rank: RankKey }) {
  const items = toItems(node[rank] as (GatherItem | string)[])
  const hasRates = items.some(i => i.rate !== undefined)

  return (
    <div style={{
      background: 'var(--surface)', borderRadius: 4, border: '1px solid var(--border)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '4px 8px', background: 'var(--header-bg)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em' }}>
          NODE {node.node}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase' }}>
          {node.type}
        </span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="tbl-row">
              <td className="tbl-cell" style={{ fontSize: 12 }}>{item.item}</td>
              {hasRates && (
                <td className="tbl-cell" style={{ textAlign: 'right', fontSize: 12,
                                                  color: 'var(--muted)', width: 36 }}>
                  {item.rate !== undefined ? `${item.rate}%` : '—'}
                </td>
              )}
              {item.points !== undefined && (
                <td className="tbl-cell" style={{ textAlign: 'right', fontSize: 12,
                                                  color: 'var(--muted)', width: 50 }}>
                  {item.points}pt
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
