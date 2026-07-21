import { useEffect, useMemo, useState } from 'react'
import type { Weapon } from '../types'
import Dropdown from './Dropdown'
import { useTextScale } from '../theme/textScale'
import {
  parseCharges, parseBowElement, hasPowerCoating, computeBowTable, simulateBurst, arrowPowers,
  type BowShotType, type SideEffects, type ChargeRow, type SimResult,
} from '../utils/bowCompare'

const SHOT_COLOR: Record<BowShotType, string> = { Rapid: '#6A9CFF', Scatter: '#66CC66', Pierce: '#FF6A6A' }
const SHOT_BEHAVIOR: Record<BowShotType, string> = {
  Rapid: 'arrows stack on one spot — all hits land reliably.',
  Pierce: 'passes through the target — every tick lands only on a long, aligned body.',
  Scatter: 'pellets fan out — several often miss the target part.',
}
const ELEMENT_HEX: Record<string, string> = { Fir: '#FF4D2E', Wtr: '#4A9EFF', Thn: '#F5C400', Ice: '#7FD8F0', Drg: '#B060E0' }

const DEFAULT_EFFECTS: SideEffects = { powerCoating: false, rapidUp: false, pierceUp: false, scatterUp: false }

const fmt = (n: number) => n.toFixed(1)

export default function BowCompareModal({ bows, preselectId, onClose }: {
  bows: Weapon[]
  preselectId?: string
  onClose: () => void
}) {
  const scale = useTextScale()
  const [aId, setAId] = useState(() => preselectId && bows.some(b => b.id === preselectId) ? preselectId : (bows[0]?.id ?? ''))
  const [bId, setBId] = useState(() => {
    const other = bows.find(b => b.id !== aId)
    return other?.id ?? bows[0]?.id ?? ''
  })
  const [effectsA, setEffectsA] = useState<SideEffects>(DEFAULT_EFFECTS)
  const [effectsB, setEffectsB] = useState<SideEffects>(DEFAULT_EFFECTS)

  const bowA = bows.find(b => b.id === aId) ?? null
  const bowB = bows.find(b => b.id === bId) ?? null

  const chargesA = useMemo(() => bowA ? parseCharges(bowA.doc) : [], [bowA])
  const chargesB = useMemo(() => bowB ? parseCharges(bowB.doc) : [], [bowB])

  const [simChargeA, setSimChargeA] = useState(1)
  const [simChargeB, setSimChargeB] = useState(1)
  useEffect(() => { setSimChargeA(chargesA.length > 0 ? chargesA.length : 1) }, [chargesA])
  useEffect(() => { setSimChargeB(chargesB.length > 0 ? chargesB.length : 1) }, [chargesB])

  const [shotCount, setShotCount] = useState(20)
  const [simA, setSimA] = useState<SimResult | null>(null)
  const [simB, setSimB] = useState<SimResult | null>(null)
  // Any config change invalidates the last roll — force a fresh "Simulate" rather than showing
  // stale results next to an updated table.
  useEffect(() => { setSimA(null); setSimB(null) }, [aId, bId, effectsA, effectsB])

  const rowsA = useMemo(() => bowA ? computeBowTable(bowA.doc, effectsA) : [], [bowA, effectsA])
  const rowsB = useMemo(() => bowB ? computeBowTable(bowB.doc, effectsB) : [], [bowB, effectsB])

  const options = bows
    .slice()
    .sort((a, b) => a.doc.name.localeCompare(b.doc.name))
    .map(w => ({ value: w.id, label: w.doc.name }))

  const runSimulate = () => {
    const shots = Math.min(500, Math.max(1, Math.round(shotCount) || 20))
    if (bowA && chargesA.length > 0) {
      const shot = chargesA[Math.min(Math.max(simChargeA, 1), chargesA.length) - 1]
      setSimA(simulateBurst(bowA.doc, shot, effectsA, shots, Math.random))
    }
    if (bowB && chargesB.length > 0) {
      const shot = chargesB[Math.min(Math.max(simChargeB, 1), chargesB.length) - 1]
      setSimB(simulateBurst(bowB.doc, shot, effectsB, shots, Math.random))
    }
  }

  const scaleMax = Math.max(simA?.maxRaw ?? 1, simB?.maxRaw ?? 1, 1)

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
        width: '100%', maxWidth: 900, maxHeight: '85vh', overflow: 'auto', padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0, color: 'var(--text)', fontSize: 18 * scale, fontWeight: 600 }}>Compare Bows</h2>
          <button onClick={onClose} title="Close" style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 20 * scale, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 8 }}>
          <Dropdown value={aId} onChange={setAId} options={options} style={{ width: '100%' }} />
          <Dropdown value={bId} onChange={setBId} options={options} style={{ width: '100%' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 10 }}>
          <EffectToggles effects={effectsA} onChange={setEffectsA} />
          <EffectToggles effects={effectsB} onChange={setEffectsB} />
        </div>

        <ShotTypeLegend />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
          <BowColumn weapon={bowA} effects={effectsA} rows={rowsA} />
          <BowColumn weapon={bowB} effects={effectsB} rows={rowsB} />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 14, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          <button onClick={runSimulate} style={btnStyle(scale)}>Simulate</button>
          <input type="number" min={1} max={500} value={shotCount}
            onChange={e => setShotCount(Math.min(500, Math.max(1, parseInt(e.target.value, 10) || 1)))}
            style={{ ...inputStyle(scale), width: 70 }} />
          <span style={{ fontSize: 12 * scale, color: 'var(--muted)' }}>shots — A charge</span>
          <Dropdown value={String(simChargeA)} onChange={v => setSimChargeA(Number(v))}
            options={chargesA.map((_, i) => ({ value: String(i + 1), label: `Lv${i + 1}` }))} style={{ width: 80 }} />
          <span style={{ fontSize: 12 * scale, color: 'var(--muted)' }}>B charge</span>
          <Dropdown value={String(simChargeB)} onChange={v => setSimChargeB(Number(v))}
            options={chargesB.map((_, i) => ({ value: String(i + 1), label: `Lv${i + 1}` }))} style={{ width: 80 }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 10 }}>
          <SimColumn weapon={bowA} sim={simA} scaleMax={scaleMax} />
          <SimColumn weapon={bowB} sim={simB} scaleMax={scaleMax} />
        </div>

        <p style={{ margin: '14px 0 0', fontSize: 11 * scale, color: 'var(--muted)', lineHeight: 1.5 }}>
          Best case: every arrow is assumed to land within critical distance. It's a neutral index — hitzone, monster
          defense, rage and range held at 1.0, so values compare bows directly rather than predicting damage on a
          specific monster. Raw Min/Avg/Max is the affinity spread: positive affinity ranges normal→crit (×1.0–1.25),
          negative ranges Feeble→normal (×0.75–1.0); Avg is the expected value. Element carries no crit, so it is
          single-valued. Rapid/Pierce/Scatter Up affect Raw only, not Element.
        </p>
      </div>
    </div>
  )
}

function EffectToggles({ effects, onChange }: { effects: SideEffects; onChange: (e: SideEffects) => void }) {
  const scale = useTextScale()
  const toggle = (key: keyof SideEffects) => onChange({ ...effects, [key]: !effects[key] })
  const row = (key: keyof SideEffects, label: string, title: string) => (
    <label key={key} title={title} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 * scale, color: 'var(--text)', cursor: 'pointer' }}>
      <input type="checkbox" checked={effects[key]} onChange={() => toggle(key)} />
      {label}
    </label>
  )
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      {row('powerCoating', 'Power Coating (×1.5)', 'Power Coating — ×1.5 raw, where loadable')}
      {row('rapidUp', 'Rapid Up (+10%)', 'NormS Up — Increase damage of NormS/Rapid Shots by +10%')}
      {row('pierceUp', 'Pierce Up (+10%)', 'PierceS Up — Increase damage of PierceS/Pierce Shots by +10%')}
      {row('scatterUp', 'Scatter Up (+30%)', 'PelletS Up — Increases damage of PelletS/Spread Shots by +30%')}
    </div>
  )
}

function ShotTypeLegend() {
  const scale = useTextScale()
  return (
    <div style={{ marginBottom: 4 }}>
      <p style={{ margin: '0 0 2px', fontSize: 12 * scale, fontWeight: 600, color: 'var(--accent)' }}>Shot types</p>
      {(['Rapid', 'Scatter', 'Pierce'] as BowShotType[]).map(t => (
        <p key={t} style={{ margin: 0, fontSize: 11 * scale }}>
          <span style={{ color: SHOT_COLOR[t], fontWeight: 600 }}>{t}</span>
          <span style={{ color: 'var(--muted)' }}> — {SHOT_BEHAVIOR[t]}</span>
        </p>
      ))}
    </div>
  )
}

function BowColumn({ weapon, effects, rows }: { weapon: Weapon | null; effects: SideEffects; rows: ChargeRow[] }) {
  const scale = useTextScale()
  if (!weapon) return <div />
  const doc = weapon.doc
  const { type: elType } = parseBowElement(doc)
  const hasElement = !!elType
  const poweredButUnsupported = effects.powerCoating && !hasPowerCoating(doc)
  const pairs: [BowShotType, number][] = []
  for (const r of rows) if (!pairs.some(([t, l]) => t === r.shotType && l === r.shotLevel)) pairs.push([r.shotType, r.shotLevel])

  return (
    <div>
      <p style={{ margin: 0, fontSize: 15 * scale, fontWeight: 700, color: 'var(--text)' }}>{doc.name}</p>
      <p style={{ margin: '0 0 6px', fontSize: 12 * scale, color: 'var(--muted)' }}>
        Atk {doc.atk}
        {doc.affinity ? `   Affinity ${doc.affinity > 0 ? '+' : ''}${doc.affinity}%` : ''}
        {elType ? `   ${elType} ${parseBowElement(doc).value}` : ''}
      </p>

      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <thead>
          <tr>
            {['Chg', 'Shot', 'Min', 'Avg', 'Max', 'Elem'].map((h, i) => (
              <th key={h} className="tbl-header" style={{ textAlign: i >= 2 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="tbl-row">
              <td className="tbl-cell">Lv{r.chargeLevel}</td>
              <td className="tbl-cell" style={{ color: SHOT_COLOR[r.shotType], fontWeight: 600 }}>{r.shotType} {r.shotLevel}</td>
              <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--negative)' }}>{fmt(r.rawMin)}</td>
              <td className="tbl-cell" style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(r.rawAvg)}</td>
              <td className="tbl-cell" style={{ textAlign: 'right', color: 'var(--positive)' }}>{fmt(r.rawMax)}</td>
              <td className="tbl-cell" style={{ textAlign: 'right', color: hasElement ? (ELEMENT_HEX[elType!] ?? 'var(--accent)') : 'var(--muted)' }}>
                {hasElement ? fmt(r.element) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {poweredButUnsupported && (
        <p style={{ margin: '4px 0 0', fontSize: 11 * scale, fontStyle: 'italic', color: 'var(--muted)' }}>
          Power Coating not loadable — raw shown unboosted.
        </p>
      )}

      {pairs.length > 0 && (
        <>
          <p style={{ margin: '8px 0 1px', fontSize: 12 * scale, fontWeight: 600, color: 'var(--accent)' }}>Shot patterns — per-arrow power</p>
          {pairs.map(([type, level]) => {
            const r = rows.find(rr => rr.shotType === type && rr.shotLevel === level)!
            const powers = arrowPowers(type, level)
            return (
              <p key={`${type}${level}`} style={{ margin: 0, fontSize: 12 * scale, display: 'flex', gap: 8 }}>
                <span style={{ color: SHOT_COLOR[type], fontWeight: 600, minWidth: 70 }}>{type} {level}</span>
                <span style={{ color: 'var(--text)' }}>{powers.join('-')}</span>
                <span style={{ color: 'var(--muted)' }}>{r.arrowCount} hit{r.arrowCount === 1 ? '' : 's'}</span>
              </p>
            )
          })}
        </>
      )}
    </div>
  )
}

function SimColumn({ weapon, sim, scaleMax }: { weapon: Weapon | null; sim: SimResult | null; scaleMax: number }) {
  const scale = useTextScale()
  if (!weapon || !sim) return <div />
  const critPct = sim.totalHits > 0 ? 100 * sim.totalCrits / sim.totalHits : 0
  const feeblePct = sim.totalHits > 0 ? 100 * sim.totalFeebles / sim.totalHits : 0
  const rollText = critPct > 0 ? `Crit ${critPct.toFixed(0)}% of arrows` : feeblePct > 0 ? `Feeble ${feeblePct.toFixed(0)}% of arrows` : 'no crit/Feeble'

  return (
    <div>
      <p style={{ margin: 0, fontSize: 12 * scale, fontWeight: 600, color: 'var(--text)' }}>
        {weapon.doc.name} — {sim.shot.shotType} {sim.shot.shotLevel}
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 50, margin: '2px 0' }}>
        {sim.shots.map((s, i) => {
          const ratio = sim.normalRaw > 0 ? s.raw / sim.normalRaw : 1
          const color = ratio > 1.005 ? 'var(--positive)' : ratio < 0.995 ? 'var(--negative)' : 'var(--text)'
          return <div key={i} style={{ width: 9, height: Math.max(3, s.raw / scaleMax * 46), background: color, borderRadius: 1 }} />
        })}
      </div>
      <p style={{ margin: 0, fontSize: 12 * scale, color: 'var(--text)' }}>
        Avg {fmt(sim.avgRaw)} · Low {fmt(sim.minRaw)} · High {fmt(sim.maxRaw)}
      </p>
      <p style={{ margin: 0, fontSize: 11 * scale, color: 'var(--muted)' }}>
        {rollText}
        {sim.element > 0 && <span style={{ color: 'var(--accent)' }}>   +{fmt(sim.element)} element (no crit)</span>}
      </p>
    </div>
  )
}

const inputStyle = (scale: number): React.CSSProperties => ({
  background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '4px 8px', fontSize: 13 * scale,
})
const btnStyle = (scale: number): React.CSSProperties => ({
  background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
  color: 'var(--text)', padding: '6px 14px', fontSize: 13 * scale, cursor: 'pointer',
})
