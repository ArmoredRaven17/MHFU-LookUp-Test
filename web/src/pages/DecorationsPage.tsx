import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadDecorations } from '../data/loaders'
import type { Decoration } from '../types'
import SearchBox from '../components/SearchBox'
import BookmarkButton from '../components/BookmarkButton'
import MaterialList from '../components/MaterialList'
import { BASE } from '../utils/assets'

const signStr = (n: number) => (n > 0 ? `+${n}` : `${n}`)
const signColor = (n: number) => (n > 0 ? 'var(--positive)' : n < 0 ? 'var(--negative)' : 'var(--muted)')
const decoIcon = (color: string) => `${BASE}/assets/Decorations/${color}.png`
const slotBar = (n: number) => {
  const k = Math.min(Math.max(n, 0), 3)
  return 'O'.repeat(k) + '-'.repeat(3 - k)
}

// Skill-name form for the "By skill" list: "<first positive skill> <slots> Jewel".
function skillName(d: Decoration) {
  const pos = d.skill_effects.find(s => s.points > 0)
  return pos ? `${pos.skill_name} ${d.slot_cost} Jewel` : d.name
}
const skillsText = (d: Decoration) => d.skill_effects.map(s => `${s.skill_name} ${signStr(s.points)}`).join(', ')

export default function DecorationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [decos, setDecos] = useState<Decoration[]>([])
  const [search, setSearch] = useState('')
  const [bySkill, setBySkill] = useState(false)

  useEffect(() => { loadDecorations().then(setDecos) }, [])

  const display = (d: Decoration) => (bySkill ? skillName(d) : d.name)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return decos
      .filter(d => !q
        || d.name.toLowerCase().includes(q)
        || skillName(d).toLowerCase().includes(q)
        || skillsText(d).toLowerCase().includes(q))
      .sort((a, b) => display(a).localeCompare(display(b)))
  }, [decos, search, bySkill]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => decos.find(d => d.id === id) ?? null, [decos, id])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={setSearch} placeholder="Search decorations…" />
        <div style={{ padding: '0 8px 6px' }}>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 4, overflow: 'hidden' }}>
            {['By name', 'By skill'].map((o, i) => (
              <button key={o} onClick={() => setBySkill(i === 1)} style={{
                flex: 1, padding: '3px 0', fontSize: 11, border: 'none', cursor: 'pointer',
                background: (bySkill ? 1 : 0) === i ? 'var(--accent)' : 'transparent',
                color: (bySkill ? 1 : 0) === i ? '#111' : 'var(--muted)', fontWeight: (bySkill ? 1 : 0) === i ? 600 : 400,
              }}>{o}</button>
            ))}
          </div>
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(d => {
            const active = d.id === id
            return (
              <button key={d.id} onClick={() => navigate(`/decorations/${d.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '4px 10px',
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <img src={decoIcon(d.color)} alt="" width={20} height={20}
                     style={{ objectFit: 'contain', flexShrink: 0 }}
                     onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {display(d)}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No decorations found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a decoration.</p>
          : <DecoDetail deco={selected} />
        }
      </div>
    </div>
  )
}

// ── Detail ────────────────────────────────────────────────────────────────────

function DecoDetail({ deco: d }: { deco: Decoration }) {
  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <img src={decoIcon(d.color)} alt="" width={32} height={32} style={{ objectFit: 'contain' }}
             onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 20, fontWeight: 600 }}>{d.name}</h2>
        <BookmarkButton bookmark={{ type: 'decoration', id: d.id, name: d.name, path: `/decorations/${d.id}`, icon: decoIcon(d.color) }} />
      </div>

      {/* Skill effects (signed, coloured) */}
      {d.skill_effects.length > 0 && (
        <p style={{ margin: '0 0 6px' }}>
          {d.skill_effects.map((s, i) => (
            <span key={i} style={{ color: signColor(s.points) }}>
              {i > 0 && <span style={{ color: 'var(--muted)' }}>, </span>}
              {s.skill_name} {signStr(s.points)}
            </span>
          ))}
        </p>
      )}

      {/* Slot badge */}
      <span style={{
        display: 'inline-block', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 3,
        padding: '2px 8px', fontSize: 12, marginBottom: 12,
      }}>
        <span style={{ fontFamily: 'ui-monospace, monospace' }}>{slotBar(d.slot_cost)}</span>
        {'  '}{d.slot_cost}-Slot Decoration
      </span>

      {/* Recipes */}
      {d.recipes.length > 0 && (
        <Section title="Recipes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.recipes.map((recipe, ri) => (
              <div key={ri}>
                {d.recipes.length > 1 && (
                  <p style={{ margin: '0 0 2px', color: 'var(--muted)', fontSize: 11 }}>Recipe {ri + 1}</p>
                )}
                <MaterialList csv={recipe.join(', ')} vertical />
              </div>
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
      <h3 style={{ margin: '0 0 6px', color: 'var(--text)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
