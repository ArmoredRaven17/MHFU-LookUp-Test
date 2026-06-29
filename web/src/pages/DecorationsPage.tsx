import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { loadDecorations } from '../data/loaders'
import type { Decoration } from '../types'
import SearchBox from '../components/SearchBox'

function signColor(n: number) {
  return n > 0 ? 'var(--positive)' : n < 0 ? 'var(--negative)' : 'var(--muted)'
}
function signStr(n: number) { return n > 0 ? `+${n}` : `${n}` }

const SLOT_COLORS: Record<number, string> = { 1: '#6a8fbf', 2: '#9b6abf', 3: '#bf6a6a' }

export default function DecorationsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [decos, setDecos] = useState<Decoration[]>([])
  const [search, setSearch] = useState('')
  const [slotFilter, setSlotFilter] = useState(0)

  useEffect(() => { loadDecorations().then(setDecos) }, [])

  const filtered = useMemo(() => {
    let q = [...decos].sort((a, b) => a.name.localeCompare(b.name))
    if (slotFilter > 0) q = q.filter(d => d.slot_cost === slotFilter)
    if (search) q = q.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.skill_effects.some(s => s.skill_name.toLowerCase().includes(search.toLowerCase()))
    )
    return q
  }, [decos, search, slotFilter])

  const selected = useMemo(() => decos.find(d => d.id === id) ?? null, [decos, id])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Slot filter tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
          {[0, 1, 2, 3].map(s => (
            <button key={s} onClick={() => setSlotFilter(s)} style={{
              flex: 1, padding: '4px 0', fontSize: 11, border: 'none', cursor: 'pointer',
              background: slotFilter === s ? 'rgba(200,168,75,0.15)' : 'transparent',
              color: slotFilter === s ? 'var(--accent)' : 'var(--muted)',
              borderBottom: slotFilter === s ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: slotFilter === s ? 600 : 400,
            }}>
              {s === 0 ? 'All' : `${s}◇`}
            </button>
          ))}
        </div>

        <SearchBox value={search} onChange={setSearch} placeholder="Search decorations…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(d => {
            const active = d.id === id
            return (
              <button key={d.id} onClick={() => navigate(`/decorations/${d.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '4px 10px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <SlotDot slots={d.slot_cost} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.name}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select a decoration from the list.</p>
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <SlotDot slots={d.slot_cost} size={18} />
        <div>
          <h2 style={{ margin: 0, color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>{d.name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', fontSize: 12 }}>
            {d.slot_cost}◇ slot · {d.color} · {d.cost}z
          </p>
        </div>
      </div>

      {/* Skill effects */}
      <Section title="Skill Effects">
        <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 400 }}>
          <thead>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Skill</th>
              <th className="tbl-header" style={{ textAlign: 'right', width: 60 }}>Points</th>
            </tr>
          </thead>
          <tbody>
            {d.skill_effects.map((sk, i) => (
              <tr key={i} className="tbl-row">
                <td className="tbl-cell">{sk.skill_name}</td>
                <td className="tbl-cell" style={{
                  textAlign: 'right', color: signColor(sk.points), fontWeight: 600,
                }}>
                  {signStr(sk.points)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      {/* Recipes */}
      {d.recipes.length > 0 && (
        <Section title={d.recipes.length > 1 ? `Recipes (${d.recipes.length})` : 'Recipe'}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {d.recipes.map((recipe, ri) => (
              <div key={ri} style={{
                background: 'var(--surface)', borderRadius: 4, padding: '8px 10px',
                border: '1px solid var(--border)',
              }}>
                {ri > 0 && <p style={{ margin: '0 0 4px', color: 'var(--muted)', fontSize: 10,
                                       fontWeight: 600, textTransform: 'uppercase' }}>
                  Alt Recipe {ri + 1}
                </p>}
                {recipe.map((mat, mi) => (
                  <p key={mi} style={{ margin: 0, fontSize: 13 }}>{mat}</p>
                ))}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function SlotDot({ slots, size = 12 }: { slots: number; size?: number }) {
  const color = SLOT_COLORS[slots] ?? 'var(--muted)'
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%',
      background: color, flexShrink: 0,
    }} />
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
