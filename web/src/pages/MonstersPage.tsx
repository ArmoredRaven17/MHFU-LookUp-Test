import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadMonsters, loadMonsterOrder } from '../data/loaders'
import type { Monster, Hitzone, RewardDrop } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import { BASE } from '../utils/assets'

// Hitzone heat map — cell background per value tier (matches desktop HitzoneBrush).
function hzBg(v: number) {
  if (v >= 66) return '#2e5e2e'   // dark green — very weak
  if (v >= 46) return '#6b3d00'   // dark orange
  if (v >= 21) return '#5a5200'   // dark yellow
  return '#383838'                // dark grey — resistant
}

export default function MonstersPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [order, setOrder] = useState<Record<string, string[]>>({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMonsters().then(setMonsters)
    loadMonsterOrder().then(setOrder)
  }, [])

  const byId = useMemo(() => new Map(monsters.map(m => [m.id, m])), [monsters])

  // Grouped list in the curated desktop order, with leftovers grouped by type.
  const groups = useMemo(() => {
    const q = search.trim().toLowerCase()
    const match = (m: Monster) => !q || m.name.toLowerCase().includes(q)
    const placed = new Set<string>()
    const result: { type: string; members: Monster[] }[] = []

    for (const [type, ids] of Object.entries(order)) {
      const members: Monster[] = []
      for (const mid of ids) {
        const m = byId.get(mid)
        if (m) { placed.add(mid); if (match(m)) members.push(m) }
      }
      if (members.length) result.push({ type, members })
    }

    const byType = new Map<string, Monster[]>()
    for (const m of monsters) {
      if (placed.has(m.id) || !match(m)) continue
      const t = m.type || 'Other'
      ;(byType.get(t) ?? byType.set(t, []).get(t)!).push(m)
    }
    for (const t of [...byType.keys()].sort())
      result.push({ type: t, members: byType.get(t)!.sort((a, b) => a.name.localeCompare(b.name)) })

    return result
  }, [monsters, order, byId, search])

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
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{
                fontWeight: 700, color: 'var(--text)', fontSize: 12,
                padding: '6px 10px 2px',
              }}>
                {g.type}
              </div>
              {g.members.map(m => (
                <button
                  key={m.id}
                  onClick={() => navigate(`/monsters/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    width: '100%', padding: '4px 10px',
                    background: m.id === id ? 'var(--header-bg)' : 'transparent',
                    border: 'none', borderLeft: m.id === id ? '2px solid var(--accent)' : '2px solid transparent',
                    color: m.id === id ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  }}
                >
                  <img src={`${BASE}/assets/Monsters/${m.id}.png`} alt="" width={24} height={24}
                       style={{ objectFit: 'contain', flexShrink: 0 }} />
                  {m.name}
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No monsters found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
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
        <img src={`${BASE}/assets/Monsters/${m.id}.png`} alt={m.name} width={48} height={48}
             style={{ objectFit: 'contain' }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 22, fontWeight: 600 }}>{m.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{m.type}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'monster', id: m.id, name: m.name, path: `/monsters/${m.id}`, icon: `${BASE}/assets/Monsters/${m.id}.png` }} />
      </div>

      {/* Hitzones */}
      {m.hitzones && m.hitzones.length > 0 && (
        <Section title="Hitzones">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
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
                      return <td key={k} className="tbl-cell" style={{ textAlign: 'center', background: hzBg(v), color: 'var(--text)' }}>{v}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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

      {/* Ailment tolerances — full 7-column table */}
      {m.ailment_tolerances && m.ailment_tolerances.length > 0 && (
        <Section title="Ailment Tolerances">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 460 }}>
              <thead>
                <tr>
                  {['Ailment','Initial','Increase','Max','Duration','Damage','Recovery'].map(h => (
                    <th key={h} className="tbl-header" style={{ textAlign: h === 'Ailment' ? 'left' : 'right' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {m.ailment_tolerances.map((a, i) => (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell">{a.ailment}</td>
                    {(['initial','increase','max','duration','damage','recovery'] as const).map(k => (
                      <td key={k} className="tbl-cell" style={{ textAlign: 'right' }}>{a[k] ?? '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Items — tools/traps the monster reacts to (Item / Effect / Notes) */}
      {m.items && m.items.length > 0 && (
        <Section title="Items">
          <table style={{ borderCollapse: 'collapse', width: '100%' }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Item</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Effect</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {m.items.map((it, i) => (
                <tr key={i} className="tbl-row">
                  <td className="tbl-cell">{it.item}</td>
                  <td className="tbl-cell">{it.effect ?? '—'}</td>
                  <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{it.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Rewards — Carve / Capture / Break, all tiers side by side */}
      <LootSection header="Carve"   parts={buildParts(m.carve, 'list')} />
      <LootSection header="Capture" parts={buildParts(m.capture, 'object')} />
      <LootSection header="Break"   parts={buildParts(m.break, 'list')} />

      {/* Monster Facts (read-only lore) */}
      {m.quests?.notes && (
        <Section title="Monster Facts">
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13, lineHeight: 1.6 }}>{m.quests.notes}</p>
        </Section>
      )}

      <Section title="Notes">
        <NotesBox target={{ type: 'monster', id: m.id, name: m.name, category: m.type, path: `/monsters/${m.id}`, icon: `${BASE}/assets/Monsters/${m.id}.png` }} />
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 14,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Reward loot (side-by-side tier columns) ──────────────────────────────────

// Tier keys and labels, in the order the desktop app shows them.
const TIER_ORDER: [string, string][] = [
  ['guild_low_12',      'Guild 1★~2★'],
  ['elder_guild_low',   'Elder/Guild Low'],
  ['nekoht_guild_high', 'Nekoht/Guild High'],
  ['g_rank',            'G Rank'],
  ['special',           'Special'],
  ['treasure_hunt',     'Treasure Hunt'],
]

interface TierColumn { label: string; rows: RewardDrop[] }
interface LootPartData { label: string; condition?: string; tiers: TierColumn[] }

function tiersOf(part: Record<string, unknown>): TierColumn[] {
  return TIER_ORDER
    .map(([key, label]) => ({ label, rows: (part[key] as RewardDrop[] | undefined) ?? [] }))
    .filter(t => t.rows.length > 0)
}

// Normalise a carve/break array or a capture object into display parts.
function buildParts(section: unknown, kind: 'list' | 'object'): LootPartData[] {
  const raw: Record<string, unknown>[] =
    kind === 'object'
      ? (section ? [section as Record<string, unknown>] : [])
      : ((section as Record<string, unknown>[] | undefined) ?? [])

  return raw.map(part => {
    let label = (part.label as string) || ''
    const cc = part.carve_count as number | undefined
    if (cc && cc !== 0) label = label ? `${label} (${cc} carves)` : `(${cc} carves)`
    const condition = (part.condition as string) || undefined
    return { label, condition, tiers: tiersOf(part) }
  }).filter(p => p.tiers.length > 0)
}

function LootSection({ header, parts }: { header: string; parts: LootPartData[] }) {
  if (parts.length === 0) return null
  return (
    <Section title={header}>
      {parts.map((p, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {p.label && (
            <p style={{ margin: '0 0 2px', fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{p.label}</p>
          )}
          {p.condition && (
            <p style={{ margin: '0 0 4px', fontStyle: 'italic', fontSize: 11, color: 'var(--muted)' }}>
              Condition: {p.condition}
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {p.tiers.map((t, j) => (
              <div key={j} style={{ minWidth: 168 }}>
                <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--text)' }}>{t.label}</p>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {t.rows.map((r, k) => (
                      <tr key={k}>
                        <td style={{ fontSize: 12, color: 'var(--text)', padding: '1px 8px 1px 0' }}>{r.item}</td>
                        <td style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'right', padding: '1px 0' }}>{r.pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Section>
  )
}
