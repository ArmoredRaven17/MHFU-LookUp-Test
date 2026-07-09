import { useTextScale } from '../theme/textScale'
import { useSectionCollapsed, toggleSectionCollapsed } from '../theme/sectionCollapse'

// Wraps a page's list-panel outer div, taking over just its width/collapse behavior — the page's
// own content (search box, selects, buttons, the list itself) passes through as children
// completely unchanged. `style` carries whatever page-specific background/border/texture the
// panel normally has (these vary slightly per page), applied only while expanded.
export default function CollapsiblePanel({ width, style, children }: {
  width: number
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const scale = useTextScale()
  const collapsed = useSectionCollapsed()
  const scaledWidth = width * scale + (scale > 1 ? 12 : 0)

  if (collapsed) {
    return (
      <button onClick={toggleSectionCollapsed} title="Show list" style={{
        width: 20, minWidth: 20, border: 'none', borderRight: '1px solid var(--border)',
        background: 'var(--surface)', cursor: 'pointer', color: 'var(--muted)', padding: 0,
      }}>▸</button>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'row', overflow: 'hidden' }}>
      <div style={{
        width: scaledWidth, minWidth: scaledWidth, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', ...style,
      }}>
        {children}
      </div>
      <button onClick={toggleSectionCollapsed} title="Hide list" style={{
        width: 14, minWidth: 14, border: 'none', borderLeft: '1px solid var(--border)',
        background: 'var(--surface)', cursor: 'pointer', color: 'var(--muted)', padding: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>◂</button>
    </div>
  )
}
