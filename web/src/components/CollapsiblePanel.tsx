import { useRef } from 'react'
import { useTextScale } from '../theme/textScale'
import { useSectionCollapsed, toggleSectionCollapsed } from '../theme/sectionCollapse'
import { useSectionWidth, setSectionWidth } from '../theme/sectionWidth'

const MIN_WIDTH = 160
const MAX_WIDTH = 700
const DRAG_THRESHOLD = 4   // px of pointer movement below which a mouseup counts as a click (collapse), not a resize

// Wraps a page's list-panel outer div, taking over just its width/collapse/resize behavior — the
// page's own content (search box, selects, buttons, the list itself) passes through as children
// completely unchanged. `style` carries whatever page-specific background/border/texture the
// panel normally has (these vary slightly per page), applied only while expanded.
export default function CollapsiblePanel({ width, style, children }: {
  width: number
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  const scale = useTextScale()
  const collapsed = useSectionCollapsed()
  const override = useSectionWidth(width)
  const naturalWidth = width * scale + (scale > 1 ? 12 : 0)
  const scaledWidth = override ?? naturalWidth

  const drag = useRef<{ startX: number; startWidth: number; moved: boolean } | null>(null)

  const onHandleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    drag.current = { startX: e.clientX, startWidth: scaledWidth, moved: false }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ew-resize'

    const onMove = (ev: MouseEvent) => {
      if (!drag.current) return
      const dx = ev.clientX - drag.current.startX
      if (Math.abs(dx) > DRAG_THRESHOLD) drag.current.moved = true
      setSectionWidth(width, Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.current.startWidth + dx)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      if (drag.current && !drag.current.moved) toggleSectionCollapsed()
      drag.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

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
      <div onMouseDown={onHandleMouseDown} title="Drag to resize — click to hide list" style={{
        width: 14, minWidth: 14, borderLeft: '1px solid var(--border)',
        background: 'var(--surface)', cursor: 'ew-resize', color: 'var(--muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, userSelect: 'none',
      }}>◂</div>
    </div>
  )
}
