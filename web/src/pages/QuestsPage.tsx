import { useEffect, useMemo, useState } from 'react'
import { loadQuests } from '../data/loaders'
import type { Quest, QuestCategory } from '../types'
import SearchBox from '../components/SearchBox'

const MAIN_SLUGS = [
  'guild_g_rank',
  'guild_high_rank',
  'guild_low_rank',
  'village_high_rank_nekoht',
  'village_low_rank_elder',
]

export default function QuestsPage() {
  const [categories, setCategories] = useState<QuestCategory[]>([])
  const [catSlug, setCatSlug] = useState(MAIN_SLUGS[0])
  const [starIdx, setStarIdx] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Quest | null>(null)

  useEffect(() => {
    loadQuests().then(all => {
      const main = all.filter(c => MAIN_SLUGS.includes(c.slug))
        .sort((a, b) => MAIN_SLUGS.indexOf(a.slug) - MAIN_SLUGS.indexOf(b.slug))
      setCategories(main)
    })
  }, [])

  const cat = useMemo(() => categories.find(c => c.slug === catSlug), [categories, catSlug])

  function selectCat(slug: string) {
    setCatSlug(slug)
    setStarIdx(0)
    setSelected(null)
    setSearch('')
  }

  const rank = cat?.ranks[starIdx]

  const filtered = useMemo(() => {
    if (!rank) return []
    const q = search.toLowerCase()
    if (!q) return rank.quests
    return rank.quests.filter(q2 =>
      q2.name.toLowerCase().includes(q) ||
      q2.objective.toLowerCase().includes(q) ||
      q2.monsters.some(m => m.toLowerCase().includes(q))
    )
  }, [rank, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 260, minWidth: 260,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Category selector */}
        <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
          <select
            value={catSlug}
            onChange={e => selectCat(e.target.value)}
            style={{
              width: '100%', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 4, color: 'var(--text)', padding: '4px 6px', fontSize: 12,
            }}
          >
            {categories.map(c => <option key={c.slug} value={c.slug}>{c.category}</option>)}
          </select>
        </div>

        {/* Star tabs */}
        {cat && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
            {cat.ranks.map((r, i) => (
              <button key={i} onClick={() => { setStarIdx(i); setSelected(null); setSearch('') }} style={{
                flex: '0 0 auto', padding: '4px 10px', fontSize: 11, border: 'none', cursor: 'pointer',
                background: starIdx === i ? 'rgba(200,168,75,0.15)' : 'transparent',
                color: starIdx === i ? 'var(--accent)' : 'var(--muted)',
                borderBottom: starIdx === i ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: starIdx === i ? 600 : 400,
                whiteSpace: 'nowrap',
              }}>
                {'★'.repeat(r.stars)}
              </button>
            ))}
          </div>
        )}

        <SearchBox value={search} onChange={setSearch} placeholder="Search quests…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(q => {
            const active = q === selected
            return (
              <button key={q.name} onClick={() => setSelected(q)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 6,
                width: '100%', padding: '5px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <span style={{ flex: 1, lineHeight: 1.3 }}>{q.name}</span>
                <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                  {q.urgent && <Badge label="U" color="var(--negative)" />}
                  {q.key && !q.urgent && <Badge label="K" color="var(--accent)" />}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No quests found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a quest from the list.</p>
          : <QuestDetail quest={selected} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function QuestDetail({ quest: q }: { quest: Quest }) {
  const desc = q.description && q.description !== ':' ? q.description : null

  return (
    <div style={{ maxWidth: 700 }}>
      {/* Header */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{q.name}</h2>
          {q.urgent && <span style={{
            background: 'var(--negative)', color: '#fff', fontSize: 10, fontWeight: 700,
            padding: '2px 6px', borderRadius: 3, letterSpacing: '0.05em',
          }}>URGENT</span>}
          {q.key && !q.urgent && <span style={{
            border: '1px solid var(--accent)', color: 'var(--accent)', fontSize: 10, fontWeight: 700,
            padding: '2px 6px', borderRadius: 3, letterSpacing: '0.05em',
          }}>KEY</span>}
        </div>

        {/* Info strip */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}>
          <InfoPair label="Area" value={q.area} />
          <InfoPair label="Time" value={q.time} />
          <InfoPair label="Fee" value={q.fee} />
          <InfoPair label="Reward" value={q.reward} accent />
          {q.environment && <InfoPair label="Env" value={q.environment} />}
        </div>
      </div>

      {/* Objective */}
      <div style={{ marginBottom: 14, padding: '8px 10px',
                    background: 'var(--surface)', borderRadius: 4, borderLeft: '3px solid var(--accent)' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', fontStyle: 'italic' }}>{q.objective}</p>
      </div>

      {desc && (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>{desc}</p>
      )}

      {/* Monsters */}
      {q.monsters.length > 0 && (
        <Section title="Monsters">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {q.monsters.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'var(--surface)', borderRadius: 4, padding: '4px 8px' }}>
                <img src={`/assets/Monsters/${m.toLowerCase().replace(/ /g, '_')}.png`}
                     alt={m} width={22} height={22}
                     style={{ objectFit: 'contain' }}
                     onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontSize: 13 }}>{m}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Rewards */}
      {q.rewards.length > 0 && (
        <Section title={`Rewards (${q.rewards.length})`}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: '2px 8px',
          }}>
            {q.rewards.map((r, i) => (
              <span key={i} style={{ fontSize: 13, color: 'var(--text)', padding: '2px 0' }}>
                {r}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--accent)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '1px 4px', borderRadius: 2,
      background: color, color: color === 'var(--accent)' ? '#111' : '#fff',
      letterSpacing: '0.03em', lineHeight: 1.4,
    }}>
      {label}
    </span>
  )
}

function InfoPair({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span>
      <span style={{ color: 'var(--muted)' }}>{label}: </span>
      <span style={{ color: accent ? 'var(--positive)' : 'var(--text)', fontWeight: accent ? 600 : 400 }}>
        {value}
      </span>
    </span>
  )
}
