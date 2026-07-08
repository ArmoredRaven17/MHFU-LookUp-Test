import { useTextScale } from '../theme/textScale'

interface Props { label: string }

export default function PlaceholderPage({ label }: Props) {
  const scale = useTextScale()
  return (
    <div style={{ padding: 24 }}>
      <p className="text-muted" style={{ fontSize: 15 * scale }}>
        {label} — coming soon.
      </p>
    </div>
  )
}
