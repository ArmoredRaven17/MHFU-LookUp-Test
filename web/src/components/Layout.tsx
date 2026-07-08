import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BASE } from '../utils/assets'
import { useTabIcons } from '../theme/tabIcons'
import { useAppIcon } from '../theme/appearance'
import { useTextScale } from '../theme/textScale'

export interface NavItem {
  path: string
  label: string
  icon: string  // default monster id used as icon
}

// Content tabs (order + default icons). Exported so Settings → Tab Icons reuses the list.
export const NAV: NavItem[] = [
  { path: 'bookmarks',  label: 'Bookmarks',       icon: 'anteka' },
  { path: 'notes',      label: 'Notes',            icon: 'remobra' },
  { path: 'monsters',   label: 'Monsters',         icon: 'tigrex' },
  { path: 'weapons',    label: 'Weapons',          icon: 'rathalos' },
  { path: 'armorsets',  label: 'Armor Sets',       icon: 'rathian' },
  { path: 'armorskills',label: 'Armor Skills',     icon: 'daimyo_hermitaur' },
  { path: 'decorations',label: 'Decorations',      icon: 'great_thunderbug' },
  { path: 'quests',     label: 'Quests',           icon: 'yian_kut_ku' },
  { path: 'training',   label: 'Training School',  icon: 'diablos' },
  { path: 'gathering',  label: 'Gathering',        icon: 'kelbi' },
  { path: 'items',      label: 'Items',            icon: 'melynx' },
  { path: 'combolist',  label: 'Combo List',       icon: 'congalala' },
  { path: 'treasures',  label: 'Treasures',        icon: 'bulldrome' },
  { path: 'kitchen',    label: 'Kitchen',          icon: 'mosswine' },
  { path: 'trenya',     label: 'Trenya',           icon: 'plesioth' },
  { path: 'pokke',      label: 'Pokke Farm',       icon: 'basarios' },
  { path: 'granny',     label: 'Peddling Granny',  icon: 'gypceros' },
  { path: 'veggie',     label: 'Veggie Elder',     icon: 'shakalaka' },
  { path: 'comrades',   label: 'Felyne Comrades',  icon: 'felyne' },
  { path: 'awards',     label: 'Awards',           icon: 'kirin' },
  { path: 'settings',   label: 'Settings',         icon: 'hypnocatrice' },
  { path: 'help',       label: 'Help',             icon: 'khezu' },
  { path: 'about',      label: 'About',            icon: 'fatalis' },
]

// Icon-only nav tab — the full label is a native title-attribute tooltip on hover, since 23 tabs
// don't fit in one horizontal row with visible text.
function NavIcon({ item, iconId, active }: { item: NavItem; iconId: string; active: boolean }) {
  return (
    <NavLink
      to={`/${item.path}`}
      title={item.label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 44, height: '100%', flexShrink: 0,
        textDecoration: 'none',
        background: active ? 'var(--header-bg)' : 'transparent',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        boxSizing: 'border-box', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <img src={`${BASE}/assets/Monsters/${iconId}.png`} alt={item.label} width={24} height={24}
           style={{ objectFit: 'contain', flexShrink: 0 }}
           onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
    </NavLink>
  )
}

export default function Layout() {
  const loc = useLocation()
  const overrides = useTabIcons()
  const appIcon = useAppIcon()
  const scale = useTextScale()
  const isActive = (path: string) => loc.pathname === `/${path}` || loc.pathname.startsWith(`/${path}/`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* ── Top nav bar ── */}
      <nav style={{
        height: 48, minHeight: 48,
        backgroundColor: 'var(--surface)',
        // Repeating texture under a translucent surface-coloured overlay (theme-aware, readable).
        backgroundImage: `linear-gradient(rgba(var(--surface-rgb), 0.93), rgba(var(--surface-rgb), 0.93)), url(${BASE}/assets/Textures/surface_bg.png)`,
        backgroundRepeat: 'no-repeat, repeat',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        {/* App title */}
        <div style={{ padding: '0 12px', height: '100%', borderRight: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <img src={`${BASE}/assets/Monsters/${appIcon}.png`} alt="" width={26} height={26} style={{ objectFit: 'contain' }}
               onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 * scale, whiteSpace: 'nowrap' }}>MHFU LookUp</span>
        </div>

        {/* Nav icons */}
        <div style={{ display: 'flex', alignItems: 'stretch', height: '100%', flex: 1, overflowX: 'auto' }}>
          {NAV.map(item => (
            <NavIcon key={item.path} item={item} iconId={overrides[item.path] ?? item.icon} active={isActive(item.path)} />
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--panel)',
        // Repeating texture with a translucent panel-coloured overlay (theme-aware) + a darkening layer.
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.30), rgba(0, 0, 0, 0.30)), linear-gradient(rgba(var(--panel-rgb), 0.88), rgba(var(--panel-rgb), 0.88)), url(${BASE}/assets/Textures/nav_bg.png)`,
        backgroundRepeat: 'no-repeat, no-repeat, repeat',   // overlays fill; texture tiles at native 128px, not stretched
      }}>
        <Outlet />
      </main>
    </div>
  )
}
