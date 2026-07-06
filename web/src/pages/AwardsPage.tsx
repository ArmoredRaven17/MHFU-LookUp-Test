import { useEffect, useMemo, useState } from 'react'
import { loadAwards } from '../data/loaders'
import type { Award } from '../types'
import SearchBox from '../components/SearchBox'

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

export default function AwardsPage() {
  const [awards, setAwards] = useState<Award[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Award | null>(null)

  useEffect(() => { loadAwards().then(setAwards) }, [])

  const filtered = useMemo(() => {
    if (!search) return awards
    const s = search.toLowerCase()
    return awards.filter(a =>
      a.name.toLowerCase().includes(s) ||
      a.description.toLowerCase().includes(s) ||
      a.condition.toLowerCase().includes(s)
    )
  }, [awards, search])

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 240, minWidth: 240,
        backgroundColor: 'var(--surface)', backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.96), rgba(var(--surface-rgb), 0.96)), url(${BASE}/assets/Textures/surface_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <SearchBox value={search} onChange={v => { setSearch(v); setSelected(null) }} placeholder="Search awards…" />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.map(a => {
            const active = a === selected
            return (
              <button key={a.id} onClick={() => setSelected(a)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '5px 10px',
                background: active ? 'var(--header-bg)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                <img
                  src={`${BASE}/assets/Awards/${a.icon}.png`}
                  alt=""
                  width={20} height={20}
                  style={{ flexShrink: 0, objectFit: 'contain' }}
                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.name}
                </span>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <p style={{ color: 'var(--muted)', padding: 12, fontSize: 13 }}>No awards found.</p>
          )}
        </div>
      </div>

      {/* ── Detail panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'transparent' }}>
        {!selected
          ? <p style={{ color: 'var(--muted)', marginTop: 16, fontSize: 13 }}>Select an award from the list.</p>
          : <AwardDetail award={selected} />
        }
      </div>
    </div>
  )
}

function AwardDetail({ award: a }: { award: Award }) {
  return (
    <div style={{ maxWidth: 480 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12 }}>
        <img
          src={`${BASE}/assets/Awards/${a.icon}.png`}
          alt={a.name}
          width={48} height={48}
          style={{ objectFit: 'contain', flexShrink: 0 }}
          onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        />
        <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 18, fontWeight: 600 }}>
          {a.name}
        </h2>
      </div>

      {a.description && (
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text)', fontStyle: 'italic', lineHeight: 1.6 }}>
          {a.description}
        </p>
      )}

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '10px 12px' }}>
        <p style={{ margin: '0 0 4px', color: 'var(--muted)', fontSize: 10,
                    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          How to Obtain
        </p>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
          {a.condition}
        </p>
      </div>
    </div>
  )
}
