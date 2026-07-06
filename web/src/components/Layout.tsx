import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BASE } from '../utils/assets'
import { useTabIcons } from '../theme/tabIcons'
import { useAppIcon } from '../theme/appearance'

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

function NavRow({ item, iconId, active }: { item: NavItem; iconId: string; active: boolean }) {
  return (
    <NavLink
      to={`/${item.path}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px',
        textDecoration: 'none',
        color: active ? 'var(--accent)' : 'var(--text)',
        background: active ? 'var(--header-bg)' : 'transparent',
        borderLeft: active ? '2px solid var(--accent)' : '2px solid transparent',
        fontSize: 13, whiteSpace: 'nowrap', transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
    >
      <img src={`${BASE}/assets/Monsters/${iconId}.png`} alt="" width={20} height={20}
           style={{ objectFit: 'contain', flexShrink: 0 }}
           onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
      {item.label}
    </NavLink>
  )
}

export default function Layout() {
  const loc = useLocation()
  const overrides = useTabIcons()
  const appIcon = useAppIcon()
  const isActive = (path: string) => loc.pathname === `/${path}` || loc.pathname.startsWith(`/${path}/`)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <nav style={{
        width: 185, minWidth: 185,
        backgroundColor: 'var(--panel)',
        // Repeating texture with a translucent panel-coloured overlay (theme-aware) + a darkening layer.
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0.35)), linear-gradient(rgba(var(--panel-rgb), 0.91), rgba(var(--panel-rgb), 0.91)), url(${BASE}/assets/Textures/nav_bg.png)`,
        backgroundRepeat: 'no-repeat, no-repeat, repeat',   // overlays fill; texture tiles at native 128px, not stretched
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Title bar */}
        <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <img src={`${BASE}/assets/Monsters/${appIcon}.png`} alt="" width={28} height={28} style={{ objectFit: 'contain' }}
               onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden' }} />
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 15 }}>MHFU LookUp</span>
        </div>

        {/* Nav items */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {NAV.map(item => (
            <NavRow key={item.path} item={item} iconId={overrides[item.path] ?? item.icon} active={isActive(item.path)} />
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <main style={{
        flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        backgroundColor: 'var(--bg)',
        // Repeating stone texture under a translucent bg-coloured overlay (theme-aware, readable).
        backgroundImage: `linear-gradient(rgba(var(--bg-rgb), 0.92), rgba(var(--bg-rgb), 0.92)), url(${BASE}/assets/Textures/content_bg.png)`,
        backgroundRepeat: 'no-repeat, repeat',
      }}>
        <Outlet />
      </main>
    </div>
  )
}
