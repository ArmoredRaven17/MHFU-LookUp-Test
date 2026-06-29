import { useEffect, useMemo, useState } from 'react'
import { loadQuests } from '../data/loaders'
import type { Quest, QuestCategory } from '../types'
import SearchBox from '../components/SearchBox'

const TRAINING_SLUGS = [
  'training_basic',
  'training_weapon_mastery',
  'training_battle',
  'training_special',
  'training_g_lv',
  'training_group',
]

export default function TrainingSchoolPage() {
  const [categories, setCategories] = useState<QuestCategory[]>([])
  const [catSlug, setCatSlug] = useState(TRAINING_SLUGS[0])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Quest | null>(null)

  useEffect(() => {
    loadQuests().then(all => {
      const training = all.filter(c => TRAINING_SLUGS.includes(c.slug))
        .sort((a, b) => TRAINING_SLUGS.indexOf(a.slug) - TRAINING_SLUGS.indexOf(b.slug))
      setCategories(training)
    })
  }, [])

  const cat = useMemo(() => categories.find(c => c.slug === catSlug), [categories, catSlug])
  const quests = cat?.ranks[0]?.quests ?? []

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    if (!q) return quests
    return quests.filter(q2 =>
      q2.name.toLowerCase().includes(q) ||
      q2.objective.toLowerCase().includes(q)
    )
  }, [quests, search])

  function selectCat(slug: string) {
    setCatSlug(slug)
    setSelected(null)
    setSearch('')
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 260, minWidth: 260,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
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

        <SearchBox value={search} onChange={setSearch} placeholder="Search quests…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map((q, i) => {
            const active = q === selected
            return (
              <button key={i} onClick={() => setSelected(q)} style={{
                display: 'block', width: '100%', padding: '5px 12px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13, lineHeight: 1.3,
              }}>
                {q.name}
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
          : <TrainingDetail quest={selected} />
        }
      </div>
    </div>
  )
}

function TrainingDetail({ quest: q }: { quest: Quest }) {
  const desc = q.description && q.description !== ':' ? q.description : null
  return (
    <div style={{ maxWidth: 680 }}>
      <h2 style={{ margin: '0 0 4px', color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{q.name}</h2>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
        <InfoPair label="Area" value={q.area} />
        <InfoPair label="Time" value={q.time} />
        <InfoPair label="Fee" value={q.fee} />
        <InfoPair label="Reward" value={q.reward} accent />
      </div>

      <div style={{ marginBottom: 14, padding: '8px 10px',
                    background: 'var(--surface)', borderRadius: 4, borderLeft: '3px solid var(--accent)' }}>
        <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic' }}>{q.objective}</p>
      </div>

      {desc && <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--muted)' }}>{desc}</p>}

      {q.monsters.length > 0 && (
        <Section title="Monsters">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {q.monsters.map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6,
                                    background: 'var(--surface)', borderRadius: 4, padding: '4px 8px' }}>
                <img src={`/assets/Monsters/${m.toLowerCase().replace(/ /g, '_')}.png`}
                     alt={m} width={22} height={22} style={{ objectFit: 'contain' }}
                     onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                <span style={{ fontSize: 13 }}>{m}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {q.rewards.length > 0 && (
        <Section title={`Rewards (${q.rewards.length})`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px,1fr))', gap: '2px 8px' }}>
            {q.rewards.map((r, i) => (
              <span key={i} style={{ fontSize: 13, padding: '2px 0' }}>{r}</span>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

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
