import { useEffect, useState } from 'react'
import { loadMonsters } from '../data/loaders'
import type { Monster } from '../types'
import { BASE } from '../utils/assets'
import { NAV } from '../components/Layout'
import {
  COLOR_PRESETS,
  getSurface, getAccent, getIcon,
  setSurface, setAccent, setIcon, resetAppearance,
} from '../theme/appearance'
import { getTabIcons, setTabIcon, resetTabIcons } from '../theme/tabIcons'

const TABS = NAV

export default function SettingsPage() {
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [surface, setSurfaceState] = useState(getSurface())
  const [accent, setAccentState] = useState(getAccent())
  const [icon, setIconState] = useState(getIcon())
  const [tabIcons, setTabIconsState] = useState<Record<string, string>>(getTabIcons())

  useEffect(() => { loadMonsters().then(m => setMonsters([...m].sort((a, b) => a.name.localeCompare(b.name)))) }, [])

  const chooseSurface = (key: string) => { setSurface(key); setSurfaceState(key) }
  const chooseAccent = (hex: string) => { setAccent(hex); setAccentState(hex) }
  const chooseIcon = (id: string) => { setIcon(id); setIconState(id) }
  const chooseTabIcon = (tag: string, id: string) => {
    setTabIcon(tag, id); setTabIconsState(getTabIcons())
  }
  const restore = () => {
    resetAppearance(); resetTabIcons()
    setSurfaceState(getSurface()); setAccentState(getAccent()); setIconState(getIcon()); setTabIconsState({})
  }

  const effectiveTabIcon = (tag: string) => tabIcons[tag] ?? TABS.find(t => t.path === tag)!.icon
  const surfaceSwatch = (COLOR_PRESETS.find(p => p.key === surface) ?? COLOR_PRESETS[0]).swatch
  const accentSelectValue = (COLOR_PRESETS.find(p => p.swatch.toLowerCase() === accent.toLowerCase()) ?? COLOR_PRESETS[0]).swatch

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'transparent' }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: 'var(--text)' }}>Settings</h1>
          <button onClick={restore} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '6px 12px', fontSize: 13, cursor: 'pointer',
          }}>Restore Defaults</button>
        </div>

        {/* ── Appearance ── */}
        <SectionTitle>Appearance</SectionTitle>

        <Label>App colour (background theme)</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0, background: surfaceSwatch, border: '1px solid rgba(255,255,255,0.15)' }} />
          <select value={surface} onChange={e => chooseSurface(e.target.value)} style={selStyle}>
            {COLOR_PRESETS.map(p => <option key={p.key} value={p.key}>{p.name}</option>)}
          </select>
        </div>

        <Label>Accent colour (highlights)</Label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
          <span style={{ width: 24, height: 24, borderRadius: 4, flexShrink: 0, background: accent, border: '1px solid rgba(255,255,255,0.15)' }} />
          <select value={accentSelectValue} onChange={e => chooseAccent(e.target.value)} style={selStyle}>
            {COLOR_PRESETS.map(p => <option key={p.key} value={p.swatch}>{p.name}</option>)}
          </select>
        </div>
        <Hint>Colour and accent apply immediately and are remembered on this device.</Hint>

        <Label style={{ marginTop: 16 }}>App icon (browser tab)</Label>
        <MonsterPicker monsters={monsters} value={icon} onChange={chooseIcon} />
        <Hint>Sets the favicon shown in the browser tab.</Hint>

        {/* ── Tab Icons ── */}
        <SectionTitle style={{ marginTop: 28 }}>Tab Icons</SectionTitle>
        <Hint>Pick a monster icon for each tab. Each monster can only be used once.</Hint>
        <div style={{ marginTop: 8 }}>
          {TABS.map(t => {
            const current = effectiveTabIcon(t.path)
            const usedByOthers = new Set(TABS.filter(o => o.path !== t.path).map(o => effectiveTabIcon(o.path)))
            const options = monsters.filter(m => m.id === current || !usedByOthers.has(m.id))
            return (
              <div key={t.path} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ fontSize: 13, color: 'var(--text)' }}>{t.label}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src={`${BASE}/assets/Monsters/${current}.png`} alt="" width={22} height={22}
                       style={{ objectFit: 'contain', flexShrink: 0 }}
                       onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
                  <select value={current} onChange={e => chooseTabIcon(t.path, e.target.value)} style={selStyle}>
                    {options.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonsterPicker({ monsters, value, onChange }: { monsters: Monster[]; value: string; onChange: (id: string) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <img src={`${BASE}/assets/Monsters/${value}.png`} alt="" width={24} height={24}
           style={{ objectFit: 'contain', flexShrink: 0 }}
           onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
      <select value={value} onChange={e => onChange(e.target.value)} style={selStyle}>
        {monsters.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>
    </div>
  )
}

const selStyle: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '4px 8px', fontSize: 13, minWidth: 200,
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <h2 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--text)', ...style }}>{children}</h2>
}
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--text)', ...style }}>{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: '2px 0 0', fontSize: 12, fontStyle: 'italic', color: 'var(--muted)' }}>{children}</p>
}
