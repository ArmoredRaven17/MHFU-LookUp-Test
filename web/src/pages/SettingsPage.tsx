import { useEffect, useMemo, useState } from 'react'
import { loadMonsters, loadItems, loadAwards } from '../data/loaders'
import type { Monster, Item, Award } from '../types'
import { BASE } from '../utils/assets'
import { NAV } from '../components/Layout'
import Dropdown from '../components/Dropdown'
import {
  COLOR_PRESETS,
  getSurface, getAccent, getIcon,
  setSurface, setAccent, setIcon, resetAppearance,
} from '../theme/appearance'
import { getTabIcons, setTabIcon, resetTabIcons } from '../theme/tabIcons'
import { SCALE_PRESETS, getTextScale, setTextScale, resetTextScale, useTextScale } from '../theme/textScale'
import { buildIconCatalog, describeIconValue, resolveIconSrc, type IconEntry } from '../theme/iconCatalog'

const TABS = NAV

export default function SettingsPage() {
  const scale = useTextScale()
  const [monsters, setMonsters] = useState<Monster[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [awards, setAwards] = useState<Award[]>([])
  const [surface, setSurfaceState] = useState(getSurface())
  const [accent, setAccentState] = useState(getAccent())
  const [icon, setIconState] = useState(getIcon())
  const [textScale, setTextScaleState] = useState(getTextScale())
  const [tabIcons, setTabIconsState] = useState<Record<string, string>>(getTabIcons())

  useEffect(() => { loadMonsters().then(m => setMonsters([...m].sort((a, b) => a.name.localeCompare(b.name)))) }, [])
  useEffect(() => { loadItems().then(setItems) }, [])
  useEffect(() => { loadAwards().then(setAwards) }, [])

  // EXPERIMENTAL — full icon catalog (monsters + weapon types + elements + locations + notes +
  // decoration colours + awards + items), grouped by type, for the Tab Icons picker below.
  const iconCatalog = useMemo(() => buildIconCatalog(monsters, items, awards), [monsters, items, awards])

  const chooseSurface = (key: string) => { setSurface(key); setSurfaceState(key) }
  const chooseAccent = (hex: string) => { setAccent(hex); setAccentState(hex) }
  const chooseIcon = (id: string) => { setIcon(id); setIconState(id) }
  const chooseTextScale = (value: number) => { setTextScale(value); setTextScaleState(value) }
  const chooseTabIcon = (tag: string, id: string) => {
    setTabIcon(tag, id); setTabIconsState(getTabIcons())
  }
  const restore = () => {
    resetAppearance(); resetTabIcons(); resetTextScale()
    setSurfaceState(getSurface()); setAccentState(getAccent()); setIconState(getIcon()); setTabIconsState({})
    setTextScaleState(getTextScale())
  }

  const effectiveTabIcon = (tag: string) => tabIcons[tag] ?? TABS.find(t => t.path === tag)!.icon
  const accentSelectValue = (COLOR_PRESETS.find(p => p.swatch.toLowerCase() === accent.toLowerCase()) ?? COLOR_PRESETS[0]).swatch
  const surfaceOptions = COLOR_PRESETS.map(p => ({ value: p.key, label: p.name, swatch: p.swatch }))
  const accentOptions = COLOR_PRESETS.map(p => ({ value: p.swatch, label: p.name, swatch: p.swatch }))
  const monsterOptions = (list: Monster[]) => list.map(m => ({ value: m.id, label: m.name, icon: `${BASE}/assets/Monsters/${m.id}.png` }))

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 24, background: 'transparent' }}>
      <div style={{ maxWidth: 720 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 * scale, fontWeight: 700, color: 'var(--text)' }}>Settings</h1>
          <button onClick={restore} style={{
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
            color: 'var(--text)', padding: '6px 12px', fontSize: 13 * scale, cursor: 'pointer',
          }}>Restore Defaults</button>
        </div>

        {/* ── Appearance ── */}
        <SectionTitle>Appearance</SectionTitle>

        <Label>Text size</Label>
        <Dropdown value={String(textScale)} onChange={v => chooseTextScale(Number(v))}
          options={SCALE_PRESETS.map(p => ({ value: String(p.value), label: p.label }))} />
        <Hint>Grows text only — not a page zoom, so layout and icons stay put.</Hint>

        <Label style={{ marginTop: 16 }}>App icon (browser tab)</Label>
        <Dropdown value={icon} onChange={chooseIcon} options={monsterOptions(monsters)} />
        <Hint>Sets the favicon shown in the browser tab.</Hint>

        <Label style={{ marginTop: 16 }}>App colour (background theme)</Label>
        <div style={{ marginBottom: 12 }}>
          <Dropdown value={surface} onChange={chooseSurface} options={surfaceOptions} />
        </div>

        <Label>Accent colour (highlights)</Label>
        <div style={{ marginBottom: 4 }}>
          <Dropdown value={accentSelectValue} onChange={chooseAccent} options={accentOptions} />
        </div>
        <Hint>Colour and accent apply immediately and are remembered on this device.</Hint>

        {/* ── Tab Icons ── */}
        <SectionTitle style={{ marginTop: 28 }}>Tab Icons</SectionTitle>
        <Hint>
          Pick a category, then an icon within it, for each tab. Each icon can only be used once.
          (Experimental — may be reverted.)
        </Hint>
        <div style={{ marginTop: 8 }}>
          {TABS.map(t => {
            const current = effectiveTabIcon(t.path)
            const usedByOthers = new Set(TABS.filter(o => o.path !== t.path).map(o => effectiveTabIcon(o.path)))
            return (
              <div key={t.path} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', alignItems: 'center', gap: 8, padding: '3px 0' }}>
                <span style={{ fontSize: 13 * scale, color: 'var(--text)' }}>{t.label}</span>
                <TabIconPicker current={current} catalog={iconCatalog} usedElsewhere={usedByOthers}
                  onChange={id => chooseTabIcon(t.path, id)} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// EXPERIMENTAL — category-first icon picker: a category Dropdown narrows which group the second,
// icon Dropdown offers, instead of one flat list spanning every category (too much scrolling with
// ~450 options combined). Switching category auto-picks that category's first available icon.
function TabIconPicker({ current, catalog, usedElsewhere, onChange }: {
  current: string
  catalog: IconEntry[]
  usedElsewhere: Set<string>
  onChange: (value: string) => void
}) {
  const scale = useTextScale()
  const groups = useMemo(() => [...new Set(catalog.map(e => e.group))], [catalog])
  const currentEntry = catalog.find(e => e.value === current)
  // A saved default can reference a value the catalog no longer lists (e.g. an armor rarity tier
  // trimmed down to just one representative icon) — describeIconValue() keeps it displaying with
  // the right category/label instead of showing the raw `category:id` string.
  const orphan = !currentEntry ? describeIconValue(current) : null
  const currentGroup = currentEntry?.group ?? orphan?.group ?? groups[0]
  const [category, setCategory] = useState(currentGroup)

  useEffect(() => { setCategory(currentGroup) }, [currentGroup])

  const iconsInCategory = catalog.filter(e => e.group === category && (e.value === current || !usedElsewhere.has(e.value)))
    .map(e => ({ value: e.value, label: e.label, icon: e.src }))
  if (orphan && orphan.group === category) {
    iconsInCategory.unshift({ value: current, label: orphan.label, icon: resolveIconSrc(current) })
  }

  const chooseCategory = (newCategory: string) => {
    if (newCategory === category) return
    setCategory(newCategory)
    const first = catalog.find(e => e.group === newCategory && !usedElsewhere.has(e.value))
    if (first) onChange(first.value)
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <Dropdown value={category} onChange={chooseCategory} style={{ width: 170 * scale, flexShrink: 0 }}
        options={groups.map(g => ({ value: g, label: g }))} />
      <Dropdown value={current} onChange={onChange} style={{ width: 220 * scale, flexShrink: 0 }}
        options={iconsInCategory} />
    </div>
  )
}

function SectionTitle({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const scale = useTextScale()
  return <h2 style={{ margin: '0 0 8px', fontSize: 16 * scale, fontWeight: 600, color: 'var(--text)', ...style }}>{children}</h2>
}
function Label({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const scale = useTextScale()
  return <p style={{ margin: '0 0 6px', fontSize: 13 * scale, color: 'var(--text)', ...style }}>{children}</p>
}
function Hint({ children }: { children: React.ReactNode }) {
  const scale = useTextScale()
  return <p style={{ margin: '2px 0 0', fontSize: 12 * scale, fontStyle: 'italic', color: 'var(--muted)' }}>{children}</p>
}
