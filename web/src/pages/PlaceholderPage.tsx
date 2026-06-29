interface Props { label: string }

export default function PlaceholderPage({ label }: Props) {
  return (
    <div style={{ padding: 24 }}>
      <p className="text-muted" style={{ fontSize: 15 }}>
        {label} — coming soon.
      </p>
    </div>
  )
}
