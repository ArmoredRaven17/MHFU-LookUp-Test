import { useEffect, useRef, useState } from 'react'

export interface DropdownOption {
  value: string
  label: string
  swatch?: string   // solid colour chip
  icon?: string     // image src
}

// Custom <select> replacement that renders each option's colour swatch or icon inline,
// both in the closed button and in the open list — native <option> can't show either.
export default function Dropdown({ value, options, onChange, style, minWidth = 200 }: {
  value: string
  options: DropdownOption[]
  onChange: (value: string) => void
  style?: React.CSSProperties
  minWidth?: number
}) {
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
    <div ref={ref} style={{ position: 'relative', minWidth, ...style }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%',
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4,
        color: 'var(--text)', padding: '4px 8px', fontSize: 13, cursor: 'pointer', textAlign: 'left',
      }}>
        <Swatch option={current} />
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {current?.label ?? value}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: 11, flexShrink: 0 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 2, zIndex: 30,
          maxHeight: 280, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', cursor: 'pointer', fontSize: 13,
              background: o.value === value ? 'var(--header-bg)' : 'transparent',
              color: o.value === value ? 'var(--accent)' : 'var(--text)',
            }}
                 onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = 'var(--row-alt)' }}
                 onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = 'transparent' }}>
              <Swatch option={o} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Swatch({ option }: { option?: DropdownOption }) {
  if (option?.icon) {
    return <img src={option.icon} alt="" width={20} height={20} style={{ objectFit: 'contain', flexShrink: 0 }}
                onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
  }
  if (option?.swatch) {
    return <span style={{ width: 16, height: 16, borderRadius: 3, flexShrink: 0, background: option.swatch, border: '1px solid rgba(255,255,255,0.15)' }} />
  }
  return null
}
