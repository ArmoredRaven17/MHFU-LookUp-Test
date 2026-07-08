import { useEffect, useRef, useState } from 'react'
import { useTextScale } from '../theme/textScale'

export interface DropdownOption {
  value: string
  label: string
  swatch?: string   // solid colour chip
  icon?: string     // image src
  group?: string    // optional section header — a header row is inserted whenever this changes
}

// Custom <select> replacement that renders each option's colour swatch or icon inline,
// both in the closed button and in the open list — native <option> can't show either.
export default function Dropdown({ value, options, onChange, style }: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  style?: React.CSSProperties
}) {
  const scale = useTextScale()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: style?.width != null ? '100%' : undefined,
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
        color: 'var(--text)', padding: '4px 8px', fontSize: 13 * scale, cursor: 'pointer', textAlign: 'left',
        whiteSpace: 'nowrap',
      }}>
        <Swatch option={current} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: style?.width != null ? 1 : undefined }}>{current?.label ?? value}</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 * scale, flexShrink: 0 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 2, zIndex: 30,
          minWidth: '100%', width: 'max-content', maxWidth: 280,
          maxHeight: 280, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {options.map((o, i) => (
            <div key={o.value}>
              {o.group && o.group !== options[i - 1]?.group && (
                <div style={{
                  padding: i === 0 ? '5px 8px 3px' : '7px 8px 3px', marginTop: i === 0 ? 0 : 2,
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  fontSize: 10 * scale, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>{o.group}</div>
              )}
              <div onClick={() => { onChange(o.value); setOpen(false) }}
                   className={o.value === value ? 'menu-row selected' : 'menu-row'} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 13 * scale,
                whiteSpace: 'nowrap',
                color: o.value === value ? 'var(--accent)' : 'var(--text)',
              }}>
                <Swatch option={o} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{o.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Swatch({ option }: { option?: DropdownOption }) {
  const scale = useTextScale()
  if (option?.icon) {
    return <img src={option.icon} alt="" width={20 * scale} height={20 * scale} style={{ objectFit: 'contain', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
  }
  if (option?.swatch) {
    return <span style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, background: option.swatch, border: '1px solid rgba(255,255,255,0.15)' }} />
  }
  return null
}
