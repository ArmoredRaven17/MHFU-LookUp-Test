import { useState } from 'react'
import type { HhSongData } from '../types'
import { BASE } from '../utils/assets'
import { useTextScale } from '../theme/textScale'

// ── Reference modal + type-specific trigger buttons ──────────────────────────

const NOTE_COLOR: Record<string, string> = {
  W: 'white', P: 'purple', B: 'blue', A: 'aqua', Y: 'yellow', R: 'red', G: 'green',
}

type Sheet = 'sharpness' | 'shells' | 'songs' | 'ammo' | 'shottypes' | 'recoilreload'

export default function WeaponReference({ type, hhSongs }: { type: string; hhSongs: HhSongData | null }) {
  const [open, setOpen] = useState<Sheet | null>(null)
  const scale = useTextScale()

  const isBowgun = type === 'Light Bowgun' || type === 'Heavy Bowgun'
  const isBow = type === 'Bow'
  const isMelee = !isBowgun && !isBow
  const buttons: [string, Sheet][] = []
  if (isMelee) buttons.push(['Sharpness…', 'sharpness'])
  if (type === 'Gunlance') buttons.push(['Shells…', 'shells'])
  if (type === 'Hunting Horn') buttons.push(['Songs…', 'songs'])
  if (isBowgun) buttons.push(['Ammo…', 'ammo'], ['Recoil & Reload…', 'recoilreload'])
  if (isBow) buttons.push(['Shot Types…', 'shottypes'])
  if (buttons.length === 0) return null

  return (
    <>
      {buttons.map(([label, key]) => (
        <button key={key} onClick={() => setOpen(key)} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
          color: 'var(--text)', padding: '3px 8px', fontSize: 12 * scale, cursor: 'pointer',
        }}>{label}</button>
      ))}
      {open === 'sharpness' && <Modal title="Sharpness Modifiers" onClose={() => setOpen(null)}><SharpnessSheet /></Modal>}
      {open === 'shells' && <Modal title="Gunlance Shell Types" onClose={() => setOpen(null)}><ShellsSheet /></Modal>}
      {open === 'songs' && <Modal title="Hunting Horn Songs" onClose={() => setOpen(null)}><SongsSheet data={hhSongs} /></Modal>}
      {open === 'ammo' && <Modal title="Bowgun Ammo" onClose={() => setOpen(null)}><AmmoSheet /></Modal>}
      {open === 'recoilreload' && <Modal title="Recoil & Reload" onClose={() => setOpen(null)}><RecoilReloadSheet /></Modal>}
      {open === 'shottypes' && <Modal title="Bow Shot Types" onClose={() => setOpen(null)}><ShotTypesSheet /></Modal>}
    </>
  )
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const scale = useTextScale()
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: '100%', maxWidth: 820, maxHeight: '85vh', overflow: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 18 * scale, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} title="Close" style={{
            background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 * scale, cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Sharpness ────────────────────────────────────────────────────────────────

const SHARP_ROWS: [string, string, string, string][] = [
  ['Red',    '#D03030', '×0.50',  '×0.25'],
  ['Orange', '#E08020', '×0.75',  '×0.50'],
  ['Yellow', '#E0C020', '×1.00',  '×0.75'],
  ['Green',  '#40A040', '×1.125', '×1.00'],
  ['Blue',   '#3060C0', '×1.25',  '×1.0625'],
  ['White',  '#E8E8E8', '×1.30',  '×1.125'],
  ['Purple', '#8040C0', '×1.50',  '×1.20'],
]

function SharpnessSheet() {
  const scale = useTextScale()
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        On blademaster weapons, sharpness scales how much damage lands. Each colour applies a
        multiplier — separately to Raw (physical) and Element damage — that rises as sharpness
        improves from Red to Purple. In the damage formula: damage = True Raw × Motion Value ×
        sharpness × (hitzone ÷ 100) × crit.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 420 }}>
        <thead>
          <tr>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Sharpness</th>
            <th className="tbl-header" style={{ textAlign: 'right' }}>Raw</th>
            <th className="tbl-header" style={{ textAlign: 'right' }}>Element</th>
          </tr>
        </thead>
        <tbody>
          {SHARP_ROWS.map(([name, hex, raw, elem]) => (
            <tr key={name} className="tbl-row">
              <td className="tbl-cell" style={{ color: hex, fontWeight: 600 }}>{name}</td>
              <td className="tbl-cell" style={{ textAlign: 'right' }}>{raw}</td>
              <td className="tbl-cell" style={{ textAlign: 'right' }}>{elem}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ color: 'var(--muted)', fontSize: 11 * scale, fontStyle: 'italic', marginBottom: 0 }}>
        Values extracted from the MHFU ROM damage table (f0076).
      </p>
    </div>
  )
}

// ── Gunlance shells ──────────────────────────────────────────────────────────

const SHELL_COLS: { name: string; hex: string; values: string[] }[] = [
  { name: 'Normal', hex: '#6A9CFF', values: ['12% · 4 Fire', '15% · 5 Fire', '18% · 6 Fire', '21% · 8 Fire', '24% · 8 Fire'] },
  { name: 'Long', hex: '#FF6A6A', values: ['18% · 9 Fire', '22% · 10 Fire', '28% · 14 Fire', '32% · 16 Fire', '36% · 18 Fire'] },
  { name: 'Spread', hex: '#66CC66', values: ['24% · 6 Fire', '32% · 8 Fire', '40% · 10 Fire', '44% · 11 Fire', '48% · 12 Fire'] },
  { name: 'Wyvern Fire', hex: '#FF9F4D', values: ['30% · 10 Fire', '36% · 12 Fire', '42% · 14 Fire', '44% · 15 Fire', '48% · 16 Fire'] },
]

// Per-level shell tint: hue channels step from 200 (Lv1, palest) to 88 (Lv5, most saturated).
function shellCellColor(name: string, lv: number) {
  const off = Math.round(200 + (88 - 200) * ((lv - 1) / 4))
  if (name === 'Normal') return `rgb(${off},${off},255)`
  if (name === 'Long') return `rgb(255,${off},${off})`
  if (name === 'Spread') return `rgb(${off},255,${off})`
  if (name === 'Wyvern Fire') {   // pale → vivid orange
    const t = (lv - 1) / 4
    const r = 255, g = Math.round(0xCF + (0x8A - 0xCF) * t), b = Math.round(0xA0 + (0x2E - 0xA0) * t)
    return `rgb(${r},${g},${b})`
  }
  return 'var(--text)'
}

function ShellsSheet() {
  const scale = useTextScale()
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        A gunlance fires shells whose power scales with its shell type and level (the Shelling stat).
        Normal, Long, and Spread differ in reach and spread; Wyvern Fire is the gunlance's big forward
        blast. Each entry is the shell's damage and its fire component, per shell level.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 560 }}>
          <thead>
            <tr>
              <th className="tbl-header" style={{ textAlign: 'left' }}>Shell Lvl</th>
              {SHELL_COLS.map(c => (
                <th key={c.name} className="tbl-header" style={{ textAlign: 'left', color: c.hex }}>{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(lv => (
              <tr key={lv} className="tbl-row">
                <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{lv}</td>
                {SHELL_COLS.map(c => (
                  <td key={c.name} className="tbl-cell" style={{ color: shellCellColor(c.name, lv) }}>{c.values[lv - 1]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Hunting Horn songs (full catalogue) ──────────────────────────────────────

// Wide enough for 4 note icons in a row (the longest sequence in the data) without wrapping;
// rarer 2-alternate sequences ("or") wrap onto a second line within the cell instead of forcing
// the column wider.
const NOTES_COL_WIDTH = 84

function SongsSheet({ data }: { data: HhSongData | null }) {
  const scale = useTextScale()
  if (!data) return <p style={{ color: 'var(--muted)', fontSize: 13 * scale }}>Loading…</p>
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        The full Hunting Horn melody catalogue. A horn can play a song if it has all the notes in one
        of its sequences; alternate sequences are shown separated by “or”.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            <th className="tbl-header" style={{ textAlign: 'left', width: NOTES_COL_WIDTH * scale }}>Notes</th>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Song Name</th>
            <th className="tbl-header" style={{ textAlign: 'left' }}>Description</th>
          </tr>
        </thead>
        <tbody>
          {data.songs.map(s => (
            <tr key={s.id} className="tbl-row">
              <td className="tbl-cell">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  {s.note_sequences.map((seq, si) => (
                    <span key={si} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      {si > 0 && <span style={{ color: 'var(--muted)', fontSize: 11 * scale, margin: '0 2px' }}>or</span>}
                      {seq.map((n, i) => (
                        <img key={i} src={`${BASE}/assets/Notes/Note.${NOTE_COLOR[n] ?? 'white'}.png`}
                             alt={n} title={n} width={16 * scale} height={16 * scale} style={{ objectFit: 'contain', flexShrink: 0 }} />
                      ))}
                    </span>
                  ))}
                </span>
              </td>
              <td className="tbl-cell" style={{ fontWeight: 600, color: 'var(--text)' }}>{s.name}</td>
              <td className="tbl-cell">
                <div>{s.effect} ({s.duration})</div>
                {s.encore_effect && (
                  <div style={{ color: 'var(--muted)', fontStyle: 'italic', marginTop: 2 }}>
                    Encore: {s.encore_effect} ({s.encore_duration})
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Bowgun ammo (full catalogue) ─────────────────────────────────────────────

const AMMO_COLORS: Record<string, string> = {
  Normal: '#6A9CFF', Pellet: '#66CC66', Pierce: '#FF6A6A',
  Flame: '#FF4D2E', Water: '#4A9EFF', Thndr: '#F5C400', Ice: '#7FD8F0', Drgon: '#B060E0',
  Poison: '#B060E0', Para: '#F5C400', Sleep: '#7FD8F0', Recov: '#5FB85F', Paint: '#FF7FBF',
  Tranq: '#FF5252', Demn: '#FF5252', Armor: '#FFA040', Crag: '#1FC8B4', Clust: '#7B68EE',
}

interface AmmoLvl { label: string; pwr: number; hits: string; notes: string; recoil: number; reload: number }
interface AmmoDef { key: string; name: string; desc: string; levels: AmmoLvl[]; footnote?: string }

const L = (label: string, pwr: number, hits: string, notes: string, recoil: number, reload: number): AmmoLvl =>
  ({ label, pwr, hits, notes, recoil, reload })

const AMMO_CAT: { group: string; ammo: AmmoDef[] }[] = [
  { group: 'Main Ammo', ammo: [
    { key: 'Normal', name: 'Normal S', desc: 'Standard shot with no special properties; nearly every gun loads it.',
      levels: [L('Lv1',6,'1','',9,5), L('Lv2',12,'1','',9,6), L('Lv3',10,'3','',9,7)] },
    { key: 'Pierce', name: 'Pierce S', desc: 'Passes through the target, striking several times along its body — best on large, long monsters.',
      levels: [L('Lv1',10,'3','',10,6), L('Lv2',9,'4','',10,7), L('Lv3',8,'5','',10,8)] },
    { key: 'Pellet', name: 'Pellet S', desc: 'Bursts into a spread of pellets — strong up close on a big hitzone.',
      levels: [L('Lv1',5,'3','',10,5), L('Lv2',5,'4','',10,6), L('Lv3',5,'5','',11,7)] },
    { key: 'Crag', name: 'Crag S', desc: 'Sticky impact shell that explodes after a delay; deals impact (KO) damage — aim for the head.',
      levels: [L('Lv1',3,'1','Fire 30 · Dmg 20',11,7), L('Lv2',3,'1','Fire 45 · Dmg 30',12,8), L('Lv3',3,'1','Fire 60 · Dmg 40',13,9)] },
    { key: 'Clust', name: 'Clust S', desc: 'Lobs a shell that scatters into a cluster of bombs over an area. Big damage, awkward to aim.',
      levels: [L('Lv1',6,'1','Fire 2 · Dmg 32×3',13,8), L('Lv2',6,'1','Fire 2 · Dmg 32×4',14,9), L('Lv3',6,'1','Fire 2 · Dmg 32×5',14,10)] },
  ] },
  { group: 'Status', ammo: [
    { key: 'Poison', name: 'Poison S', desc: 'Builds poison; once it triggers the monster steadily loses health.',
      levels: [L('Lv1',10,'1','Poison 25 (28)',11,7), L('Lv2',15,'1','Poison 50 (56)',14,9)] },
    { key: 'Para', name: 'Para S', desc: 'Builds paralysis (the guide labels it “Stun”); pins the monster when it triggers.',
      levels: [L('Lv1',10,'1','Para 25 (28)',11,7), L('Lv2',15,'1','Para 50 (56)',14,9)] },
    { key: 'Sleep', name: 'Sleep S', desc: 'Builds sleep; the first big hit on a sleeping monster deals bonus damage.',
      levels: [L('Lv1',0,'1','Sleep 25 (28)',11,7), L('Lv2',0,'1','Sleep 50 (56)',14,9)],
      footnote: '( ) values include Abnormal Status Attack Up (×1.125).' },
  ] },
  { group: 'Elemental', ammo: [
    { key: 'Flame', name: 'Flaming S', desc: 'Fire elemental damage.', levels: [L('',7,'1','Fire — ATP × 0.45',9,6)] },
    { key: 'Water', name: 'Water S', desc: 'Water elemental damage.', levels: [L('',5,'3','Water — ATP × 0.15',9,6)] },
    { key: 'Thndr', name: 'Thunder S', desc: 'Thunder elemental damage.', levels: [L('',5,'3','Thunder — ATP × 0.15',9,6)] },
    { key: 'Ice', name: 'Freeze S', desc: 'Ice elemental damage.', levels: [L('',5,'3','Ice — ATP × 0.15',9,6)] },
    { key: 'Drgon', name: 'Dragon S', desc: 'Dragon elemental damage — scarce but potent, especially against elder dragons.', levels: [L('',5,'5','Dragon 64',13,9)] },
  ] },
  { group: 'Support', ammo: [
    { key: 'Recov', name: 'Recovery S', desc: 'Heals you and nearby allies.',
      levels: [L('Lv1',0,'—','Recovery 30',10,7), L('Lv2',0,'—','Recovery 50',12,9)] },
    { key: 'Demn', name: 'Demon S', desc: 'Hits allies with a Demondrug effect, temporarily raising their attack.', levels: [L('',0,'—','Demondrug',11,7)] },
    { key: 'Armor', name: 'Armor S', desc: 'Hits allies with an Armorskin effect, temporarily raising their defense.', levels: [L('',0,'—','Armorskin',11,7)] },
  ] },
  { group: 'Misc', ammo: [
    { key: 'Tranq', name: 'Tranq S', desc: 'Tranquilizes a weakened monster — use with a trap to capture it.', levels: [L('',0,'1','Anesthesia 80',10,8)] },
    { key: 'Paint', name: 'Paint S', desc: 'Marks the monster on your map, like a Paintball.', levels: [L('',0,'1','Paintball',11,7)] },
  ] },
]

function AmmoSheet() {
  const scale = useTextScale()
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        Every bowgun ammo type, what it does, and its per-level stats. Which rounds a gun can load —
        and to what level — is shown in each Light/Heavy Bowgun's own Ammo table.
      </p>
      {AMMO_CAT.map(g => (
        <div key={g.group} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: 14 * scale, fontWeight: 600 }}>{g.group}</p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 620 }}>
              <thead>
                <tr>
                  <th className="tbl-header" style={{ textAlign: 'left' }}>Ammo</th>
                  <th className="tbl-header" style={{ textAlign: 'left' }}>Lv</th>
                  <th className="tbl-header" style={{ textAlign: 'right' }}>Pwr</th>
                  <th className="tbl-header" style={{ textAlign: 'right' }}>Hits</th>
                  <th className="tbl-header" style={{ textAlign: 'left' }}>Effect</th>
                  <th className="tbl-header" style={{ textAlign: 'right' }}>Recoil</th>
                  <th className="tbl-header" style={{ textAlign: 'right' }}>Reload</th>
                </tr>
              </thead>
              <tbody>
                {g.ammo.flatMap((a, ai) => a.levels.map((l, j) => {
                  // Divider above each new ammo type (not the first) to break up the table.
                  const sep = j === 0 && ai > 0 ? { borderTop: '1px solid rgba(255,255,255,0.12)' } : undefined
                  return (
                    <tr key={`${a.key}-${j}`} className="tbl-row">
                      {j === 0 && (
                        <td className="tbl-cell" rowSpan={a.levels.length} style={{ verticalAlign: 'top', minWidth: 150, ...sep }}>
                          <div style={{ color: AMMO_COLORS[a.key] ?? 'var(--text)', fontWeight: 600 }}>{a.name}</div>
                          <div style={{ color: 'var(--muted)', fontSize: 11 * scale }}>{a.desc}</div>
                          {a.footnote && (
                            <div style={{ color: 'var(--muted)', fontSize: 10 * scale, fontStyle: 'italic', marginTop: 2 }}>{a.footnote}</div>
                          )}
                        </td>
                      )}
                      <td className="tbl-cell" style={sep}>{l.label || '—'}</td>
                      <td className="tbl-cell" style={{ textAlign: 'right', ...sep }}>{l.pwr}</td>
                      <td className="tbl-cell" style={{ textAlign: 'right', ...sep }}>{l.hits}</td>
                      <td className="tbl-cell" style={sep}>{l.notes || '—'}</td>
                      <td className="tbl-cell" style={{ textAlign: 'right', ...sep }}>{l.recoil}</td>
                      <td className="tbl-cell" style={{ textAlign: 'right', ...sep }}>{l.reload}</td>
                    </tr>
                  )
                }))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      <p style={{ color: 'var(--muted)', fontSize: 11 * scale, marginBottom: 0 }}>
        Stats from the Bowgun Damage Guide (PSP) by VampireCosmonaut (GameFAQs). Recoil and Reload
        are the raw scale values (lower is better).
      </p>
    </div>
  )
}

// ── Bow shot types ───────────────────────────────────────────────────────────

const SHOT_TYPES: { name: string; hex: string; behaviour: string; powers: number[][] }[] = [
  { name: 'Rapid', hex: '#6A9CFF', behaviour: 'Arrows stack on a single spot — every hit lands reliably, so the whole pattern connects.',
    powers: [[12], [12,4], [12,4,3], [12,4,3,2], [12,4,3,3]] },
  { name: 'Scatter', hex: '#66CC66', behaviour: 'Pellets fan out in a spread — strong up close on a big part, but several often miss a small one.',
    powers: [[4,5,4], [5,6,5], [4,5,5,5,4], [4,5,6,5,4], [5,5,6,5,5]] },
  { name: 'Pierce', hex: '#FF6A6A', behaviour: 'The shot passes through the target, hitting once per tick — best on long, aligned bodies.',
    powers: [[6,6,6], [6,6,6,6], [6,6,6,6,6], [6,6,6,6,6], [6,6,6,6,6]] },
]

// ── Bowgun recoil & reload (effective-rating formula) ────────────────────────

const RECOIL_VALUES: [string, string][] = [
  ['Strong', '1'], ['Moderate', '2'], ['Light', '3'], ['Weak', '4'], ['Very Weak', '5'], ['Weakest', '6'],
]
const RECOIL_BANDS: [string, string, string][] = [
  ['≤ 8', 'Recoilless', '1 s'], ['9 – 10', 'Weak Recoil', '2 s'], ['11 +', 'Strong Recoil', '2.5 s'],
]
const RELOAD_VALUES: [string, string][] = [
  ['Fastest', '6'], ['SuperFast', '5'], ['VeryFast', '4'], ['Fast', '3'], ['Normal', '2'],
  ['Slow', '1'], ['VerySlow', '0'], ['SuperSlow', '−1'], ['Slowest', '−2'],
]
const RELOAD_BANDS: [string, string, string][] = [
  ['≤ 4', 'Fast', '2 s'], ['5 – 7', 'Medium', '2.5 s'], ['8 +', 'Slow', '3.5 s'],
]

const codeStyle = (scale: number): React.CSSProperties => ({
  display: 'inline-block', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
  padding: '3px 8px', fontSize: 12 * scale, color: 'var(--text)', fontFamily: 'ui-monospace, monospace', margin: '2px 0 8px',
})

function ValueTable({ header, rows }: { header: string; rows: [string, string][] }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead><tr>
        <th className="tbl-header" style={{ textAlign: 'left' }}>{header}</th>
        <th className="tbl-header" style={{ textAlign: 'right' }}>Value</th>
      </tr></thead>
      <tbody>
        {rows.map(([r, v]) => (
          <tr key={r} className="tbl-row">
            <td className="tbl-cell">{r}</td>
            <td className="tbl-cell" style={{ textAlign: 'right' }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function BandTable({ header, unit, rows }: { header: string; unit: string; rows: [string, string, string][] }) {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <thead><tr>
        <th className="tbl-header" style={{ textAlign: 'left' }}>Adjusted</th>
        <th className="tbl-header" style={{ textAlign: 'left' }}>{header}</th>
        <th className="tbl-header" style={{ textAlign: 'left' }}>{unit}</th>
      </tr></thead>
      <tbody>
        {rows.map(([a, r, t]) => (
          <tr key={a} className="tbl-row">
            <td className="tbl-cell">{a}</td>
            <td className="tbl-cell">{r}</td>
            <td className="tbl-cell" style={{ color: 'var(--muted)' }}>{t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function RecoilReloadSheet() {
  const scale = useTextScale()
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        Every round has a raw Recoil and Reload value (see the Bowgun Ammo sheet). Subtract the gun's
        own rating value, then read the effective rating from the band. Lower is better.
      </p>

      <p style={{ margin: '0 0 2px', color: 'var(--text)', fontSize: 14 * scale, fontWeight: 600 }}>Recoil</p>
      <div style={codeStyle(scale)}>Adjusted = Ammo Recoil − Bowgun Recoil Value</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
        <ValueTable header="Gun Recoil" rows={RECOIL_VALUES} />
        <BandTable header="Rating" unit="Recovery" rows={RECOIL_BANDS} />
      </div>

      <p style={{ margin: '0 0 2px', color: 'var(--text)', fontSize: 14 * scale, fontWeight: 600 }}>Reload</p>
      <div style={codeStyle(scale)}>Adjusted = Ammo Reload − Bowgun Reload Value</div>
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 12 }}>
        <ValueTable header="Gun Reload" rows={RELOAD_VALUES} />
        <BandTable header="Rating" unit="Reload Time" rows={RELOAD_BANDS} />
      </div>

      <p style={{ color: 'var(--muted)', fontSize: 11 * scale, marginBottom: 0 }}>
        Skills (Recoil Reduction, Reloading Speed) shift the gun's rating before the subtraction.
        Community bowgun guide — not ROM-verified.
      </p>
    </div>
  )
}

// Per-level shot tint (Rapid blue / Scatter green / Pierce red), saturating with level.
function shotLevelColor(name: string, lv: number) {
  const off = Math.round(200 + (88 - 200) * ((lv - 1) / 4))
  if (name === 'Rapid') return `rgb(${off},${off},255)`
  if (name === 'Scatter') return `rgb(${off},255,${off})`
  if (name === 'Pierce') return `rgb(255,${off},${off})`
  return 'var(--text)'
}

function ShotTypesSheet() {
  const scale = useTextScale()
  return (
    <div>
      <p style={{ color: 'var(--muted)', fontSize: 13 * scale, marginTop: 0 }}>
        Each charge level of a bow fires one of these shot types at a level. The pattern is the power
        of each arrow / hit; Raw damage scales with their sum, while element applies per arrow (every
        arrow carries the full element). Crit / Feeble is rolled per arrow.
      </p>
      {SHOT_TYPES.map(s => (
        <div key={s.name} style={{ marginBottom: 14 }}>
          <p style={{ margin: '0 0 4px', fontSize: 14 * scale }}>
            <span style={{ color: s.hex, fontWeight: 600 }}>{s.name}</span>
            <span style={{ color: 'var(--muted)' }}> — {s.behaviour}</span>
          </p>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="tbl-header" style={{ textAlign: 'left', width: 60 }}>Level</th>
                <th className="tbl-header" style={{ textAlign: 'left', width: 160 }}>Pattern</th>
                <th className="tbl-header" style={{ textAlign: 'left' }}>Hits</th>
              </tr>
            </thead>
            <tbody>
              {s.powers.map((arrows, i) => (
                <tr key={i} className="tbl-row" style={{ color: shotLevelColor(s.name, i + 1) }}>
                  <td className="tbl-cell" style={{ color: 'inherit' }}>Lv {i + 1}</td>
                  <td className="tbl-cell" style={{ color: 'inherit' }}>{arrows.join('-')}</td>
                  <td className="tbl-cell" style={{ color: 'inherit' }}>{arrows.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
