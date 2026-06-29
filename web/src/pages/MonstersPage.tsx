import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadMonsters } from '../data/loaders'
import type { Monster, Hitzone } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'

function pct(n: number) { return n > 0 ? `${n}%` : '—' }
function pctPos(n: number) {
  if (n === 0) return { text: '—', style: {} }
  return { text: `${n}%`, style: { color: n >= 45 ? 'var(--positive)' : n >= 25 ? 'var(--text)' : 'var(--negative)' } }
}

export default function MonstersPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All')

  useEffect(() => { loadMonsters().then(setMonsters) }, [])

  const types = useMemo(() => {
    const s = new Set(monsters.map(m => m.type))
    return ['All', ...Array.from(s).sort()]
  }, [monsters])

  const filtered = useMemo(() => monsters.filter(m => {
    if (typeFilter !== 'All' && m.type !== typeFilter) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [monsters, search, typeFilter])

  const selected = useMemo(() => monsters.find(m => m.id === id) ?? null, [monsters, id])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 220, minWidth: 220,
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search monsters…" />
        <div style={{ padding: '4px 8px 4px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '3px 6px', fontSize: 12,
            }}
          >
            {types.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(m => (
            <button
              key={m.id}
              onClick={() => navigate(`/monsters/${m.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '4px 10px',
                background: m.id === id ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: m.id === id ? '2px solid var(--accent)' : '2px solid transparent',
                color: m.id === id ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}
            >
              <img src={`/assets/Monsters/${m.id}.png`} alt="" width={24} height={24}
                   style={{ objectFit: 'contain', flexShrink: 0 }} />
              {m.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No monsters found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected ? (
          <p className="text-muted" style={{ marginTop: 16 }}>Select a monster from the list.</p>
        ) : (
          <MonsterDetail monster={selected} />
        )}
      </div>
    </div>
  )
}

function MonsterDetail({ monster: m }: { monster: Monster }) {
  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src={`/assets/Monsters/${m.id}.png`} alt={m.name} width={48} height={48}
             style={{ objectFit: 'contain' }} />
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 22, fontWeight: 600 }}>{m.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{m.type}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'monster', id: m.id, name: m.name, path: `/monsters/${m.id}` }} />
      </div>

      {/* Hitzones */}
      {m.hitzones && m.hitzones.length > 0 && (
        <Section title="Hitzones">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Part','Cut','Bash','Shot','Fire','Water','Thunder','Ice','Dragon','KO'].map(h => (
                  <th key={h} className="tbl-header" style={{ textAlign: h === 'Part' ? 'left' : 'center' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {m.hitzones.map((hz, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">{hz.part}</td>
                  {(['cut','bash','shot','fire','water','thunder','ice','dragon','ko'] as (keyof Hitzone)[]).map(k => {
                    const v = hz[k] as number
                    const { text, style } = pctPos(v)
                    return <td key={k} className="tbl-cell" style={{ textAlign: 'center', ...style }}>{text}</td>
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Stagger limits */}
      {m.stagger_limits && m.stagger_limits.length > 0 && (
        <Section title="Stagger Limits">
          <table style={{ borderCollapse: 'collapse', minWidth: 240 }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Part</th>
                <th className="tbl-header" style={{ textAlign: 'right' }}>Limit</th>
              </tr>
            </thead>
            <tbody>
              {m.stagger_limits.map((sl, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">{sl.part}</td>
                  <td className="tbl-cell" style={{ textAlign: 'right' }}>{sl.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Ailment tolerances */}
      {m.ailment_tolerances && m.ailment_tolerances.length > 0 && (
        <Section title="Ailment Tolerances">
          <table style={{ borderCollapse: 'collapse', minWidth: 280 }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Ailment</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Tolerance</th>
              </tr>
            </thead>
            <tbody>
              {m.ailment_tolerances.map((a, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">{a.ailment}</td>
                  <td className="tbl-cell">{a.tolerance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Carve / Capture / Break rewards — rank-tiered */}
      <RankedRewards monster={m} />

      {/* Items (rare drops from the monster mid-fight) */}
      {m.items && m.items.length > 0 && (
        <Section title="Item Drops">
          <table style={{ borderCollapse: 'collapse', minWidth: 280 }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Item</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Condition</th>
              </tr>
            </thead>
            <tbody>
              {m.items.map((it, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">{it.name}</td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{it.condition ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--accent)', fontSize: 14,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Ranked reward display ────────────────────────────────────────────────────

const RANK_KEYS = ['guild_low_12', 'elder_guild_low', 'nekoht_guild_high', 'g_rank', 'treasure_hunt'] as const
const RANK_LABELS: Record<string, string> = {
  guild_low_12:      'Low Rank',
  elder_guild_low:   'High Rank (Low)',
  nekoht_guild_high: 'High Rank',
  g_rank:            'G Rank',
  treasure_hunt:     'Treasure Hunt',
}

interface RewardDrop { item: string; pct: number }

function DropTable({ drops }: { drops: RewardDrop[] }) {
  return (
    <table style={{ borderCollapse: 'collapse', minWidth: 280 }}>
      <thead>
        <tr>
          <th className="tbl-header" style={{ textAlign: 'left' }}>Item</th>
          <th className="tbl-header" style={{ textAlign: 'right' }}>%</th>
        </tr>
      </thead>
      <tbody>
        {drops.map((r, i) => (
          <tr key={i} className="tbl-row">
            <td className="tbl-cell">{r.item}</td>
            <td className="tbl-cell" style={{ textAlign: 'right' }}>{r.pct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RankedRewards({ monster: m }: { monster: Monster }) {
  const [rank, setRank] = useState('g_rank')

  // Collect which rank keys actually have data across all reward types
  const availableRanks = RANK_KEYS.filter(k => {
    const hasCarve  = m.carve?.some(g => Array.isArray((g as Record<string,unknown>)[k]))
    const hasCap    = m.capture && Array.isArray((m.capture as Record<string,unknown>)[k])
    const hasBreak  = m.break?.some(g => Array.isArray((g as Record<string,unknown>)[k]))
    return hasCarve || hasCap || hasBreak
  })

  if (availableRanks.length === 0) return null

  // Ensure selected rank is valid; fall back to first available
  const activeRank = availableRanks.includes(rank as typeof RANK_KEYS[number])
    ? rank : availableRanks[0]

  const carveGroups  = (m.carve ?? []).map(g => ({
    label: g.label,
    count: g.carve_count,
    drops: (g as Record<string,unknown>)[activeRank] as RewardDrop[] | undefined,
  })).filter(g => g.drops?.length)

  const capDrops = m.capture
    ? (m.capture as Record<string,unknown>)[activeRank] as RewardDrop[] | undefined
    : undefined

  const breakGroups = (m.break ?? []).map(g => ({
    label: g.label,
    condition: g.condition,
    drops: (g as Record<string,unknown>)[activeRank] as RewardDrop[] | undefined,
  })).filter(g => g.drops?.length)

  return (
    <Section title="Rewards">
      {/* Rank tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {availableRanks.map(k => (
          <button key={k} onClick={() => setRank(k)} style={{
            padding: '3px 10px', fontSize: 12, border: '1px solid var(--border)',
            borderRadius: 3, cursor: 'pointer',
            background: activeRank === k ? 'var(--accent)' : 'var(--surface)',
            color: activeRank === k ? '#111' : 'var(--muted)',
            fontWeight: activeRank === k ? 600 : 400,
          }}>
            {RANK_LABELS[k] ?? k}
          </button>
        ))}
      </div>

      {/* Carve */}
      {carveGroups.map((g, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Carve — {g.label}{g.count ? ` (×${g.count})` : ''}
          </p>
          <DropTable drops={g.drops!} />
        </div>
      ))}

      {/* Capture */}
      {capDrops && capDrops.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Capture
          </p>
          <DropTable drops={capDrops} />
        </div>
      )}

      {/* Break */}
      {breakGroups.map((g, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
            Break — {g.label}{g.condition ? ` (${g.condition})` : ''}
          </p>
          <DropTable drops={g.drops!} />
        </div>
      ))}
    </Section>
  )
}

