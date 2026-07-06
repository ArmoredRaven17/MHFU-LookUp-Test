import { useNavigate } from 'react-router-dom'
import { useMaterialResolver } from '../hooks/useMaterials'

/**
 * Renders a crafting-material CSV as icon + name chips, deep-linking each known material to its
 * Items/Treasures page. Used by weapon (and armor) recipes.
 */
export default function MaterialList({ csv, vertical }: { csv: string; vertical?: boolean }) {
  const resolve = useMaterialResolver()
  const navigate = useNavigate()
  const mats = resolve(csv)

  return (
    <span style={vertical
      ? { display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }
      : { display: 'inline-flex', flexWrap: 'wrap', gap: '2px 12px', verticalAlign: 'top' }}>
      {mats.map((m, i) => (
        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {m.icon && (
            <img src={m.icon} alt="" width={18} height={18}
                 style={{ objectFit: 'contain', imageRendering: 'pixelated' }}
                 onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          )}
          {m.path
            ? <button onClick={() => navigate(m.path!)} style={{
                background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                color: 'var(--accent)', fontSize: 13,
              }}>{m.text}</button>
            : <span style={{ fontSize: 13, color: 'var(--text)' }}>{m.text}</span>}
        </span>
      ))}
    </span>
  )
}
