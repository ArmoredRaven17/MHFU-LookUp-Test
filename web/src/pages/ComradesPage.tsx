import { useEffect, useState } from 'react'
import { loadComrades } from '../data/loaders'
import type { ComradeSection, ComradeWeapon, ComradeSkill, ComradeTemperament } from '../types'

interface ComradesData {
  sections: ComradeSection[]
  weapons: ComradeWeapon[]
  skills: ComradeSkill[]
  temperaments: ComradeTemperament[]
}

export default function ComradesPage() {
  const [data, setData] = useState<ComradesData | null>(null)
  const [sectionId, setSectionId] = useState(1)

  useEffect(() => { loadComrades().then(setData) }, [])

  if (!data) return <p style={{ padding: 16, color: 'var(--muted)', fontSize: 13 }}>Loading…</p>

  const section = data.sections.find(s => s.id === sectionId) ?? data.sections[0]

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── List panel ── */}
      <div style={{
        width: 180, minWidth: 180,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {data.sections.map(s => {
            const active = s.id === sectionId
            return (
              <button key={s.id} onClick={() => setSectionId(s.id)} style={{
                display: 'block', width: '100%', padding: '6px 12px',
                background: active ? 'rgba(200,168,75,0.15)' : 'transparent',
                border: 'none', borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
                color: active ? 'var(--accent)' : 'var(--text)',
                cursor: 'pointer', textAlign: 'left', fontSize: 13,
              }}>
                {s.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Content panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: 'var(--bg)' }}>
        <div style={{ maxWidth: 760 }}>
          <h2 style={{ margin: '0 0 12px', color: 'var(--accent)', fontSize: 20, fontWeight: 600 }}>
            {section.title}
          </h2>

          {/* Prose body */}
          {section.body && (
            <div style={{ marginBottom: 18 }}>
              {section.body.split('\n').map((line, i) => (
                <p key={i} style={{ margin: '0 0 4px', fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                  {line || <br />}
                </p>
              ))}
            </div>
          )}

          {/* Weapons table */}
          {section.table_kind === 'weapons' && (
            <Section title="Weapon Upgrades">
              <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 500 }}>
                <thead>
                  <tr>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Attack Power</th>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Slash Weapon</th>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Impact Weapon</th>
                  </tr>
                </thead>
                <tbody>
                  {data.weapons.map(w => (
                    <tr key={w.id} className="tbl-row">
                      <td className="tbl-cell" style={{ color: 'var(--muted)', fontFamily: 'monospace' }}>{w.attack_power}</td>
                      <td className="tbl-cell">{w.slash}</td>
                      <td className="tbl-cell">{w.impact}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Skills table */}
          {section.table_kind === 'skills' && (
            <Section title="Skills (36)">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th className="tbl-header" style={{ textAlign: 'left', width: 130 }}>Skill</th>
                    <th className="tbl-header" style={{ textAlign: 'right', width: 50 }}>Cost</th>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Description</th>
                    <th className="tbl-header" style={{ textAlign: 'left', width: 180 }}>How to Unlock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.skills.map(sk => (
                    <tr key={sk.id} className="tbl-row">
                      <td className="tbl-cell" style={{ fontWeight: 500 }}>{sk.skill}</td>
                      <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--positive)' }}>{sk.cost}</td>
                      <td className="tbl-cell" style={{ fontSize: 12, color: 'var(--muted)' }}>{sk.description}</td>
                      <td className="tbl-cell" style={{ fontSize: 11, color: 'var(--muted)' }}>{sk.unlock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          {/* Temperaments table */}
          {section.table_kind === 'temperaments' && (
            <Section title="Temperaments">
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th className="tbl-header" style={{ textAlign: 'left', width: 110 }}>Character</th>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Attack Preference</th>
                    <th className="tbl-header" style={{ textAlign: 'left', width: 120 }}>Healing Rate</th>
                    <th className="tbl-header" style={{ textAlign: 'left' }}>Attacking Target</th>
                  </tr>
                </thead>
                <tbody>
                  {data.temperaments.map(t => (
                    <tr key={t.id} className="tbl-row">
                      <td className="tbl-cell" style={{ fontWeight: 500 }}>{t.character}</td>
                      <td className="tbl-cell" style={{ fontSize: 12 }}>{t.attack_pref}</td>
                      <td className="tbl-cell" style={{ fontSize: 12, color: 'var(--muted)' }}>{t.healing}</td>
                      <td className="tbl-cell" style={{ fontSize: 12, color: 'var(--muted)' }}>{t.target}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 6, marginBottom: 16 }}>
      <h3 style={{ margin: '0 0 6px', color: 'var(--accent)', fontSize: 13,
                   fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}
