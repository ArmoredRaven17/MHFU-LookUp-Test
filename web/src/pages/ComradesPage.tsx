import { useEffect, useMemo, useState } from 'react'
import { loadComrades } from '../data/loaders'
import type { ComradeWeapon, ComradeSkill, ComradeTemperament, ComradesData } from '../types'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'

// ── Temperament cell colours (mirrors the desktop viewmodel) ─────────────────
const prefColor = (s: string) =>
  s.includes('Bomb') ? '#E0A040'
  : s.includes('Melee') || s.includes('Weapon') ? '#D87070'
  : s.includes('No Attack') ? 'var(--muted)'
  : 'var(--text)'
const healColor = (s: string) =>
  s.includes('VryFast') ? '#4CD964'
  : s.includes('Fast') ? '#7FC97F'
  : s.includes('VrySlow') ? 'var(--negative)'
  : s.includes('Slow') ? '#E0A040'
  : 'var(--text)'
const targetColor = (s: string) =>
  s.includes('Lg') ? '#D87070'
  : s.includes('Sm') ? '#4A9EFF'
  : s.includes('No Attack') ? 'var(--muted)'
  : 'var(--text)'

// ── Prose parsing: paragraphs, UPPERCASE sub-headers, and "• " bullet runs → tables ──
type Block =
  | { kind: 'p'; text: string }
  | { kind: 'h'; text: string }
  | { kind: 'table'; twoCol: boolean; rows: { label: string; value: string }[] }

function parseBody(body: string): Block[] {
  const blocks: Block[] = []
  let bullets: string[] = []
  const flush = () => {
    if (bullets.length === 0) return
    const twoCol = bullets.every(b => b.includes(': '))
    const rows = bullets.map(b => {
      if (!twoCol) return { label: b, value: '' }
      const idx = b.indexOf(': ')
      return { label: b.slice(0, idx), value: b.slice(idx + 2) }
    })
    blocks.push({ kind: 'table', twoCol, rows })
    bullets = []
  }
  for (const raw of (body ?? '').split('\n')) {
    const line = raw.trim()
    if (line.length === 0) continue
    if (line.startsWith('• ')) { bullets.push(line.slice(2).trim()); continue }
    flush()
    if (line === line.toUpperCase() && /[A-Za-z]/.test(line)) blocks.push({ kind: 'h', text: line })
    else blocks.push({ kind: 'p', text: line })
  }
  flush()
  return blocks
}

export default function ComradesPage() {
  const scale = useTextScale()
  const [data, setData] = useState<ComradesData | null>(null)
  const [sectionId, setSectionId] = useState<number | null>(null)

  useEffect(() => { loadComrades().then(setData) }, [])

  const section = useMemo(
    () => data ? (data.sections.find(s => s.id === sectionId) ?? data.sections[0]) : null,
    [data, sectionId])
  const blocks = useMemo(() => parseBody(section?.body ?? ''), [section])

  if (!data || !section) return <p style={{ padding: 16, color: 'var(--muted)', fontSize: 13 * scale }}>Loading…</p>

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Section selector ── */}
      <div style={{
        width: 240 * scale + (scale > 1 ? 12 : 0), minWidth: 240 * scale + (scale > 1 ? 12 : 0),
        backgroundColor: 'var(--bg)', backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`, backgroundRepeat: 'no-repeat, repeat', borderRight: '1px solid var(--border)', overflowY: 'auto',
      }}>
        {data.sections.map(s => {
          const active = s.id === section.id
          return (
            <button key={s.id} onClick={() => setSectionId(s.id)} style={{
              display: 'block', width: '100%', padding: '7px 12px',
              background: active ? 'var(--header-bg)' : 'transparent',
              border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
              color: active ? 'var(--accent)' : 'var(--text)',
              cursor: 'pointer', textAlign: 'left', fontSize: 13 * scale,
            }}>{s.title}</button>
          )
        })}
      </div>

      {/* ── Section content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'transparent' }}>
        <h2 style={{ margin: 0, padding: '12px 16px 6px', fontSize: 18 * scale, fontWeight: 700, color: 'var(--text)' }}>{section.title}</h2>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {/* Prose body */}
          {blocks.map((b, i) => {
            if (b.kind === 'h') return <p key={i} style={{ margin: '8px 0 4px', fontWeight: 600, color: 'var(--text)', fontSize: 13 * scale }}>{b.text}</p>
            if (b.kind === 'p') return <p key={i} style={{ margin: '0 0 8px', color: 'var(--text)', fontSize: 13 * scale, lineHeight: 1.5 }}>{b.text}</p>
            return (
              <div key={i} style={{ marginBottom: 10, maxWidth: 640 }}>
                {b.rows.map((r, j) => (
                  <div key={j} className="tbl-row" style={{ display: b.twoCol ? 'grid' : 'block', gridTemplateColumns: b.twoCol ? '200px 1fr' : undefined, padding: '4px 0', fontSize: 13 * scale }}>
                    <span style={{ fontWeight: b.twoCol ? 600 : 400, color: 'var(--text)', paddingRight: 12 }}>{r.label}</span>
                    {b.twoCol && <span style={{ color: 'var(--muted)' }}>{r.value}</span>}
                  </div>
                ))}
              </div>
            )
          })}

          {section.table_kind === 'weapons' && <WeaponsTable weapons={data.weapons} />}
          {section.table_kind === 'skills' && <SkillsTable skills={data.skills} />}
          {section.table_kind === 'temperaments' && <TemperamentsTable temps={data.temperaments} />}
        </div>
      </div>
    </div>
  )
}

function WeaponsTable({ weapons }: { weapons: ComradeWeapon[] }) {
  const scale = useTextScale()
  const GRID = '110px 150px 150px 240px'
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, fontSize: 12 * scale, fontWeight: 600, color: 'var(--text)', padding: '0 0 3px', borderBottom: '1px solid var(--border)' }}>
        <span>Attack Power</span><span>Slash Weapon</span><span>Impact Weapon</span><span>Weapon Divider (Smaller is better)</span>
      </div>
      {weapons.map(w => (
        <div key={w.id} className="tbl-row" style={{ display: 'grid', gridTemplateColumns: GRID, padding: '4px 0', fontSize: 13 * scale }}>
          <span style={{ color: 'var(--muted)' }}>{w.attack_power}</span>
          <span style={{ color: 'var(--text)' }}>{w.slash}</span>
          <span style={{ color: 'var(--text)' }}>{w.impact}</span>
          <span style={{ color: 'var(--muted)' }}>{w.divider}</span>
        </div>
      ))}
    </div>
  )
}

function SkillsTable({ skills }: { skills: ComradeSkill[] }) {
  const scale = useTextScale()
  const GRID = '160px 60px 2fr 2fr'
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, fontSize: 12 * scale, fontWeight: 600, color: 'var(--text)', padding: '0 0 3px', borderBottom: '1px solid var(--border)' }}>
        <span>Skill</span><span>Cost</span><span>Description</span><span>How To Unlock</span>
      </div>
      {skills.map(s => (
        <div key={s.id} className="tbl-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '4px 0', fontSize: 13 * scale, alignItems: 'start' }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{s.skill}</span>
          <span style={{ color: 'var(--text)' }}>{s.cost}</span>
          <span style={{ color: 'var(--muted)' }}>{s.description}</span>
          <span style={{ color: 'var(--muted)' }}>{s.unlock}</span>
        </div>
      ))}
    </div>
  )
}

function TemperamentsTable({ temps }: { temps: ComradeTemperament[] }) {
  const scale = useTextScale()
  const GRID = '1fr 1fr 1fr 1fr'
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: GRID, fontSize: 12 * scale, fontWeight: 600, color: 'var(--text)', padding: '0 0 3px', borderBottom: '1px solid var(--border)' }}>
        <span>Character</span><span>Attack Preference</span><span>Healing Rate</span><span>Attacking Target</span>
      </div>
      {temps.map(t => (
        <div key={t.id} className="tbl-row" style={{ display: 'grid', gridTemplateColumns: GRID, gap: 8, padding: '4px 0', fontSize: 13 * scale }}>
          <span style={{ fontWeight: 600, color: 'var(--text)' }}>{t.character}</span>
          <span style={{ color: prefColor(t.attack_pref) }}>{t.attack_pref}</span>
          <span style={{ color: healColor(t.healing) }}>{t.healing}</span>
          <span style={{ color: targetColor(t.target) }}>{t.target}</span>
        </div>
      ))}
    </div>
  )
}

