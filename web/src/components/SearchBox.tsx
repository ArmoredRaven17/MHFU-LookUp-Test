import { useTextScale } from '../theme/textScale'

interface Props {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}

export default function SearchBox({ value, onChange, placeholder = 'Search…' }: Props) {
  const scale = useTextScale()
  return (
    <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 4,
          color: 'var(--text)',
          padding: '4px 8px',
          fontSize: 13 * scale,
          outline: 'none',
        }}
      />
    </div>
  )
}
