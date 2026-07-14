import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadMonsters, loadMonsterOrder, loadQuests } from '../data/loaders'
import type { Monster, Hitzone, RewardDrop, MonsterQuestEntry, QuestCategory } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import NotesBox from '../components/NotesBox'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'
import CollapsiblePanel from '../components/CollapsiblePanel'
import { useRankTermStyle, formatRankTerm } from '../theme/rankTerms'

// Hitzone heat map — cell background per value tier (matches desktop HitzoneBrush).
function hzBg(v: number) {
  if (v >= 66) return '#2e5e2e'   // dark green — very weak
  if (v >= 46) return '#6b3d00'   // dark orange
  if (v >= 21) return '#5a5200'   // dark yellow
  return '#383838'                // dark grey — resistant
}

// Quest categories that have a browsable detail page, mapped to their route base.
// Main quest lines → /quests, Training School → /training. Event/Challenge/Treasure
// quests aren't in the quest browser at all, so they stay plain text.
const QUEST_ROUTE_BY_SLUG: Record<string, string> = {
  village_low_rank_elder: '/quests', guild_low_rank: '/quests', village_high_rank_nekoht: '/quests',
  guild_high_rank: '/quests', guild_g_rank: '/quests',
  training_basic: '/training', training_weapon_mastery: '/training', training_battle: '/training',
  training_special: '/training', training_g_lv: '/training', training_group: '/training',
}
// Build a quest-name → deep-link path map from the loaded quest categories.
// Main categories iterate first (in quests.json), so they win over training on any name clash.
const TREASURE_QUEST_NAMES = [
  'Treasure in the Mountains!', 'Treasure in the Jungle!', 'Treasure in the Desert!', 'Treasure in the Swamp!',
  'Treasure in the Hills!', 'Treasure in the Lava!', 'Treasure in the Grt Forest!',
]
function buildQuestLinks(cats: QuestCategory[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const c of cats) {
    const base = QUEST_ROUTE_BY_SLUG[c.slug]
    if (!base) continue
    for (const rk of c.ranks) for (const q of rk.quests) {
      if (!m.has(q.name)) m.set(q.name, `${base}/${encodeURIComponent(`${c.slug}::${q.name}`)}`)
    }
  }
  // Treasure Hunt quests live on the Treasures tab (Quests mode), not the quest browser.
  for (const name of TREASURE_QUEST_NAMES) {
    if (!m.has(name)) m.set(name, `/treasures/${encodeURIComponent(`q:${name}`)}`)
  }
  return m
}

export default function MonstersPage() {
  const scale = useTextScale()
  const { id } = useParams()
  const navigate = useNavigate()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [order, setOrder] = useState<Record<string, string[]>>({})
  const [questLinks, setQuestLinks] = useState<Map<string, string>>(new Map())
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadMonsters().then(setMonsters)
    loadMonsterOrder().then(setOrder)
    loadQuests().then(cats => setQuestLinks(buildQuestLinks(cats)))
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
      <CollapsiblePanel width={220} style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search monsters…" />
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {groups.map(g => (
            <div key={g.type}>
              <div style={{
                fontWeight: 700, color: 'var(--accent)', fontSize: 12 * scale,
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
                    cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
                  }}
                >
                  <img src={`${BASE}/assets/Monsters/${m.id}.png`} alt="" width={24 * scale} height={24 * scale}
                       style={{ objectFit: 'contain', flexShrink: 0 }} />
                  {m.name}
                </button>
              ))}
            </div>
          ))}
          {groups.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 * scale }}>No monsters found.</p>
          )}
        </div>
      </CollapsiblePanel>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected ? (
          <p className="text-muted" style={{ marginTop: 16 }}>Select a monster from the list.</p>
        ) : (
          <MonsterDetail monster={selected} questLinks={questLinks} />
        )}
      </div>
    </div>
  )
}

function MonsterDetail({ monster: m, questLinks }: { monster: Monster; questLinks: Map<string, string> }) {
  const scale = useTextScale()
  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <img src={`${BASE}/assets/Monsters/${m.id}.png`} alt={m.name} width={48 * scale} height={48 * scale}
             style={{ objectFit: 'contain', flexShrink: 0 }} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 22 * scale, fontWeight: 600 }}>{m.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 * scale }}>{m.type}</p>
        </div>
        <BookmarkButton bookmark={{ type: 'monster', id: m.id, name: m.name, path: `/monsters/${m.id}`, icon: `${BASE}/assets/Monsters/${m.id}.png` }} />
      </div>

      {/* Quest Stats — ROM-verified per-quest HP/atk/def/size + enrage multipliers */}
      <QuestStats quests={m.quests} questLinks={questLinks} />

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
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 * scale, lineHeight: 1.6 }}>{m.quests.notes}</p>
        </Section>
      )}

      <Section title="Notes">
        <NotesBox target={{ type: 'monster', id: m.id, name: m.name, category: m.type, path: `/monsters/${m.id}`, icon: `${BASE}/assets/Monsters/${m.id}.png` }} />
      </Section>
    </div>
  )
}

// ── Quest Stats (ROM-verified per-quest HP/atk/def/size + enrage multipliers) ──

function sizeStr(e: MonsterQuestEntry): string {
  return e.size_min === e.size_max ? `${e.size_min}%` : `${e.size_min}–${e.size_max}%`
}

function QuestStats({ quests, questLinks }: { quests?: Monster['quests']; questLinks: Map<string, string> }) {
  const scale = useTextScale()
  const rankStyle = useRankTermStyle()
  const navigate = useNavigate()
  const entries = quests?.entries ?? []
  const rage = quests?.rage
  if (entries.length === 0 && !rage) return null

  return (
    <Section title="Quest Stats">
      {rage && (
        <p style={{ margin: '0 0 8px', fontSize: 12 * scale, color: 'var(--muted)' }}>
          <span style={{ color: 'var(--text)', fontWeight: 600 }}>Enraged:</span>{' '}
          Attack ×{rage.atk} · Defense ×{rage.def}
        </p>
      )}
      {entries.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', minWidth: 520 }}>
            <thead>
              <tr>
                {['Rank', 'Stars', 'Quest', 'HP', 'Atk', 'Def', 'Size'].map(h => (
                  <th key={h} className="tbl-header"
                      style={{ textAlign: h === 'HP' || h === 'Atk' || h === 'Def' ? 'right' : 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => {
                const link = questLinks.get(e.quest)
                return (
                  <tr key={i} className="tbl-row">
                    <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{formatRankTerm(e.rank, rankStyle)}</td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{e.level}</td>
                    <td className="tbl-cell">
                      {link
                        ? <button onClick={() => navigate(link)} style={{
                            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                            color: 'var(--accent)', textDecoration: 'underline', fontSize: 12 * scale, textAlign: 'left',
                          }}>{e.quest}</button>
                        : <span style={{ color: 'var(--text)' }}>{e.quest}</span>}
                    </td>
                    <td className="tbl-cell" style={{ textAlign: 'right' }}>{e.hp}</td>
                    <td className="tbl-cell" style={{ textAlign: 'right' }}>{e.atk}</td>
                    <td className="tbl-cell" style={{ textAlign: 'right' }}>{e.def}</td>
                    <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{sizeStr(e)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 14 * scale,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

// ── Reward loot (side-by-side tier columns) ──────────────────────────────────

// Tier keys and labels, in the order the desktop app shows them. Labels are short canonical rank
// terms — rendered through formatRankTerm() in LootSection so they follow the Settings > Rank
// Terminology choice.
const TIER_ORDER: [string, string][] = [
  ['guild_low_12',      'Guild 1★~2★'],
  ['elder_guild_low',   'Elder/Low'],
  ['nekoht_guild_high', 'Nekoht/High'],
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
  const scale = useTextScale()
  const rankStyle = useRankTermStyle()
  if (parts.length === 0) return null
  return (
    <Section title={header}>
      {parts.map((p, i) => (
        <div key={i} style={{ marginBottom: 12 }}>
          {p.label && (
            <p style={{ margin: '0 0 2px', fontWeight: 600, color: 'var(--text)', fontSize: 13 * scale }}>{p.label}</p>
          )}
          {p.condition && (
            <p style={{ margin: '0 0 4px', fontStyle: 'italic', fontSize: 11 * scale, color: 'var(--muted)' }}>
              Condition: {p.condition}
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
            {p.tiers.map((t, j) => (
              <div key={j} style={{ minWidth: 168 * scale }}>
                <p style={{ margin: '0 0 2px', fontSize: 11 * scale, color: 'var(--text)' }}>{formatRankTerm(t.label, rankStyle)}</p>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {t.rows.map((r, k) => (
                      <tr key={k}>
                        <td style={{ fontSize: 12 * scale, color: 'var(--text)', padding: '1px 8px 1px 0' }}>{r.item}</td>
                        <td style={{ fontSize: 12 * scale, color: 'var(--muted)', textAlign: 'right', padding: '1px 0' }}>{r.pct}%</td>
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
