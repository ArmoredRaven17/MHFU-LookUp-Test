import { useState } from 'react'
import type { WeaponFilterState } from '../utils/weaponFilter'
import { defaultWeaponFilter, MELEE_FILTER_TYPES } from '../utils/weaponFilter'

const ELEMENT_ONLY_DEFS: [string, string][] = [
  ['Raw', 'Raw'], ['Fir', 'Fire'], ['Wtr', 'Water'], ['Thn', 'Thunder'], ['Ice', 'Ice'], ['Drg', 'Dragon'],
]
const ELEMENT_DEFS: [string, string][] = [...ELEMENT_ONLY_DEFS, ['Poi', 'Poison'], ['Par', 'Para'], ['Slp', 'Sleep']]
const COATING_DEFS: [string, string][] = [
  ['Pwr', 'Power'], ['Poi', 'Poison'], ['Par', 'Para'], ['Slp', 'Sleep'], ['Pnt', 'Paint'], ['Cls', 'Close-range'],
]
const SHOT_TYPE_DEFS = ['Rapid', 'Pierce', 'Scatter']
const AMMO_RAW_DEFS: [string, string][] = [['Normal', 'Normal'], ['Pierce', 'Pierce'], ['Pellet', 'Pellet'], ['Crag', 'Crag'], ['Clust', 'Clust']]
const AMMO_SUPPORT_DEFS: [string, string][] = [['Recov', 'Recov'], ['Poison', 'Poison'], ['Para', 'Para'], ['Sleep', 'Sleep']]
const AMMO_ELEMENT_DEFS: [string, string][] = [['Flame', 'Flame'], ['Water', 'Water'], ['Thndr', 'Thunder'], ['Ice', 'Ice'], ['Drgon', 'Dragon']]
const AMMO_OTHER_DEFS: [string, string][] = [['Tranq', 'Tranq'], ['Paint', 'Paint'], ['Demn', 'Demon'], ['Armor', 'Armor']]
const SHARPNESS_LEVELS = ['Any', 'Yellow', 'Green', 'Blue', 'White', 'Purple']
const FIRST_NOTE_DEFS: [string, string][] = [['', 'Any'], ['W', 'White'], ['P', 'Purple']]
const OTHER_NOTE_DEFS: [string, string][] = [['', 'Any'], ['B', 'Blue'], ['A', 'Aqua'], ['Y', 'Yellow'], ['R', 'Red'], ['G', 'Green']]

export default function WeaponFilterModal({ type, current, onApply, onClose }: {
  type: string
  current: WeaponFilterState
  onApply: (f: WeaponFilterState) => void
  onClose: () => void
}) {
  const [f, setF] = useState<WeaponFilterState>(() => cloneFilter(current))
  const isMelee = MELEE_FILTER_TYPES.has(type)
  const isBow = type === 'Bow'
  const isBowgun = type === 'Light Bowgun' || type === 'Heavy Bowgun'
  const isHH = type === 'Hunting Horn'
  const isGL = type === 'Gunlance'

  const toggleSet = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: '100%', maxWidth: 720, maxHeight: '85vh', overflow: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 18, fontWeight: 600 }}>Weapon Filters — {type}</h2>
          <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Section title="Name">
            <input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Substring match…"
              style={inputStyle} />
          </Section>

          {!isBowgun && (
            <Section title="Element  (any checked must match)">
              <CheckRow defs={isBow ? ELEMENT_ONLY_DEFS : ELEMENT_DEFS} selected={f.elements}
                onToggle={k => setF({ ...f, elements: toggleSet(f.elements, k) })} />
            </Section>
          )}

          <Section title="Stats">
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={labelStyle}>Min Attack:</label>
              <input type="number" min={0} value={f.minAtk || ''} placeholder="0"
                onChange={e => setF({ ...f, minAtk: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                style={{ ...inputStyle, width: 80 }} />
              <label style={labelStyle}>Min Slots:</label>
              <select value={f.minSlots} onChange={e => setF({ ...f, minSlots: Number(e.target.value) })} style={selectStyle}>
                <option value={0}>Any</option><option value={1}>1+</option><option value={2}>2+</option><option value={3}>3</option>
              </select>
            </div>
          </Section>

          <Section title="Affinity">
            <select value={f.affinity} onChange={e => setF({ ...f, affinity: e.target.value as WeaponFilterState['affinity'] })} style={selectStyle}>
              <option value="any">Any</option><option value="positive">Positive only</option><option value="negative">Negative only</option>
            </select>
          </Section>

          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
            <input type="checkbox" checked={f.defBonus} onChange={e => setF({ ...f, defBonus: e.target.checked })} />
            Only weapons with a Defense bonus
          </label>

          {isMelee && (
            <Section title="Sharpness">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={labelStyle}>Reaches at least:</label>
                <select value={f.minSharpness} onChange={e => setF({ ...f, minSharpness: e.target.value })} style={selectStyle}>
                  {SHARPNESS_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </Section>
          )}

          {isHH && (
            <Section title="Notes  (the horn must have these notes; 1st is White/Purple)">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={labelStyle}>1st:</label>
                <NoteSelect defs={FIRST_NOTE_DEFS} value={f.notes[0]} onChange={v => setF({ ...f, notes: [v, f.notes[1], f.notes[2]] })} />
                <label style={labelStyle}>2nd:</label>
                <NoteSelect defs={OTHER_NOTE_DEFS.filter(([l]) => l === '' || l !== f.notes[2])} value={f.notes[1]} onChange={v => setF({ ...f, notes: [f.notes[0], v, f.notes[2]] })} />
                <label style={labelStyle}>3rd:</label>
                <NoteSelect defs={OTHER_NOTE_DEFS.filter(([l]) => l === '' || l !== f.notes[1])} value={f.notes[2]} onChange={v => setF({ ...f, notes: [f.notes[0], f.notes[1], v] })} />
              </div>
            </Section>
          )}

          {isGL && (
            <Section title="Shells  (the gunlance's shelling type / minimum level)">
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={labelStyle}>Type:</label>
                <select value={f.shellType} onChange={e => setF({ ...f, shellType: e.target.value })} style={selectStyle}>
                  <option value="">Any</option><option value="Normal">Normal</option><option value="Long">Long</option><option value="Spread">Spread</option>
                </select>
                <label style={labelStyle}>Level:</label>
                <select value={f.shellLevelMin} onChange={e => setF({ ...f, shellLevelMin: Number(e.target.value) })} style={selectStyle}>
                  <option value={0}>Any</option><option value={1}>1+</option><option value={2}>2+</option><option value={3}>3+</option><option value={4}>4+</option><option value={5}>5</option>
                </select>
              </div>
            </Section>
          )}

          {isBow && (
            <>
              <Section title="Coatings  (any checked must be supported)">
                <CheckRow defs={COATING_DEFS} selected={f.coatings} onToggle={k => setF({ ...f, coatings: toggleSet(f.coatings, k) })} />
              </Section>
              <Section title="Shot Types  (checked shot must reach its level; Charge Level requires that shot at that charge slot, at its level or higher)">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                    {SHOT_TYPE_DEFS.map(st => {
                      const has = f.shotTypes.has(st)
                      const lvl = f.shotTypes.get(st) ?? 1
                      return (
                        <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={has} onChange={e => {
                              const next = new Map(f.shotTypes)
                              if (e.target.checked) next.set(st, lvl); else next.delete(st)
                              setF({ ...f, shotTypes: next })
                            }} />
                            {st}
                          </label>
                          <select disabled={!has} value={lvl} onChange={e => {
                            const next = new Map(f.shotTypes); next.set(st, Number(e.target.value)); setF({ ...f, shotTypes: next })
                          }} style={{ ...selectStyle, opacity: has ? 1 : 0.5 }}>
                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={labelStyle}>Desired Charge Level:</label>
                    <select value={f.shotChargeLevel} onChange={e => setF({ ...f, shotChargeLevel: Number(e.target.value) })} style={selectStyle}>
                      <option value={0}>Any</option><option value={1}>1</option><option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
                    </select>
                  </div>
                </div>
              </Section>
            </>
          )}

          {isBowgun && (
            <>
              <Section title="Raw Ammo  (any checked must be available)">
                <CheckRow defs={AMMO_RAW_DEFS} selected={f.ammoRaw} onToggle={k => setF({ ...f, ammoRaw: toggleSet(f.ammoRaw, k) })} />
              </Section>
              <Section title="Support Ammo">
                <CheckRow defs={AMMO_SUPPORT_DEFS} selected={f.ammoSupport} onToggle={k => setF({ ...f, ammoSupport: toggleSet(f.ammoSupport, k) })} />
              </Section>
              <Section title="Element Ammo">
                <CheckRow defs={AMMO_ELEMENT_DEFS} selected={f.ammoElement} onToggle={k => setF({ ...f, ammoElement: toggleSet(f.ammoElement, k) })} />
              </Section>
              <Section title="Other Ammo">
                <CheckRow defs={AMMO_OTHER_DEFS} selected={f.ammoOther} onToggle={k => setF({ ...f, ammoOther: toggleSet(f.ammoOther, k) })} />
              </Section>
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button onClick={() => setF(defaultWeaponFilter())} style={btnStyle}>Clear All</button>
          <button onClick={onClose} style={btnStyle}>Cancel</button>
          <button onClick={() => onApply(f)} style={{ ...btnStyle, border: '1px solid var(--text)', fontWeight: 600 }}>Apply</button>
        </div>
      </div>
    </div>
  )
}

function cloneFilter(f: WeaponFilterState): WeaponFilterState {
  return {
    ...f,
    elements: new Set(f.elements), coatings: new Set(f.coatings), shotTypes: new Map(f.shotTypes),
    ammoRaw: new Set(f.ammoRaw), ammoSupport: new Set(f.ammoSupport), ammoElement: new Set(f.ammoElement), ammoOther: new Set(f.ammoOther),
    notes: [...f.notes],
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{ margin: '0 0 5px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{title}</p>
      {children}
    </div>
  )
}

function CheckRow({ defs, selected, onToggle }: { defs: [string, string][]; selected: Set<string>; onToggle: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
      {defs.map(([key, label]) => (
        <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
          <input type="checkbox" checked={selected.has(key)} onChange={() => onToggle(key)} />
          {label}
        </label>
      ))}
    </div>
  )
}

function NoteSelect({ defs, value, onChange }: { defs: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} style={selectStyle}>
      {defs.map(([letter, label]) => <option key={label} value={letter}>{label}</option>)}
    </select>
  )
}

const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)' }
const inputStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '4px 8px', fontSize: 13,
}
const selectStyle: React.CSSProperties = {
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '3px 6px', fontSize: 13,
}
const btnStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '6px 14px', fontSize: 13, cursor: 'pointer',
}
